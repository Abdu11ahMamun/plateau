import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// App display language. English is the default; the profile screen toggles
/// it at runtime. In-memory only for now — persisting the choice can come
/// with the settings work.
class LocaleController extends Notifier<Locale> {
  @override
  Locale build() => const Locale('en');

  void set(Locale locale) => state = locale;
}

final localeProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);
