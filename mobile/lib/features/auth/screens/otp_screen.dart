import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../core/widgets/logo_mark.dart';
import '../../../core/widgets/plateau_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../providers/auth_provider.dart';

const _codeLength = 6;
const _resendSeconds = 24;

/// Screen 03 — enter the 6-digit code sent by email.
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _controller = TextEditingController();
  Timer? _timer;
  int _remaining = _resendSeconds;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _remaining = _resendSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_remaining <= 1) {
        t.cancel();
        setState(() => _remaining = 0);
      } else {
        setState(() => _remaining--);
      }
    });
  }

  Future<void> _submit() async {
    final code = _controller.text.trim();
    if (code.length != _codeLength) return;
    FocusScope.of(context).unfocus();
    // On success the auth status flips to authenticated and the router
    // redirect carries us to /home — no manual navigation needed here.
    await ref.read(authControllerProvider.notifier).verifyOtp(code);
  }

  Future<void> _resend() async {
    final email = ref.read(authControllerProvider).pendingEmail;
    if (email == null) return;
    final ok = await ref.read(authControllerProvider.notifier).requestOtp(email);
    if (ok) _startCountdown();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);
    final email = state.pendingEmail ?? '';
    final l10n = AppLocalizations.of(context)!;

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
                l10n.loginTitle,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 40),
              PlateauCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Saisissez le code',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text.rich(
                      TextSpan(
                        text: '${l10n.otpTitle} ',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                        children: [
                          TextSpan(
                            text: email,
                            style: const TextStyle(
                              color: AppColors.sage,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    _OtpInput(
                      controller: _controller,
                      onChanged: () => setState(() {}),
                      onCompleted: () {
                        if (!state.busy) _submit();
                      },
                    ),
                    if (state.error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        state.error!,
                        style: const TextStyle(color: AppColors.rouge),
                      ),
                    ],
                    const SizedBox(height: 20),
                    PrimaryButton(
                      label: l10n.otpButton,
                      busy: state.busy,
                      onPressed: _submit,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _remaining > 0
                  ? Text(
                      'Renvoyer le code (0:${_remaining.toString().padLeft(2, '0')})',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    )
                  : TextButton(
                      onPressed: _resend,
                      child: const Text(
                        'Renvoyer le code',
                        style: TextStyle(
                          color: AppColors.sage,
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

/// Six single-digit boxes backed by one hidden text field. The box at the
/// current cursor position is highlighted in sage.
class _OtpInput extends StatefulWidget {
  const _OtpInput({
    required this.controller,
    required this.onChanged,
    required this.onCompleted,
  });

  final TextEditingController controller;
  final VoidCallback onChanged;
  final VoidCallback onCompleted;

  @override
  State<_OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<_OtpInput> {
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = widget.controller.text;
    return GestureDetector(
      onTap: () => _focusNode.requestFocus(),
      behavior: HitTestBehavior.opaque,
      child: Stack(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(_codeLength, (i) {
              final filled = i < text.length;
              final active = i == text.length && _focusNode.hasFocus;
              return Container(
                width: 48,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: active ? AppColors.sage : AppColors.border,
                    width: active ? 2 : 1,
                  ),
                ),
                child: Text(
                  filled ? text[i] : '',
                  style: AppTheme.mono(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              );
            }),
          ),
          // Invisible field that actually captures keystrokes.
          Positioned.fill(
            child: Opacity(
              opacity: 0,
              child: TextField(
                controller: widget.controller,
                focusNode: _focusNode,
                keyboardType: TextInputType.number,
                maxLength: _codeLength,
                showCursor: false,
                enableInteractiveSelection: false,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(_codeLength),
                ],
                decoration: const InputDecoration(
                  counterText: '',
                  border: InputBorder.none,
                ),
                onChanged: (value) {
                  widget.onChanged();
                  if (value.length == _codeLength) widget.onCompleted();
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
