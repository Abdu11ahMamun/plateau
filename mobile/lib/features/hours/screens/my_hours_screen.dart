import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/colors.dart';
import '../../../core/widgets/plateau_bottom_nav.dart';
import '../../../l10n/generated/app_localizations.dart';

/// One stubbed day row. [start]/[end] null means a rest day.
class _DayStub {
  const _DayStub(this.weekday, this.start, this.end, this.duration);

  final int weekday; // DateTime.monday..sunday
  final String? start;
  final String? end;
  final String? duration;
}

// Hardcoded stub — the real timesheet API lands in Phase 2.
const _stubWeekNumber = 27;
const _stubDays = [
  _DayStub(DateTime.monday, '09:02', '15:30', '6h 28min'),
  _DayStub(DateTime.tuesday, '08:45', '16:00', '7h 15min'),
  _DayStub(DateTime.wednesday, null, null, null),
  _DayStub(DateTime.thursday, '09:00', '14:30', '5h 30min'),
  _DayStub(DateTime.friday, '08:30', '17:00', '8h 30min'),
  _DayStub(DateTime.saturday, null, null, null),
  _DayStub(DateTime.sunday, null, null, null),
];
const _stubTotal = '27h 43min';
const _stubContractHours = 20;
const _stubOvertime = '7h 43min';

/// Screen 07 — weekly hours (stub data until the timesheet API exists).
class MyHoursScreen extends StatelessWidget {
  const MyHoursScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: Text(
          l10n.navHours,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _WeekSelector(label: l10n.hoursWeek(_stubWeekNumber)),
            const SizedBox(height: 16),
            for (final day in _stubDays) ...[
              _DayRow(day: day, restLabel: l10n.hoursRest),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 8),
            const Divider(color: AppColors.border, height: 1),
            const SizedBox(height: 16),
            Text(
              l10n.hoursTotal(_stubTotal),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              l10n.hoursContract(_stubContractHours, _stubOvertime),
              style: const TextStyle(
                color: AppColors.amber,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const PlateauBottomNav(currentIndex: 1),
    );
  }
}

/// "< Week 27 >" — the arrows are stubs until the timesheet API exists.
class _WeekSelector extends StatelessWidget {
  const _WeekSelector({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left, color: AppColors.textSecondary),
          onPressed: () {},
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
          onPressed: () {},
        ),
      ],
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.day, required this.restLabel});

  final _DayStub day;
  final String restLabel;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final isToday = DateTime.now().weekday == day.weekday;
    final isRest = day.start == null;

    // Localized day name for this weekday (any reference week works).
    final reference = DateTime(2024, 1, day.weekday); // 2024-01-01 is a Monday
    final rawName = DateFormat.EEEE(locale).format(reference);
    final dayName = rawName[0].toUpperCase() + rawName.substring(1);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isToday ? AppColors.sage.withValues(alpha: 0.16) : AppColors.mist,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isToday ? AppColors.sage : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 96,
            child: Text(
              dayName,
              style: TextStyle(
                fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                color:
                    isRest ? AppColors.textSecondary : AppColors.textPrimary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              isRest ? '—' : '${day.start} → ${day.end}',
              style: AppTheme.mono(
                fontSize: 14,
                color:
                    isRest ? AppColors.textSecondary : AppColors.textPrimary,
              ),
            ),
          ),
          Text(
            isRest ? restLabel : day.duration!,
            style: isRest
                ? const TextStyle(color: AppColors.textSecondary)
                : AppTheme.mono(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
          ),
        ],
      ),
    );
  }
}
