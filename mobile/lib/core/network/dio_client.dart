import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';

/// Base URL. Defaults to the Android-emulator alias for host localhost;
/// override in prod builds with --dart-define=API_BASE_URL=...
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8080',
);

/// Endpoints that must never carry an Authorization header.
const _anonymousPaths = <String>{
  '/api/auth/otp/request',
  '/api/auth/otp/verify',
};

Dio buildDio(SecureStorage storage) {
  final dio = Dio(
    BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      contentType: Headers.jsonContentType,
    ),
  );

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
    ),
  );

  // TODO(M4): add refresh-token + device-signature interceptors here.
  return dio;
}

final dioProvider = Provider<Dio>((ref) {
  return buildDio(ref.watch(secureStorageProvider));
});
