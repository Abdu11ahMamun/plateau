import 'package:flutter/material.dart';

import '../theme/colors.dart';

/// The rounded sage "P" brand tile used on splash and auth screens.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.sage,
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
      alignment: Alignment.center,
      child: Text(
        'P',
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
