import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// A punch captured while offline, waiting to be replayed.
class QueuedPunch {
  const QueuedPunch({
    required this.method,
    this.note,
    required this.queuedAt,
    required this.idempotencyKey,
  });

  final String method;
  final String? note;
  final DateTime queuedAt;
  final String idempotencyKey;

  Map<String, dynamic> toMap() => {
        'method': method,
        'note': note,
        'queuedAt': queuedAt.toIso8601String(),
        'idempotencyKey': idempotencyKey,
      };

  factory QueuedPunch.fromMap(Map<dynamic, dynamic> map) {
    return QueuedPunch(
      method: map['method'] as String,
      note: map['note'] as String?,
      queuedAt: DateTime.parse(map['queuedAt'] as String),
      idempotencyKey: map['idempotencyKey'] as String,
    );
  }
}

/// FIFO punch queue backed by a Hive box. Punches that fail with a
/// connectivity error land here and are replayed on app resume.
class OfflineQueue {
  OfflineQueue(this._box);

  static const boxName = 'punch_queue';

  final Box<dynamic> _box;

  int get pendingCount => _box.length;

  /// Reactive handle for UI (home banner).
  ValueListenable<Box<dynamic>> get listenable => _box.listenable();

  Future<void> enqueue(QueuedPunch punch) => _box.add(punch.toMap());

  /// Replays queued punches in order via [send], removing each on success.
  /// Stops at the first failure (still offline) and rethrows so the caller
  /// can decide what to surface. Returns how many punches were uploaded.
  Future<int> flush(Future<void> Function(QueuedPunch punch) send) async {
    var sent = 0;
    while (_box.isNotEmpty) {
      final key = _box.keyAt(0);
      final punch =
          QueuedPunch.fromMap(_box.getAt(0) as Map<dynamic, dynamic>);
      await send(punch);
      await _box.delete(key);
      sent++;
    }
    return sent;
  }
}

final offlineQueueProvider = Provider<OfflineQueue>((ref) {
  return OfflineQueue(Hive.box<dynamic>(OfflineQueue.boxName));
});
