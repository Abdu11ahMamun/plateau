import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/otp_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/splash/screens/splash_screen.dart';

/// Bridges Riverpod auth changes to go_router so [GoRouter.refreshListenable]
/// re-evaluates redirects whenever auth status flips.
class _AuthRouterNotifier extends ChangeNotifier {
  _AuthRouterNotifier(Ref ref) {
    ref.listen(authControllerProvider.select((s) => s.status), (_, _) {
      notifyListeners();
    });
  }
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRouterNotifier(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login' || loc == '/otp';

      switch (status) {
        case AuthStatus.unknown:
          return loc == '/splash' ? null : '/splash';
        case AuthStatus.unauthenticated:
          return loggingIn ? null : '/login';
        case AuthStatus.authenticated:
          return (loc == '/splash' || loggingIn) ? '/home' : null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/otp', builder: (_, _) => const OtpScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
    ],
  );
});
