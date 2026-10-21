import 'check_in_repository.dart';

abstract interface class CheckInProjectionDecoder {
  CheckIn? decode(Object? value);
}
