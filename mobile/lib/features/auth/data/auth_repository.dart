import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';

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
      installId = _generateUuidV4();
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
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        return; // already enrolled — gate satisfied
      }
      rethrow;
    }
  }

  static String _generateUuidV4() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).toList();
    return '${hex.sublist(0, 4).join()}-${hex.sublist(4, 6).join()}-'
        '${hex.sublist(6, 8).join()}-${hex.sublist(8, 10).join()}-'
        '${hex.sublist(10, 16).join()}';
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
