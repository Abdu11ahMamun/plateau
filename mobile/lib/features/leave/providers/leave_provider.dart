import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/leave_repository.dart';

/// The tenant's configured leave types (Congés payés, Maladie, ...).
final leaveTypesProvider = FutureProvider<List<LeaveType>>((ref) {
  return ref.watch(leaveRepositoryProvider).getLeaveTypes();
});

/// The signed-in employee's own leave requests, newest first.
final myLeaveRequestsProvider = FutureProvider<List<LeaveRequest>>((ref) {
  return ref.watch(leaveRepositoryProvider).getMyRequests();
});

/// Wraps create/cancel so the screen doesn't talk to the repository (or
/// re-fetch the list) directly — both invalidate [myLeaveRequestsProvider]
/// on success so the list reflects the change immediately.
class LeaveRequestController extends Notifier<void> {
  @override
  void build() {}

  Future<LeaveRequest> createRequest({
    required int leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? halfDay,
    String? reason,
  }) async {
    final result = await ref.read(leaveRepositoryProvider).createRequest(
          leaveTypeId: leaveTypeId,
          startDate: startDate,
          endDate: endDate,
          halfDay: halfDay,
          reason: reason,
        );
    ref.invalidate(myLeaveRequestsProvider);
    return result;
  }

  Future<void> cancelRequest(int id) async {
    await ref.read(leaveRepositoryProvider).cancelRequest(id);
    ref.invalidate(myLeaveRequestsProvider);
  }
}

final leaveRequestControllerProvider =
    NotifierProvider<LeaveRequestController, void>(LeaveRequestController.new);
