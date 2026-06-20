import 'user_model.dart';

enum AuthStatus { initial, authenticated, unauthenticated, pendingRole }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.token,
  });

  final AuthStatus status;
  final UserModel? user;
  final String? token;

  const AuthState.initial()
      : status = AuthStatus.initial,
        user = null,
        token = null;

  const AuthState.authenticated({required this.user, required this.token})
      : status = AuthStatus.authenticated;

  const AuthState.unauthenticated()
      : status = AuthStatus.unauthenticated,
        user = null,
        token = null;

  const AuthState.pendingRole({required this.user, required this.token})
      : status = AuthStatus.pendingRole;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isUnauthenticated => status == AuthStatus.unauthenticated;
  bool get isPendingRole => status == AuthStatus.pendingRole;
}
