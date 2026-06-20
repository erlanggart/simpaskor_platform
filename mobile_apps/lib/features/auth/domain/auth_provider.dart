import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_local_storage.dart';
import '../data/auth_repository.dart';
import '../domain/models/auth_state.dart';
import '../domain/models/user_model.dart';

final authLocalStorageProvider = Provider<AuthLocalStorage>(
  (_) => AuthLocalStorage(),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (_) => AuthRepository(),
);

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class AuthNotifier extends AsyncNotifier<AuthState> {
  late AuthLocalStorage _storage;
  late AuthRepository _repository;

  @override
  Future<AuthState> build() async {
    _storage = ref.read(authLocalStorageProvider);
    _repository = ref.read(authRepositoryProvider);
    return _restoreSession();
  }

  Future<AuthState> _restoreSession() async {
    final token = await _storage.getToken();
    final user = await _storage.getUser();
    if (token != null && user != null) {
      if (user.isPending) {
        return AuthState.pendingRole(user: user, token: token);
      }
      return AuthState.authenticated(user: user, token: token);
    }
    return const AuthState.unauthenticated();
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    debugPrint('🔐 [Auth] login attempt: $email');
    try {
      final result = await _repository.login(email: email, password: password);
      debugPrint('✅ [Auth] login success — role=${result.user.role} status=${result.user.status}');
      await _saveSession(result.user, result.token);
      state = AsyncData(
        result.user.isPending
            ? AuthState.pendingRole(user: result.user, token: result.token)
            : AuthState.authenticated(user: result.user, token: result.token),
      );
    } catch (e, st) {
      debugPrint('❌ [Auth] login error: $e');
      // Restore to unauthenticated so router stays on /login, then rethrow
      // so the login screen can display the specific error message.
      state = const AsyncData(AuthState.unauthenticated());
      Error.throwWithStackTrace(e, st);
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? institution,
  }) async {
    state = const AsyncLoading();
    try {
      final result = await _repository.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
        institution: institution,
      );
      await _saveSession(result.user, result.token);
      state = AsyncData(
        result.user.isPending
            ? AuthState.pendingRole(user: result.user, token: result.token)
            : AuthState.authenticated(user: result.user, token: result.token),
      );
    } catch (e, st) {
      state = const AsyncData(AuthState.unauthenticated());
      Error.throwWithStackTrace(e, st);
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    await _storage.clear();
    state = const AsyncData(AuthState.unauthenticated());
  }

  Future<void> _saveSession(UserModel user, String token) async {
    await _storage.saveToken(token);
    await _storage.saveUser(user);
  }
}
