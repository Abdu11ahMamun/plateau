import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:plateau_mobile/features/splash/screens/splash_screen.dart';

void main() {
  testWidgets('Splash renders the Plateau brand', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: SplashScreen()));

    expect(find.text('Plateau'), findsOneWidget);
    expect(find.text("Pointage d'équipe"), findsOneWidget);
  });
}
