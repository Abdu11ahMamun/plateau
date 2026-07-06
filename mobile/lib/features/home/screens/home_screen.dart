import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../auth/providers/auth_provider.dart';

/// Screen 04 — "Prêt à pointer" home. NFC + punch land in M2; for now this is
/// the ready-state placeholder with the manual-punch entry point.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(authControllerProvider).userName ?? '';
    final firstName = name.isEmpty ? '' : name.split(' ').first;
    final now = TimeOfDay.now();
    final time = DateFormat('HH:mm').format(
      DateTime(2000, 1, 1, now.hour, now.minute),
    );
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: Column(
        children: [
          _Header(
            greeting: '${l10n.homeGreeting(firstName)} 👋',
            time: time,
            onLogout: () => ref.read(authControllerProvider.notifier).logout(),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _ReadyCard(readyText: l10n.homeReady, subtitleText: l10n.homeSubtitle),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () {
                      // Manual punch flow arrives in M3.
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Bientôt disponible'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Text(
                      l10n.homeManual,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        homeLabel: l10n.navHome,
        hoursLabel: l10n.navHours,
        profileLabel: l10n.navProfile,
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.greeting,
    required this.time,
    required this.onLogout,
  });

  final String greeting;
  final String time;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.ink,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 4, 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  greeting,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                time,
                style: AppTheme.mono(fontSize: 15, color: Colors.white),
              ),
              IconButton(
                icon: const Icon(Icons.logout, size: 20, color: Colors.white70),
                onPressed: onLogout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The big "ready to clock in" card with the concentric sage clock target.
class _ReadyCard extends StatelessWidget {
  const _ReadyCard({required this.readyText, required this.subtitleText});

  final String readyText;
  final String subtitleText;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 168,
            height: 168,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border, width: 2),
            ),
            alignment: Alignment.center,
            child: Container(
              width: 104,
              height: 104,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.sage,
              ),
              child: const Icon(
                Icons.schedule,
                color: Colors.white,
                size: 48,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            readyText,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitleText,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ],
      ),
    );
  }
}

/// Static bottom navigation. Only "Accueil" is wired in M1.
class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.homeLabel,
    required this.hoursLabel,
    required this.profileLabel,
  });

  final String homeLabel;
  final String hoursLabel;
  final String profileLabel;

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: 0,
      type: BottomNavigationBarType.fixed,
      backgroundColor: AppColors.cream,
      selectedItemColor: AppColors.sage,
      unselectedItemColor: AppColors.textSecondary,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      items: [
        BottomNavigationBarItem(icon: const Icon(Icons.home), label: homeLabel),
        BottomNavigationBarItem(
          icon: const Icon(Icons.access_time),
          label: hoursLabel,
        ),
        BottomNavigationBarItem(icon: const Icon(Icons.person), label: profileLabel),
      ],
    );
  }
}
