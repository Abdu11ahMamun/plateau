import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';

// Emulator: flutter run (uses default 10.0.2.2:8080)
// Real device: flutter build apk --release \
//   --dart-define=API_BASE_URL=http://192.168.68.102:8080 \
//   --dart-define=DEBUG_PUNCH=true
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8080',
);

/// Endpoints that must never carry an Authorization header.
const _anonymousPaths = <String>{
  '/api/auth/otp/request',
  '/api/auth/otp/verify',
  '/api/auth/refresh',
};

Dio buildDio(SecureStorage storage, {VoidCallback? onSessionExpired}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      contentType: Headers.jsonContentType,
    ),
  );

  // Bare client for the refresh call itself — no interceptors, no recursion.
  final refreshDio = Dio(
    BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      contentType: Headers.jsonContentType,
    ),
  );

  // In-flight refresh shared by concurrent 401s (refresh tokens are
  // single-use server-side, so only one redeem may run at a time).
  Future<String?>? refreshing;

  Future<String?> refreshSession() async {
    final refreshToken = await storage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return null;
    try {
      final res = await refreshDio.post(
        '/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final body = res.data as Map<String, dynamic>;
      final token = body['token'] as String;
      await storage.writeToken(token);
      await storage.writeRefreshToken(body['refreshToken'] as String);
      debugPrint('🔄 TOKEN REFRESHED — new token saved');
      return token;
    } on DioException {
      return null;
    }
  }

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (!_anonymousPaths.contains(options.path)) {
          final token = await storage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;
        final options = error.requestOptions;
        final alreadyRetried = options.extra['retried'] == true;
        if (status != 401 ||
            _anonymousPaths.contains(options.path) ||
            alreadyRetried) {
          return handler.next(error);
        }

        final pending = refreshing ??= refreshSession();
        final token = await pending;
        refreshing = null;

        if (token == null) {
          debugPrint('🚪 SESSION EXPIRED — redirecting to login');
          await storage.clearSession();
          onSessionExpired?.call();
          return handler.next(error);
        }

        // Replay the original request once with the fresh token.
        options.headers['Authorization'] = 'Bearer $token';
        options.extra['retried'] = true;
        try {
          final response = await dio.fetch<dynamic>(options);
          return handler.resolve(response);
        } on DioException catch (e) {
          return handler.next(e);
        }
      },
    ),
  );

  return dio;
}

/// Bumped by the dio layer when a 401 could not be recovered by refresh.
/// [AuthController] listens and flips the app to unauthenticated.
class SessionExpiredTick extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}

final sessionExpiredTickProvider =
    NotifierProvider<SessionExpiredTick, int>(SessionExpiredTick.new);

final dioProvider = Provider<Dio>((ref) {
  return buildDio(
    ref.watch(secureStorageProvider),
    onSessionExpired: () => ref.read(sessionExpiredTickProvider.notifier).bump(),
  );
});
