import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/domain/auth_provider.dart';
import '../../features/auth/domain/models/auth_state.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/dashboard/presentation/peserta_dashboard.dart';
import '../../features/events/presentation/events_screen.dart';
import '../../features/history/presentation/history_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/registrations/presentation/registrations_screen.dart';
import '../../features/shell/app_shell.dart';

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: _AuthStateNotifier(ref),
    redirect: (context, state) {
      final authAsync = ref.read(authProvider);
      final location = state.uri.path;

      final isOnAuthForm = location == '/login' ||
          location == '/register' ||
          location == '/forgot-password';

      if (authAsync.isLoading || authAsync is AsyncLoading) {
        // While on an auth form, show loading in-place (button spinner).
        // Only redirect to splash when not yet on any auth/splash page.
        if (location == '/splash' || isOnAuthForm) return null;
        return '/splash';
      }

      final authState = authAsync.value ?? const AuthState.unauthenticated();

      if (authState.isUnauthenticated) {
        return isOnAuthForm ? null : '/login';
      }

      if (authState.isPendingRole) {
        return '/role-selection';
      }

      if (authState.isAuthenticated) {
        if (location == '/splash' || isOnAuthForm) return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (ctx, s) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (ctx, s) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (ctx, s) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (ctx, s) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/role-selection',
        builder: (ctx, s) => const _PlaceholderScreen(title: 'Pilih Role'),
      ),
      // Shell dengan bottom nav — semua tab ada di sini
      StatefulShellRoute.indexedStack(
        builder: (ctx, s, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (ctx, s) => const PesertaDashboard(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/events',
                builder: (ctx, s) => const EventsScreen(),
                routes: [
                  GoRoute(
                    path: ':slug',
                    builder: (ctx, s) => _PlaceholderScreen(
                      title: s.pathParameters['slug'] ?? 'Detail Event',
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/registrations',
                builder: (ctx, s) => const RegistrationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                builder: (ctx, s) => const HistoryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (ctx, s) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class _PlaceholderScreen extends StatelessWidget {
  const _PlaceholderScreen({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text('Segera hadir',
            style: Theme.of(context).textTheme.bodyLarge),
      ),
    );
  }
}

class _AuthStateNotifier extends ChangeNotifier {
  _AuthStateNotifier(Ref ref) {
    ref.listen(authProvider, (prev, next) => notifyListeners());
  }
}
