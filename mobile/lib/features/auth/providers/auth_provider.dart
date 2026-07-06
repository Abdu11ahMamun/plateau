import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/secure_storage.dart';
import '../data/auth_repository.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.pendingEmail,
    this.userName,
    this.busy = false,
    this.error,
  });

  final AuthStatus status;
  final String? pendingEmail;
  final String? userName;
  final bool busy;
  final String? error;

  AuthState copyWith({
    AuthStatus? status,
    String? pendingEmail,
    String? userName,
    bool? busy,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      pendingEmail: pendingEmail ?? this.pendingEmail,
      userName: userName ?? this.userName,
      busy: busy ?? this.busy,
      error: error,
    );
  }
}

class AuthController extends Notifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);
  SecureStorage get _storage => ref.read(secureStorageProvider);

  @override
  AuthState build() {
    Future.microtask(_bootstrap);
    return const AuthState(status: AuthStatus.unknown);
  }

  Future<void> _bootstrap() async {
    final token = await _storage.readToken();
    if (token != null && token.isNotEmpty) {
      final name = await _storage.readUserName();
      state = state.copyWith(status: AuthStatus.authenticated, userName: name);
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  /// Requests an OTP for [email]. Returns true on success.
  Future<bool> requestOtp(String email) async {
    state = state.copyWith(busy: true, error: null);
    try {
      await _repo.requestOtp(email);
      state = state.copyWith(busy: false, pendingEmail: email);
      return true;
    } on DioException catch (e) {
      state = state.copyWith(busy: false, error: _messageFor(e));
      return false;
    }
  }

  /// Verifies [code] for the pending email, then enrolls the device and
  /// transitions to authenticated. Returns true on success.
  Future<bool> verifyOtp(String code) async {
    final email = state.pendingEmail;
    if (email == null) {
      state = state.copyWith(error: 'Session expirée, recommencez.');
      return false;
    }
    state = state.copyWith(busy: true, error: null);
    try {
      final result = await _repo.verifyOtp(email, code);
      await _storage.writeToken(result.token);
      await _storage.writeRefreshToken(result.refreshToken);
      await _storage.writeUserName(result.userName);

      // Enrollment is the gate for punching — must succeed before Home.
      await _repo.enrollDevice();

      state = state.copyWith(
        busy: false,
        status: AuthStatus.authenticated,
        userName: result.userName,
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(busy: false, error: _messageFor(e));
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearSession();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  String _messageFor(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout) {
      return 'Connexion impossible. Vérifiez votre réseau.';
    }
    final data = e.response?.data;
    if (data is Map && data['detail'] is String) {
      return data['detail'] as String;
    }
    return 'Une erreur est survenue. Réessayez.';
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
