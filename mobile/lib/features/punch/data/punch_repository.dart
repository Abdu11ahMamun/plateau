import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/offline/offline_queue.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/utils/uuid.dart';

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

/// A punch either reached the server ([result] set) or was captured into
/// the offline queue ([queued] true).
class PunchOutcome {
  const PunchOutcome.success(PunchResult this.result) : queued = false;
  const PunchOutcome.queued()
      : result = null,
        queued = true;

  final PunchResult? result;
  final bool queued;
}

class PunchRepository {
  PunchRepository(this._dio, this._storage, this._queue);

  final Dio _dio;
  final SecureStorage _storage;
  final OfflineQueue _queue;

  /// POST /api/punch — the backend decides IN vs OUT from the current
  /// session state. [note] is required by the backend for MANUAL punches.
  /// Connectivity failures don't throw: the punch is queued for later sync.
  Future<PunchOutcome> punch(String method, {String? note}) async {
    try {
      final result = await _send(
        method: method,
        note: note,
        idempotencyKey: generateUuidV4(),
      );
      return PunchOutcome.success(result);
    } on DioException catch (e) {
      if (_isConnectivityError(e)) {
        await _queue.enqueue(QueuedPunch(
          method: method,
          note: note,
          queuedAt: DateTime.now(),
          idempotencyKey: generateUuidV4(),
        ));
        debugPrint('⚡ PUNCH QUEUED — will sync when online');
        return const PunchOutcome.queued();
      }
      rethrow;
    }
  }

  /// Uploads queued punches in order. Returns how many were sent; rethrows
  /// on the first failure (typically still offline).
  Future<int> flushQueue() {
    return _queue.flush((punch) => _send(
          method: punch.method,
          note: punch.note,
          idempotencyKey: punch.idempotencyKey,
        ));
  }

  Future<PunchResult> _send({
    required String method,
    required String? note,
    required String idempotencyKey,
  }) async {
    try {
      final res = await _dio.post(
        '/api/punch',
        data: {'method': method, 'note': ?note},
        // Backend ignores this today; sent so queued replays can be
        // deduplicated server-side once idempotency support lands.
        options: Options(headers: {'Idempotency-Key': idempotencyKey}),
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
      // Connectivity errors are logged by the queue path (⚡), not as ❌.
      if (!_isConnectivityError(e)) _logError(e);
      rethrow;
    }
  }

  static bool _isConnectivityError(DioException e) {
    return e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout;
  }

  static void _logError(DioException e) {
    switch (e.response?.statusCode) {
      case 401:
        debugPrint('🚪 SESSION EXPIRED (refresh failed) — punch rejected');
      case 409:
        debugPrint('ℹ️ Already recorded (idempotency) — punch ignored');
      case 422:
        debugPrint('⚠️ Validation error — ${e.response?.data}');
      default:
        debugPrint(
          '❌ PUNCH ERROR — status: ${e.response?.statusCode} | ${e.message}',
        );
    }
  }
}

final punchRepositoryProvider = Provider<PunchRepository>((ref) {
  return PunchRepository(
    ref.watch(dioProvider),
    ref.watch(secureStorageProvider),
    ref.watch(offlineQueueProvider),
  );
});
