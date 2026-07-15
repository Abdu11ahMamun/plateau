import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';

/// The signed-in employee's own current contract, from GET /api/me/contract.
class Contract {
  const Contract({
    required this.type,
    required this.weeklyMinutes,
    required this.hourlyWageCents,
    required this.startDate,
  });

  final String type;
  final int weeklyMinutes;
  final int hourlyWageCents;
  final DateTime startDate;

  factory Contract.fromJson(Map<String, dynamic> json) {
    return Contract(
      type: json['type'] as String,
      weeklyMinutes: json['weeklyMinutes'] as int,
      hourlyWageCents: json['hourlyWageCents'] as int,
      startDate: DateTime.parse(json['startDate'] as String),
    );
  }
}

/// One worked session for the signed-in employee.
class HoursSession {
  const HoursSession({
    required this.date,
    required this.clockIn,
    this.clockOut,
    this.durationMinutes,
    required this.method,
    required this.status,
  });

  final DateTime date;
  final String clockIn; // "09:02"
  final String? clockOut; // null while still clocked in
  final int? durationMinutes; // null while still clocked in
  final String method; // NFC | MANUAL | ADMIN
  final String status; // AUTO | FLAGGED | REVIEW

  bool get isOpen => clockOut == null;
  bool get isFlagged => status != 'AUTO';

  factory HoursSession.fromJson(Map<String, dynamic> json) {
    return HoursSession(
      date: DateTime.parse(json['date'] as String),
      clockIn: json['clockIn'] as String,
      clockOut: json['clockOut'] as String?,
      durationMinutes: json['durationMinutes'] as int?,
      method: json['method'] as String,
      status: json['status'] as String,
    );
  }
}

class HoursRepository {
  HoursRepository(this._dio);

  final Dio _dio;

  /// GET /api/me/hours?month=YYYY-MM — the caller's own sessions.
  Future<List<HoursSession>> getMyHours(String month) async {
    final res = await _dio.get(
      '/api/me/hours',
      queryParameters: {'month': month},
    );
    final list = res.data as List<dynamic>;
    return list
        .map((e) => HoursSession.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/me/contract — null on 404, which just means no active
  /// contract (a normal state for some employees, not an error).
  Future<Contract?> getMyContract() async {
    try {
      final res = await _dio.get('/api/me/contract');
      return Contract.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}

final hoursRepositoryProvider = Provider<HoursRepository>((ref) {
  return HoursRepository(ref.watch(dioProvider));
});
