import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';

/// Outcome of a punch: whether it opened or closed a session.
class PunchResult {
  const PunchResult({
    required this.type,
    required this.eventTime,
    this.sessionMinutes,
  });

  /// "IN" or "OUT".
  final String type;

  /// Local time the backend recorded the punch.
  final DateTime eventTime;

  /// Total session length, only present on an OUT punch.
  final int? sessionMinutes;

  bool get isIn => type == 'IN';

  factory PunchResult.fromJson(Map<String, dynamic> json) {
    return PunchResult(
      type: json['type'] as String,
      eventTime: DateTime.parse(json['eventTime'] as String).toLocal(),
      sessionMinutes: json['sessionMinutes'] as int?,
    );
  }
}

class PunchRepository {
  PunchRepository(this._dio, this._storage);

  final Dio _dio;
  final SecureStorage _storage;

  /// POST /api/punch — the backend decides IN vs OUT from the current
  /// session state. [note] is required by the backend for MANUAL punches.
  Future<PunchResult> punch(String method, {String? note}) async {
    try {
      final res = await _dio.post(
        '/api/punch',
        data: {'method': method, 'note': ?note},
      );
      final result = PunchResult.fromJson(res.data as Map<String, dynamic>);
      final user = await _storage.readUserName() ?? '?';
      if (result.isIn) {
        debugPrint(
          '🟢 PUNCH IN ($method) — ${result.eventTime.toLocal()} | user: $user',
        );
      } else {
        debugPrint(
          '🔴 PUNCH OUT ($method) — ${result.eventTime.toLocal()} | '
          'session: ${result.sessionMinutes}min | user: $user',
        );
      }
      return result;
    } on DioException catch (e) {
      debugPrint(
        '❌ PUNCH ERROR — status: ${e.response?.statusCode} | ${e.message}',
      );
      rethrow;
    }
  }
}

final punchRepositoryProvider = Provider<PunchRepository>((ref) {
  return PunchRepository(
    ref.watch(dioProvider),
    ref.watch(secureStorageProvider),
  );
});
