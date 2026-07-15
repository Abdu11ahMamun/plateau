import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/hours_repository.dart';

/// The signed-in employee's sessions for [month] ("YYYY-MM").
/// autoDispose so re-opening My Hours (or switching months) refetches —
/// a timesheet should always reflect the latest punches.
final hoursProvider =
    FutureProvider.autoDispose.family<List<HoursSession>, String>((ref, month) {
  return ref.watch(hoursRepositoryProvider).getMyHours(month);
});

/// The signed-in employee's current contract, or null if they have none.
final contractProvider = FutureProvider.autoDispose<Contract?>((ref) {
  return ref.watch(hoursRepositoryProvider).getMyContract();
});
