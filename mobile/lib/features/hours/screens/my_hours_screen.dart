import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../core/widgets/plateau_bottom_nav.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../data/hours_repository.dart';
import '../providers/hours_provider.dart';

/// Screen 07 — the employee's own worked sessions for a month, from
/// GET /api/me/hours. Sessions are grouped by day with a running month total.
class MyHoursScreen extends ConsumerStatefulWidget {
  const MyHoursScreen({super.key});

  @override
  ConsumerState<MyHoursScreen> createState() => _MyHoursScreenState();
}

class _MyHoursScreenState extends ConsumerState<MyHoursScreen> {
  late String _month; // "YYYY-MM"

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  void _shift(int delta) {
    final parts = _month.split('-');
    final d = DateTime(int.parse(parts[0]), int.parse(parts[1]) + delta);
    setState(
      () => _month = '${d.year}-${d.month.toString().padLeft(2, '0')}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final async = ref.watch(hoursProvider(_month));

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: Text(
          l10n.myHoursTitle,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            _MonthSelector(
              month: _month,
              onPrev: () => _shift(-1),
              onNext: () => _shift(1),
            ),
            Expanded(
              child: async.when(
                loading: () => const _LoadingList(),
                error: (_, _) => _ErrorState(
                  onRetry: () => ref.invalidate(hoursProvider(_month)),
                ),
                data: (sessions) => sessions.isEmpty
                    ? const _EmptyState()
                    : _SessionList(sessions: sessions),
              ),
            ),
            async.maybeWhen(
              data: (sessions) =>
                  sessions.isEmpty ? const SizedBox.shrink() : _Footer(sessions),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const PlateauBottomNav(currentIndex: 1),
    );
  }
}

// ── Month selector ───────────────────────────────────────────────────────

class _MonthSelector extends StatelessWidget {
  const _MonthSelector({
    required this.month,
    required this.onPrev,
    required this.onNext,
  });

  final String month;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final parts = month.split('-');
    final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
    final label = DateFormat('MMMM yyyy', locale).format(date);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: AppColors.textSecondary),
            onPressed: onPrev,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              label,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          IconButton(
            icon:
                const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            onPressed: onNext,
          ),
        ],
      ),
    );
  }
}

// ── Session list (grouped by day) ─────────────────────────────────────────

class _SessionList extends StatelessWidget {
  const _SessionList({required this.sessions});

  final List<HoursSession> sessions;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final groups = _groupByDay(sessions);

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
      itemCount: groups.length,
      itemBuilder: (context, i) {
        final entry = groups[i];
        final rawHeader = DateFormat('EEEE, d MMMM', locale).format(entry.key);
        final header = rawHeader[0].toUpperCase() + rawHeader.substring(1);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.only(top: i == 0 ? 8 : 20, bottom: 8),
              child: Text(
                header,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            for (final s in entry.value) ...[
              _SessionRow(session: s),
              const SizedBox(height: 8),
            ],
          ],
        );
      },
    );
  }

  /// Preserves the backend's date-asc / clockIn-asc order.
  static List<MapEntry<DateTime, List<HoursSession>>> _groupByDay(
    List<HoursSession> sessions,
  ) {
    final map = <String, List<HoursSession>>{};
    for (final s in sessions) {
      final key = DateFormat('yyyy-MM-dd').format(s.date);
      (map[key] ??= []).add(s);
    }
    return map.entries
        .map((e) => MapEntry(DateTime.parse(e.key), e.value))
        .toList();
  }
}

class _SessionRow extends StatelessWidget {
  const _SessionRow({required this.session});

  final HoursSession session;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final accent = session.isFlagged ? AppColors.amber : AppColors.sage;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.schedule, size: 18, color: accent),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              session.isOpen
                  ? '${session.clockIn} → …'
                  : '${session.clockIn} → ${session.clockOut}',
              style: AppTheme.mono(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Text(
            session.isOpen
                ? l10n.myHoursStillIn
                : _durationLabel(session.durationMinutes),
            style: session.isOpen
                ? const TextStyle(
                    color: AppColors.sage,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  )
                : AppTheme.mono(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
          ),
          const SizedBox(width: 10),
          _MethodBadge(method: session.method),
        ],
      ),
    );
  }
}

class _MethodBadge extends StatelessWidget {
  const _MethodBadge({required this.method});

  final String method;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg, String label) = switch (method) {
      'NFC' => (AppColors.sage.withValues(alpha: 0.14), AppColors.sage, 'NFC'),
      'MANUAL' => (
          AppColors.amber.withValues(alpha: 0.16),
          AppColors.amber,
          'Manual',
        ),
      _ => (
          AppColors.textSecondary.withValues(alpha: 0.12),
          AppColors.textSecondary,
          'Admin',
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

// ── Footer ─────────────────────────────────────────────────────────────────

class _Footer extends ConsumerWidget {
  const _Footer(this.sessions);

  final List<HoursSession> sessions;

  /// Rough weeks-per-month, used only to size a soft over/under signal —
  /// not a payroll calculation.
  static const _weeksPerMonth = 4.3;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final total = sessions.fold<int>(
      0,
      (sum, s) => sum + (s.durationMinutes ?? 0),
    );
    final h = total ~/ 60;
    final m = total % 60;
    final label = '${h}h ${m.toString().padLeft(2, '0')}min';

    final contract = ref.watch(contractProvider).value;
    final overContract = contract != null &&
        total > contract.weeklyMinutes * _weeksPerMonth;

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.myHoursTotal(label),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: contract == null
                          ? null
                          : (overContract ? AppColors.amber : AppColors.sage),
                    ),
              ),
              if (contract != null) ...[
                const SizedBox(height: 2),
                Text(
                  l10n.myHoursContractLine(contract.weeklyMinutes ~/ 60),
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── States ─────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.event_busy, size: 56, color: AppColors.border),
          const SizedBox(height: 16),
          Text(
            l10n.myHoursNoSessions,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.myHoursNoSessionsHint,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 56, color: AppColors.border),
          const SizedBox(height: 16),
          Text(
            l10n.myHoursError,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: onRetry,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.sage,
              side: const BorderSide(color: AppColors.sage),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(l10n.myHoursRetry),
          ),
        ],
      ),
    );
  }
}

class _LoadingList extends StatefulWidget {
  const _LoadingList();

  @override
  State<_LoadingList> createState() => _LoadingListState();
}

class _LoadingListState extends State<_LoadingList>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      children: [
        for (var g = 0; g < 3; g++) ...[
          _bar(width: 140, height: 14),
          const SizedBox(height: 12),
          _bar(height: 46),
          const SizedBox(height: 8),
          _bar(height: 46),
          const SizedBox(height: 24),
        ],
      ],
    );
  }

  Widget _bar({double? width, required double height}) {
    return FadeTransition(
      opacity: Tween(begin: 0.4, end: 0.9).animate(_c),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.mist,
          borderRadius: BorderRadius.circular(height > 20 ? 12 : 4),
        ),
      ),
    );
  }
}

String _durationLabel(int? minutes) {
  if (minutes == null) return '—';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return h > 0 ? '${h}h ${m.toString().padLeft(2, '0')}min' : '${m}min';
}
