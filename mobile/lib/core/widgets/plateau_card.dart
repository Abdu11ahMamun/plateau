import 'package:flutter/material.dart';

import '../theme/colors.dart';

/// Mist card container with the brand hairline border.
class PlateauCard extends StatelessWidget {
  const PlateauCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.mist,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
