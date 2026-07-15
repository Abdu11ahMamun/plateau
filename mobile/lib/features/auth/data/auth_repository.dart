import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/utils/uuid.dart';

/// The caller's tenant and their own invite status, from GET /api/me/tenant.
class TenantInfo {
  const TenantInfo({
    required this.tenantName,
    required this.employeeName,
    required this.status,
  });

  final String tenantName;
  final String employeeName;
  final String status; // INVITED | ACTIVE

  bool get isInvited => status == 'INVITED';

  factory TenantInfo.fromJson(Map<String, dynamic> json) {
    return TenantInfo(
      tenantName: json['tenantName'] as String,
      employeeName: json['employeeName'] as String,
      status: json['status'] as String,
    );
  }
}

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

  /// GET /api/me/tenant (requires JWT) — the caller's tenant and their own
  /// invite status. Checked right after OTP verify to decide /join vs /home.
  Future<TenantInfo> getMyTenant() async {
    final res = await _dio.get('/api/me/tenant');
    return TenantInfo.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /api/invite/accept (requires JWT) — accepts a pending invite and
  /// enrolls the device in the same call (backend flips INVITED → ACTIVE
  /// and creates the device row together), so no separate [enrollDevice]
  /// call is needed after this succeeds.
  Future<void> acceptInvite() async {
    final payload = await _enrollmentPayload();
    await _dio.post('/api/invite/accept', data: payload);
  }

  /// POST /api/devices/enroll (requires JWT). Prototype: sends a fake public
  /// key — real P-256 Keystore enrollment lands in a later milestone.
  /// A 409 means this user already has an active device, which we treat as
  /// success (the enrollment gate is satisfied).
  Future<void> enrollDevice() async {
    final payload = await _enrollmentPayload();
    try {
      await _dio.post('/api/devices/enroll', data: payload);
      debugPrint('📱 DEVICE ENROLLED — installId: ${payload['installId']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        debugPrint(
          '📱 DEVICE ENROLLED (already) — installId: ${payload['installId']}',
        );
        return; // already enrolled — gate satisfied
      }
      rethrow;
    }
  }

  /// Shared by [enrollDevice] and [acceptInvite] — both hit an endpoint
  /// that expects the same {installId, publicKey, platform} shape.
  Future<Map<String, dynamic>> _enrollmentPayload() async {
    var installId = await _storage.readInstallId();
    if (installId == null) {
      installId = generateUuidV4();
      await _storage.writeInstallId(installId);
    }
    return {
      'installId': installId,
      'publicKey': _fakePublicKey(),
      'platform': 'ANDROID',
    };
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
