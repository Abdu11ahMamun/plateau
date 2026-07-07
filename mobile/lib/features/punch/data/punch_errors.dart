import 'package:dio/dio.dart';

import '../../../l10n/generated/app_localizations.dart';

/// Maps a punch failure to the snackbar message the user should see.
String punchErrorMessage(AppLocalizations l10n, Object error) {
  if (error is DioException) {
    switch (error.response?.statusCode) {
      case 401:
        return l10n.errSessionExpired;
      case 409:
        return l10n.errAlreadyRecorded;
      case 422:
        // Backend sends a human-readable detail for validation failures.
        final data = error.response?.data;
        if (data is Map && data['detail'] is String) {
          return data['detail'] as String;
        }
        return l10n.errValidation;
    }
  }
  return l10n.errUnknown;
}
