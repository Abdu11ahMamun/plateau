import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';

const _supported = {'en', 'fr'};

/// App display language. English is always the default; the profile toggle
/// switches it and the choice is persisted (device-level, survives sign-out).
class LocaleController extends Notifier<Locale> {
  @override
  Locale build() {
    Future.microtask(_loadSaved);
    return const Locale('en'); // default until a saved choice loads
  }

  Future<void> _loadSaved() async {
    final saved = await ref.read(secureStorageProvider).readLocale();
    if (saved != null && saved != 'en' && _supported.contains(saved)) {
      state = Locale(saved);
    }
  }

  Future<void> set(Locale locale) async {
    state = locale;
    await ref.read(secureStorageProvider).writeLocale(locale.languageCode);
  }
}

final localeProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);
