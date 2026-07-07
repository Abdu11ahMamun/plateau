import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nfc_manager/nfc_manager.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../core/widgets/plateau_bottom_nav.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../auth/providers/auth_provider.dart';
import '../../punch/providers/punch_provider.dart';

/// Whether the on-screen punch trigger (bottom-right FAB) is shown. Debug
/// builds always get it; release builds only with --dart-define=DEBUG_PUNCH=true
/// (used for emulator verification, where neither NFC nor debug mode work).
const bool _debugPunchEnabled =
    kDebugMode || bool.fromEnvironment('DEBUG_PUNCH');

/// Screen 04 — home. Ready state ("tap your badge") or clocked-in state
/// (running session timer). A foreground NFC session listens for badge taps
/// and posts the punch; the result screen takes over on success.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _nfcActive = false;
  bool _punching = false;

  @override
  void initState() {
    super.initState();
    _startNfc();
  }

  @override
  void dispose() {
    if (_nfcActive) NfcManager.instance.stopSession();
    super.dispose();
  }

  Future<void> _startNfc() async {
    try {
      final availability = await NfcManager.instance.checkAvailability();
      if (availability != NfcAvailability.enabled) return;
      await NfcManager.instance.startSession(
        pollingOptions: const {NfcPollingOption.iso14443},
        onDiscovered: (tag) => _punch(),
      );
      _nfcActive = true;
    } catch (_) {
      // No NFC on this device (e.g. emulator) — the debug FAB covers testing,
      // and the manual punch flow lands in M3.
    }
  }

  Future<void> _punch() async {
    if (_punching) return;
    setState(() => _punching = true);
    try {
      final result =
          await ref.read(punchControllerProvider.notifier).punch('NFC');
      if (mounted) context.go('/punch-result', extra: result);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.nfcError)),
        );
      }
    } finally {
      if (mounted) setState(() => _punching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = ref.watch(authControllerProvider).userName ?? '';
    final firstName = name.isEmpty ? '' : name.split(' ').first;
    final now = TimeOfDay.now();
    final time = DateFormat('HH:mm').format(
      DateTime(2000, 1, 1, now.hour, now.minute),
    );
    final l10n = AppLocalizations.of(context)!;

    final lastPunch = ref.watch(punchControllerProvider).value;
    final clockedInAt = (lastPunch?.isIn ?? false) ? lastPunch!.eventTime : null;

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
                  clockedInAt != null
                      ? _ClockedInCard(
                          clockedInAt: clockedInAt,
                          title: l10n.homeClockedIn,
                          sinceLabel: l10n.homeClockedInSince(
                            DateFormat('HH:mm').format(clockedInAt),
                          ),
                        )
                      : _ReadyCard(
                          readyText: l10n.homeReady,
                          subtitleText: l10n.homeSubtitle,
                        ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () => context.push('/manual-punch'),
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
      floatingActionButton: _debugPunchEnabled
          ? FloatingActionButton.small(
              onPressed: _punching ? null : _punch,
              tooltip: 'Debug punch',
              backgroundColor: AppColors.slate,
              child: const Icon(Icons.nfc, color: Colors.white, size: 20),
            )
          : null,
      bottomNavigationBar: const PlateauBottomNav(currentIndex: 0),
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

/// Clocked-in state: sage left border, clock-in time, running HH:MM:SS timer.
class _ClockedInCard extends StatefulWidget {
  const _ClockedInCard({
    required this.clockedInAt,
    required this.title,
    required this.sinceLabel,
  });

  final DateTime clockedInAt;
  final String title;
  final String sinceLabel;

  @override
  State<_ClockedInCard> createState() => _ClockedInCardState();
}

class _ClockedInCardState extends State<_ClockedInCard> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  String _elapsed() {
    final d = DateTime.now().difference(widget.clockedInAt);
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(20),
        border: const Border(
          left: BorderSide(color: AppColors.sage, width: 4),
          top: BorderSide(color: AppColors.border),
          right: BorderSide(color: AppColors.border),
          bottom: BorderSide(color: AppColors.border),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.sage,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                widget.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            _elapsed(),
            style: AppTheme.mono(
              fontSize: 40,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.sinceLabel,
            style: AppTheme.mono(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

