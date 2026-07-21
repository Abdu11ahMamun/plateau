import 'package:dio/dio.dart';

import '../../../l10n/generated/app_localizations.dart';

/// Maps a leave-request failure to the message the user should see. 409
/// (overlapping dates) and 422 (validation) both carry a specific,
/// human-readable backend detail that's more useful than a generic error.
String leaveErrorMessage(AppLocalizations l10n, Object error) {
  if (error is DioException) {
    switch (error.response?.statusCode) {
      case 401:
        return l10n.errSessionExpired;
      case 409:
      case 422:
        final data = error.response?.data;
        if (data is Map && data['detail'] is String) {
          return data['detail'] as String;
        }
        return l10n.errValidation;
    }
  }
  return l10n.errUnknown;
}
