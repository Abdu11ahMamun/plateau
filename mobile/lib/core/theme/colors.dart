import 'package:flutter/painting.dart';

/// Plateau brand palette — shared with the web panel.
/// Keep these token names in sync across mobile and admin-web.
abstract final class AppColors {
  static const Color ink = Color(0xFF1A1A2E); // sidebar/header background
  static const Color slate = Color(0xFF2D3561); // secondary
  static const Color sage = Color(0xFF4CAF7D); // clock-in / success
  static const Color amber = Color(0xFFF59E0B); // flag / warning
  static const Color rouge = Color(0xFFEF4444); // clock-out / error
  static const Color cream = Color(0xFFFAF9F6); // page background
  static const Color mist = Color(0xFFF0EFE9); // card background
  static const Color border = Color(0xFFE2E0D8); // hairlines / outlines

  /// Body text on light surfaces.
  static const Color textPrimary = ink;
  static const Color textSecondary = Color(0xFF6B7280);
}
