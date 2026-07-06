import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/punch_repository.dart';

const _displaySeconds = 3;

/// Screen 05 — full-screen punch confirmation. Sage for IN, rouge for OUT.
/// Fires a haptic on arrival, drains a progress bar over 3 seconds, then
/// returns to home automatically.
class PunchResultScreen extends ConsumerStatefulWidget {
  const PunchResultScreen({super.key, required this.result});

  final PunchResult result;

  @override
  ConsumerState<PunchResultScreen> createState() => _PunchResultScreenState();
}

class _PunchResultScreenState extends ConsumerState<PunchResultScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drain;

  @override
  void initState() {
    super.initState();
    HapticFeedback.mediumImpact();
    _drain = AnimationController(
      vsync: this,
      duration: const Duration(seconds: _displaySeconds),
      value: 1,
    );
    _drain.addStatusListener((status) {
      if (status == AnimationStatus.dismissed && mounted) {
        context.go('/home');
      }
    });
    _drain.reverse();
  }

  @override
  void dispose() {
    _drain.dispose();
    super.dispose();
  }

  String _sessionLabel(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h ${m.toString().padLeft(2, '0')}min';
  }

  @override
  Widget build(BuildContext context) {
    final result = widget.result;
    final l10n = AppLocalizations.of(context)!;
    final name = ref.watch(authControllerProvider).userName ?? '';
    final firstName = name.isEmpty ? '' : name.split(' ').first;

    final background = result.isIn ? AppColors.sage : AppColors.rouge;
    final greeting = result.isIn
        ? l10n.punchInGreeting(firstName)
        : l10n.punchOutGreeting(firstName);
    final subtitle =
        result.isIn ? l10n.punchInRecorded : l10n.punchOutRecorded;
    final time = DateFormat('HH:mm').format(result.eventTime);

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.check_circle_outline,
                    color: Colors.white,
                    size: 72,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    greeting,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    time,
                    style: AppTheme.mono(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  if (!result.isIn && result.sessionMinutes != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _sessionLabel(result.sessionMinutes!),
                      style: AppTheme.mono(
                        fontSize: 16,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Drains from full to empty over 3 seconds, then auto-dismisses.
            AnimatedBuilder(
              animation: _drain,
              builder: (context, _) {
                return LinearProgressIndicator(
                  value: _drain.value,
                  minHeight: 4,
                  backgroundColor: Colors.white24,
                  valueColor: const AlwaysStoppedAnimation(Colors.white),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
