import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/join_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/otp_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/hours/screens/my_hours_screen.dart';
import '../../features/leave/screens/leave_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/punch/data/punch_repository.dart';
import '../../features/punch/screens/manual_punch_screen.dart';
import '../../features/punch/screens/punch_result_screen.dart';
import '../../features/splash/screens/splash_screen.dart';

/// Bridges Riverpod auth changes to go_router so [GoRouter.refreshListenable]
/// re-evaluates redirects whenever auth status flips.
class _AuthRouterNotifier extends ChangeNotifier {
  _AuthRouterNotifier(Ref ref) {
    // Also watch needsJoin — accepting an invite doesn't change `status`
    // (it's already `authenticated` throughout the /join detour), so a
    // status-only selector would never refresh the router to leave /join.
    ref.listen(
      authControllerProvider.select((s) => (s.status, s.needsJoin)),
      (_, _) => notifyListeners(),
    );
  }
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRouterNotifier(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final status = auth.status;
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login' || loc == '/otp';

      switch (status) {
        case AuthStatus.unknown:
          return loc == '/splash' ? null : '/splash';
        case AuthStatus.unauthenticated:
          return loggingIn ? null : '/login';
        case AuthStatus.authenticated:
          // INVITED employees are held on /join (no /home, no bounce back
          // to /login) until they accept — see AuthState.needsJoin.
          if (auth.needsJoin) return loc == '/join' ? null : '/join';
          return (loc == '/splash' || loggingIn || loc == '/join')
              ? '/home'
              : null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/otp', builder: (_, _) => const OtpScreen()),
      GoRoute(path: '/join', builder: (_, _) => const JoinScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(
        path: '/manual-punch',
        builder: (_, _) => const ManualPunchScreen(),
      ),
      GoRoute(path: '/my-hours', builder: (_, _) => const MyHoursScreen()),
      GoRoute(path: '/leave', builder: (_, _) => const LeaveScreen()),
      GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(
        path: '/punch-result',
        // Only reachable with a PunchResult in hand (set by the punch flow);
        // a bare navigation falls back to home.
        redirect: (_, state) => state.extra is PunchResult ? null : '/home',
        builder: (_, state) =>
            PunchResultScreen(result: state.extra! as PunchResult),
      ),
    ],
  );
});
