import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/widgets/logo_mark.dart';
import '../../../core/widgets/plateau_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../providers/auth_provider.dart';

/// Screen shown right after OTP verify when the employee is still INVITED
/// (see AuthState.needsJoin) — accepting here flips them to ACTIVE and
/// enrolls the device in one call, then the router carries them to /home.
class JoinScreen extends ConsumerWidget {
  const JoinScreen({super.key});

  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final tenantName = ref.read(authControllerProvider).joinTenantName ?? '';
    final ok = await ref.read(authControllerProvider.notifier).acceptInvite();
    if (ok) {
      HapticFeedback.mediumImpact();
      debugPrint('✅ JOINED — tenant: $tenantName');
      // Router redirect carries us to /home once needsJoin clears —
      // no manual navigation needed here.
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final state = ref.watch(authControllerProvider);
    final tenantName = state.joinTenantName ?? '';
    final employeeName = state.joinEmployeeName;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 72),
              const LogoMark(size: 56),
              const SizedBox(height: 16),
              Text(
                l10n.joinTitle(tenantName),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 40),
              PlateauCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (employeeName != null) ...[
                      Text(
                        l10n.joinSubtitle(employeeName),
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (state.error != null) ...[
                      Text(
                        state.error!,
                        style: const TextStyle(color: AppColors.rouge),
                      ),
                      const SizedBox(height: 12),
                    ],
                    PrimaryButton(
                      label: l10n.joinButton(tenantName),
                      busy: state.busy,
                      onPressed: () => _join(context, ref),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              TextButton(
                onPressed: () =>
                    ref.read(authControllerProvider.notifier).logout(),
                child: Text(
                  l10n.joinSignOut,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
