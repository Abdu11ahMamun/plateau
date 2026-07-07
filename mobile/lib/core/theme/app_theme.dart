import 'package:flutter/material.dart';

import 'colors.dart';

/// App-wide theme. Inter for all body text; JetBrains Mono is reserved for
/// times/durations and exposed via [AppTheme.mono]. Both are bundled assets
/// (see pubspec fonts) — nothing is fetched at runtime.
abstract final class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: AppColors.cream,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.sage,
        primary: AppColors.sage,
        error: AppColors.rouge,
        surface: AppColors.cream,
      ),
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
    );
  }

  /// Monospaced style for times and durations (JetBrains Mono).
  static TextStyle mono({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w600,
    Color? color,
  }) {
    return TextStyle(
      fontFamily: 'JetBrains Mono',
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }
}
