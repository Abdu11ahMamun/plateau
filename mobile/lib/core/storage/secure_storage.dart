import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin typed wrapper over [FlutterSecureStorage] for the handful of secrets
/// the app persists: JWT, refresh token, device install id, display name.
class SecureStorage {
  SecureStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _kToken = 'jwt_token';
  static const _kRefreshToken = 'refresh_token';
  static const _kInstallId = 'device_install_id';
  static const _kUserName = 'user_name';
  static const _kUserEmail = 'user_email';

  Future<String?> readToken() => _storage.read(key: _kToken);
  Future<void> writeToken(String value) =>
      _storage.write(key: _kToken, value: value);

  Future<String?> readRefreshToken() => _storage.read(key: _kRefreshToken);
  Future<void> writeRefreshToken(String value) =>
      _storage.write(key: _kRefreshToken, value: value);

  Future<String?> readInstallId() => _storage.read(key: _kInstallId);
  Future<void> writeInstallId(String value) =>
      _storage.write(key: _kInstallId, value: value);

  Future<String?> readUserName() => _storage.read(key: _kUserName);
  Future<void> writeUserName(String value) =>
      _storage.write(key: _kUserName, value: value);

  Future<String?> readUserEmail() => _storage.read(key: _kUserEmail);
  Future<void> writeUserEmail(String value) =>
      _storage.write(key: _kUserEmail, value: value);

  Future<void> clearSession() async {
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kUserName);
    await _storage.delete(key: _kUserEmail);
    // Note: installId is intentionally kept so the device stays enrolled.
  }
}

final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());
