import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/punch_repository.dart';

/// Holds the latest punch outcome. `AsyncData(null)` means no punch has been
/// made this session — the home screen shows the ready state. After an IN
/// punch the home screen switches to the clocked-in state until the next OUT.
class PunchController extends Notifier<AsyncValue<PunchResult?>> {
  PunchRepository get _repo => ref.read(punchRepositoryProvider);

  @override
  AsyncValue<PunchResult?> build() => const AsyncValue.data(null);

  /// Punches via [method] ("NFC" or "MANUAL"). On success the result becomes
  /// the new state; on failure the previous state is kept and the error is
  /// rethrown for the caller to surface (snackbar).
  Future<PunchResult> punch(String method, {String? note}) async {
    final result = await _repo.punch(method, note: note);
    state = AsyncValue.data(result);
    return result;
  }
}

final punchControllerProvider =
    NotifierProvider<PunchController, AsyncValue<PunchResult?>>(
  PunchController.new,
);
