import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/dio_client.dart';

/// A tenant-configured kind of leave (e.g. "Congés payés", "Maladie").
class LeaveType {
  const LeaveType({
    required this.id,
    required this.name,
    required this.requiresApproval,
    required this.paid,
  });

  final int id;
  final String name;
  final bool requiresApproval;
  final bool paid;

  factory LeaveType.fromJson(Map<String, dynamic> json) {
    return LeaveType(
      id: json['id'] as int,
      name: json['name'] as String,
      requiresApproval: json['requiresApproval'] as bool,
      paid: json['paid'] as bool,
    );
  }
}

/// One of the signed-in employee's own leave requests.
class LeaveRequest {
  const LeaveRequest({
    required this.id,
    required this.leaveTypeId,
    required this.startDate,
    required this.endDate,
    this.halfDay,
    this.reason,
    required this.status,
    required this.requestedAt,
    this.decidedAt,
    this.decisionNote,
  });

  final int id;
  final int leaveTypeId;
  final DateTime startDate;
  final DateTime endDate;
  final String? halfDay; // "AM" | "PM"
  final String? reason;
  final String status; // PENDING | APPROVED | REJECTED | CANCELLED
  final DateTime requestedAt;
  final DateTime? decidedAt;
  final String? decisionNote;

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] as int,
      leaveTypeId: json['leaveTypeId'] as int,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      halfDay: json['halfDay'] as String?,
      reason: json['reason'] as String?,
      status: json['status'] as String,
      requestedAt: DateTime.parse(json['requestedAt'] as String).toLocal(),
      decidedAt: json['decidedAt'] != null
          ? DateTime.parse(json['decidedAt'] as String).toLocal()
          : null,
      decisionNote: json['decisionNote'] as String?,
    );
  }
}

class LeaveRepository {
  LeaveRepository(this._dio);

  final Dio _dio;

  static final _dateFormat = DateFormat('yyyy-MM-dd');

  /// GET /api/leave/types — the tenant's configured leave types.
  Future<List<LeaveType>> getLeaveTypes() async {
    final res = await _dio.get('/api/leave/types');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => LeaveType.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /api/leave/requests. Throws on 409 (overlapping dates) or 422
  /// (validation, e.g. half-day on a multi-day range) — the caller shows
  /// the backend's detail message rather than a generic error.
  Future<LeaveRequest> createRequest({
    required int leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? halfDay,
    String? reason,
  }) async {
    final res = await _dio.post(
      '/api/leave/requests',
      data: {
        'leaveTypeId': leaveTypeId,
        'startDate': _dateFormat.format(startDate),
        'endDate': _dateFormat.format(endDate),
        'halfDay': ?halfDay,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
    );
    return LeaveRequest.fromJson(res.data as Map<String, dynamic>);
  }

  /// GET /api/leave/requests/me — the caller's own requests, newest first.
  Future<List<LeaveRequest>> getMyRequests() async {
    final res = await _dio.get('/api/leave/requests/me');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => LeaveRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /api/leave/requests/{id}/cancel — only valid while PENDING.
  Future<void> cancelRequest(int id) async {
    await _dio.post('/api/leave/requests/$id/cancel');
  }
}

final leaveRepositoryProvider = Provider<LeaveRepository>((ref) {
  return LeaveRepository(ref.watch(dioProvider));
});
