import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/utils/uuid.dart';

/// Result of a successful OTP verification.
class AuthResult {
  const AuthResult({
    required this.token,
    required this.refreshToken,
    required this.userName,
    required this.role,
  });

  final String token;
  final String refreshToken;
  final String userName;
  final String role;
}

class AuthRepository {
  AuthRepository(this._dio, this._storage);

  final Dio _dio;
  final SecureStorage _storage;

  /// POST /api/auth/otp/request — backend returns 204 No Content.
  Future<void> requestOtp(String identifier) async {
    await _dio.post(
      '/api/auth/otp/request',
      data: {'identifier': identifier},
    );
  }

  /// POST /api/auth/otp/verify — returns { token, refreshToken, user }.
  Future<AuthResult> verifyOtp(String identifier, String code) async {
    final res = await _dio.post(
      '/api/auth/otp/verify',
      data: {'identifier': identifier, 'code': code},
    );
    final body = res.data as Map<String, dynamic>;
    final user = body['user'] as Map<String, dynamic>;
    debugPrint('✅ LOGIN — user: $identifier | token saved');
    return AuthResult(
      token: body['token'] as String,
      refreshToken: body['refreshToken'] as String,
      userName: user['name'] as String,
      role: user['role'] as String,
    );
  }

  /// POST /api/devices/enroll (requires JWT). Prototype: sends a fake public
  /// key — real P-256 Keystore enrollment lands in a later milestone.
  /// A 409 means this user already has an active device, which we treat as
  /// success (the enrollment gate is satisfied).
  Future<void> enrollDevice() async {
    var installId = await _storage.readInstallId();
    if (installId == null) {
      installId = generateUuidV4();
      await _storage.writeInstallId(installId);
    }

    try {
      await _dio.post(
        '/api/devices/enroll',
        data: {
          'installId': installId,
          'publicKey': _fakePublicKey(),
          'platform': 'ANDROID',
        },
      );
      debugPrint('📱 DEVICE ENROLLED — installId: $installId');
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        debugPrint('📱 DEVICE ENROLLED (already) — installId: $installId');
        return; // already enrolled — gate satisfied
      }
      rethrow;
    }
  }

  static String _fakePublicKey() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(32, (_) => rnd.nextInt(256));
    return 'DEV_BYPASS_${base64Encode(bytes)}';
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(dioProvider),
    ref.watch(secureStorageProvider),
  );
});
