import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../data/punch_errors.dart';
import '../providers/punch_provider.dart';

const _minReasonLength = 10;

/// Screen 06 — manual punch fallback. Requires a reason (min 10 chars) and
/// is flagged server-side for manager review. The backend decides IN vs OUT
/// from the open-session state; the toggle just shows the expected direction.
class ManualPunchScreen extends ConsumerStatefulWidget {
  const ManualPunchScreen({super.key});

  @override
  ConsumerState<ManualPunchScreen> createState() => _ManualPunchScreenState();
}

class _ManualPunchScreenState extends ConsumerState<ManualPunchScreen> {
  final _reasonController = TextEditingController();
  bool? _punchIn; // set on first build from the current session state
  bool _submitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  bool get _reasonValid =>
      _reasonController.text.trim().length >= _minReasonLength;

  Future<void> _submit() async {
    if (!_reasonValid || _submitting) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);
    try {
      final outcome = await ref
          .read(punchControllerProvider.notifier)
          .punch('MANUAL', note: _reasonController.text.trim());
      if (!mounted) return;
      if (outcome.queued) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.offlineQueued),
          ),
        );
        context.go('/home');
      } else {
        context.go('/punch-result', extra: outcome.result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(punchErrorMessage(AppLocalizations.of(context)!, e)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final lastPunch = ref.watch(punchControllerProvider).value;
    // Default: IN when clocked out, OUT when clocked in.
    _punchIn ??= !(lastPunch?.isIn ?? false);

    final reasonText = _reasonController.text.trim();
    final showTooShort = reasonText.isNotEmpty && !_reasonValid;

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        title: Text(
          l10n.manualTitle,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.amber.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.amber.withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      color: AppColors.amber,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l10n.manualWarning,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SegmentedButton<bool>(
                segments: [
                  ButtonSegment(
                    value: true,
                    label: Text(l10n.punchTypeIn),
                    icon: const Icon(Icons.login),
                  ),
                  ButtonSegment(
                    value: false,
                    label: Text(l10n.punchTypeOut),
                    icon: const Icon(Icons.logout),
                  ),
                ],
                selected: {_punchIn!},
                onSelectionChanged: (selection) {
                  setState(() => _punchIn = selection.first);
                },
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: AppColors.sage,
                  selectedForegroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _reasonController,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: l10n.manualReasonLabel,
                  errorText: showTooShort ? l10n.manualReasonTooShort : null,
                  filled: true,
                  fillColor: Colors.white,
                  alignLabelWithHint: true,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: AppColors.sage, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                label: l10n.manualSubmit,
                busy: _submitting,
                onPressed: _reasonValid ? _submit : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
