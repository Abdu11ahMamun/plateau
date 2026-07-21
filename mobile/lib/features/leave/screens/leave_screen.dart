import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../core/widgets/plateau_bottom_nav.dart';
import '../../../core/widgets/plateau_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../data/leave_errors.dart';
import '../data/leave_repository.dart';
import '../providers/leave_provider.dart';

/// Screen — request time off and track the status of past requests.
/// One screen, two sections (not tabs): the request form on top, the
/// employee's own request history below.
class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  int? _leaveTypeId;
  DateTime? _from;
  DateTime? _to;
  bool _halfDay = false;
  String _halfDaySlot = 'AM';
  final _reasonController = TextEditingController();
  bool _submitting = false;
  String? _formError;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  bool get _sameDay =>
      _from != null &&
      _to != null &&
      _from!.year == _to!.year &&
      _from!.month == _to!.month &&
      _from!.day == _to!.day;

  bool get _rangeValid =>
      _from != null && _to != null && !_to!.isBefore(_from!);

  Future<void> _pickDate({required bool isFrom}) async {
    final now = DateTime.now();
    final initial = (isFrom ? _from : _to) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
      } else {
        _to = picked;
      }
      if (!_sameDay) _halfDay = false;
    });
  }

  Future<void> _submit(List<LeaveType> types) async {
    if (_leaveTypeId == null || !_rangeValid || _submitting) return;
    setState(() {
      _submitting = true;
      _formError = null;
    });
    try {
      await ref.read(leaveRequestControllerProvider.notifier).createRequest(
            leaveTypeId: _leaveTypeId!,
            startDate: _from!,
            endDate: _to!,
            halfDay: _halfDay ? _halfDaySlot : null,
            reason: _reasonController.text.trim(),
          );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      final l10n = AppLocalizations.of(context)!;
      setState(() {
        _from = null;
        _to = null;
        _halfDay = false;
        _reasonController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.leaveSent)),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _formError = leaveErrorMessage(AppLocalizations.of(context)!, e);
        });
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancel(LeaveRequest request) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.leaveCancelConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(MaterialLocalizations.of(context).closeButtonLabel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              l10n.leaveCancelConfirmAction,
              style: const TextStyle(color: AppColors.rouge),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref
          .read(leaveRequestControllerProvider.notifier)
          .cancelRequest(request.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.leaveCancelled)),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(leaveErrorMessage(l10n, e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final typesAsync = ref.watch(leaveTypesProvider);
    final requestsAsync = ref.watch(myLeaveRequestsProvider);

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: Text(
          l10n.leaveTitle,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            PlateauCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.leaveRequestSectionTitle,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 16),
                  typesAsync.when(
                    loading: () => const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    error: (_, _) => Text(
                      l10n.errUnknown,
                      style: const TextStyle(color: AppColors.rouge),
                    ),
                    data: (types) => _buildForm(context, l10n, types),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            Text(
              l10n.leaveMyRequests,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 12),
            requestsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (_, _) => Text(
                l10n.errUnknown,
                style: const TextStyle(color: AppColors.rouge),
              ),
              data: (requests) => requests.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          l10n.leaveNoRequests,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        for (final request in requests) ...[
                          _RequestCard(
                            request: request,
                            typeName: typesAsync.value
                                    ?.where((t) => t.id == request.leaveTypeId)
                                    .firstOrNull
                                    ?.name ??
                                '—',
                            onCancel: () => _cancel(request),
                          ),
                          const SizedBox(height: 10),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const PlateauBottomNav(currentIndex: 2),
    );
  }

  Widget _buildForm(
    BuildContext context,
    AppLocalizations l10n,
    List<LeaveType> types,
  ) {
    final locale = Localizations.localeOf(context).toString();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SegmentedButton<int>(
          segments: [
            for (final type in types)
              ButtonSegment(value: type.id, label: Text(type.name)),
          ],
          selected: _leaveTypeId == null ? const {} : {_leaveTypeId!},
          emptySelectionAllowed: true,
          onSelectionChanged: (selection) {
            setState(() => _leaveTypeId = selection.firstOrNull);
          },
          style: SegmentedButton.styleFrom(
            selectedBackgroundColor: AppColors.sage,
            selectedForegroundColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _DateField(
                label: l10n.leaveFrom,
                value: _from,
                locale: locale,
                onTap: () => _pickDate(isFrom: true),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _DateField(
                label: l10n.leaveTo,
                value: _to,
                locale: locale,
                onTap: () => _pickDate(isFrom: false),
              ),
            ),
          ],
        ),
        if (_sameDay) ...[
          const SizedBox(height: 8),
          CheckboxListTile(
            value: _halfDay,
            onChanged: (checked) =>
                setState(() => _halfDay = checked ?? false),
            title: Text(l10n.leaveHalfDay),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.sage,
          ),
          if (_halfDay)
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'AM', label: Text('AM')),
                ButtonSegment(value: 'PM', label: Text('PM')),
              ],
              selected: {_halfDaySlot},
              onSelectionChanged: (selection) {
                setState(() => _halfDaySlot = selection.first);
              },
              style: SegmentedButton.styleFrom(
                selectedBackgroundColor: AppColors.sage,
                selectedForegroundColor: Colors.white,
              ),
            ),
        ],
        const SizedBox(height: 16),
        TextField(
          controller: _reasonController,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: l10n.leaveReason,
            hintText: l10n.leaveReasonHint,
            filled: true,
            fillColor: Colors.white,
            alignLabelWithHint: true,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.sage, width: 2),
            ),
          ),
        ),
        if (_formError != null) ...[
          const SizedBox(height: 12),
          Text(
            _formError!,
            style: const TextStyle(color: AppColors.rouge),
          ),
        ],
        const SizedBox(height: 16),
        PrimaryButton(
          label: l10n.leaveRequestButton,
          busy: _submitting,
          onPressed: (_leaveTypeId != null && _rangeValid)
              ? () => _submit(types)
              : null,
        ),
      ],
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.locale,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final String locale;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text =
        value == null ? '—' : DateFormat('d MMM yyyy', locale).format(value!);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              text,
              style: AppTheme.mono(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.typeName,
    required this.onCancel,
  });

  final LeaveRequest request;
  final String typeName;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).toString();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  typeName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              _StatusBadge(status: request.status),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            _dateRangeLabel(request, locale),
            style: AppTheme.mono(fontSize: 13, color: AppColors.textPrimary),
          ),
          if (request.status == 'REJECTED' &&
              request.decisionNote != null &&
              request.decisionNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              request.decisionNote!,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          if (request.status == 'PENDING') ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onCancel,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.rouge,
                  visualDensity: VisualDensity.compact,
                ),
                child: Text(l10n.leaveCancelAction),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _dateRangeLabel(LeaveRequest request, String locale) {
    final start = request.startDate;
    final end = request.endDate;
    final sameDay = start.year == end.year &&
        start.month == end.month &&
        start.day == end.day;

    if (request.halfDay != null) {
      final day = DateFormat('d MMM yyyy', locale).format(start);
      return '$day (${request.halfDay})';
    }
    if (sameDay) {
      return DateFormat('d MMM yyyy', locale).format(start);
    }
    final sameYear = start.year == end.year;
    final startLabel = DateFormat(sameYear ? 'd MMM' : 'd MMM yyyy', locale)
        .format(start);
    final endLabel = DateFormat('d MMM yyyy', locale).format(end);
    return '$startLabel → $endLabel';
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final (Color color, String label) = switch (status) {
      'PENDING' => (AppColors.amber, l10n.leaveStatusPending),
      'APPROVED' => (AppColors.sage, l10n.leaveStatusApproved),
      'REJECTED' => (AppColors.rouge, l10n.leaveStatusRejected),
      _ => (AppColors.slate, l10n.leaveCancelled),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
