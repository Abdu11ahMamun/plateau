import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/generated/app_localizations.dart';
import '../theme/colors.dart';

/// Shared bottom navigation for the three top-level tabs.
class PlateauBottomNav extends StatelessWidget {
  const PlateauBottomNav({super.key, required this.currentIndex});

  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BottomNavigationBar(
      currentIndex: currentIndex,
      type: BottomNavigationBarType.fixed,
      backgroundColor: AppColors.cream,
      selectedItemColor: AppColors.sage,
      unselectedItemColor: AppColors.textSecondary,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      onTap: (index) {
        if (index == currentIndex) return;
        switch (index) {
          case 0:
            context.go('/home');
          case 1:
            context.go('/my-hours');
          case 2:
            context.go('/profile');
        }
      },
      items: [
        BottomNavigationBarItem(
          icon: const Icon(Icons.home),
          label: l10n.navHome,
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.access_time),
          label: l10n.navHours,
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.person),
          label: l10n.navProfile,
        ),
      ],
    );
  }
}
