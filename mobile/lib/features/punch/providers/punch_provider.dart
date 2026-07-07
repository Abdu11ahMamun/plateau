import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/punch_repository.dart';

/// Holds the latest punch outcome. `AsyncData(null)` means no punch has been
/// made this session — the home screen shows the ready state. After an IN
/// punch the home screen switches to the clocked-in state until the next OUT.
class PunchController extends Notifier<AsyncValue<PunchResult?>> {
  PunchRepository get _repo => ref.read(punchRepositoryProvider);

  @override
  AsyncValue<PunchResult?> build() => const AsyncValue.data(null);

  /// Punches via [method] ("NFC" or "MANUAL"). A server-confirmed punch
  /// becomes the new state; a queued (offline) punch leaves state untouched.
  /// Non-connectivity errors are rethrown for the caller to surface.
  Future<PunchOutcome> punch(String method, {String? note}) async {
    final outcome = await _repo.punch(method, note: note);
    final result = outcome.result;
    if (result != null) {
      state = AsyncValue.data(result);
    }
    return outcome;
  }

  /// Replays the offline queue. Quiet on failure (still offline).
  Future<void> syncQueue() async {
    try {
      final sent = await _repo.flushQueue();
      if (sent > 0) {
        debugPrint('🔄 SYNC — $sent punches uploaded');
      }
    } catch (_) {
      // Still offline or server unhappy — queue is preserved, retry later.
    }
  }
}

final punchControllerProvider =
    NotifierProvider<PunchController, AsyncValue<PunchResult?>>(
  PunchController.new,
);
