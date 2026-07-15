import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../data/auth_repository.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.pendingEmail,
    this.userName,
    this.userEmail,
    this.busy = false,
    this.error,
    this.needsJoin = false,
    this.joinTenantName,
    this.joinEmployeeName,
  });

  final AuthStatus status;
  final String? pendingEmail;
  final String? userName;
  final String? userEmail;
  final bool busy;
  final String? error;

  /// True once OTP verify finds the employee still INVITED — the router
  /// holds them on /join until [AuthController.acceptInvite] succeeds.
  final bool needsJoin;
  final String? joinTenantName;
  final String? joinEmployeeName;

  AuthState copyWith({
    AuthStatus? status,
    String? pendingEmail,
    String? userName,
    String? userEmail,
    bool? busy,
    String? error,
    bool? needsJoin,
    String? joinTenantName,
    String? joinEmployeeName,
  }) {
    return AuthState(
      status: status ?? this.status,
      pendingEmail: pendingEmail ?? this.pendingEmail,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      busy: busy ?? this.busy,
      error: error,
      needsJoin: needsJoin ?? this.needsJoin,
      joinTenantName: joinTenantName ?? this.joinTenantName,
      joinEmployeeName: joinEmployeeName ?? this.joinEmployeeName,
    );
  }
}

class AuthController extends Notifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);
  SecureStorage get _storage => ref.read(secureStorageProvider);

  @override
  AuthState build() {
    // The dio layer bumps this when a 401 survives the refresh attempt —
    // storage is already cleared there; we just flip the app to logged-out.
    ref.listen(sessionExpiredTickProvider, (previous, next) {
      if (state.status == AuthStatus.authenticated) {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    });
    Future.microtask(_bootstrap);
    return const AuthState(status: AuthStatus.unknown);
  }

  Future<void> _bootstrap() async {
    final token = await _storage.readToken();
    if (token != null && token.isNotEmpty) {
      final name = await _storage.readUserName();
      final email = await _storage.readUserEmail();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        userName: name,
        userEmail: email,
      );
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

  /// Verifies [code] for the pending email, then checks the employee's
  /// tenant status: INVITED holds them on /join (device enrollment deferred
  /// to [acceptInvite]); ACTIVE enrolls the device and goes straight to
  /// /home as before. Returns true on success either way.
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
      await _storage.writeUserEmail(email);

      final tenant = await _repo.getMyTenant();
      if (tenant.isInvited) {
        state = AuthState(
          status: AuthStatus.authenticated,
          userName: result.userName,
          userEmail: email,
          needsJoin: true,
          joinTenantName: tenant.tenantName,
          joinEmployeeName: tenant.employeeName,
        );
        return true;
      }

      // Enrollment is the gate for punching — must succeed before Home.
      await _repo.enrollDevice();

      state = state.copyWith(
        busy: false,
        status: AuthStatus.authenticated,
        userName: result.userName,
        userEmail: email,
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(busy: false, error: _messageFor(e));
      return false;
    }
  }

  /// Accepts the pending invite from /join — enrolls the device and clears
  /// [AuthState.needsJoin], letting the router carry the user to /home.
  Future<bool> acceptInvite() async {
    state = state.copyWith(busy: true, error: null);
    try {
      await _repo.acceptInvite();
      state = AuthState(
        status: AuthStatus.authenticated,
        userName: state.userName,
        userEmail: state.userEmail,
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
