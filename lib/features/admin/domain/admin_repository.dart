import '../../../core/result/result.dart';
import 'managed_event_category.dart';
export 'managed_event_category.dart';

final class AdminCategory {
  const AdminCategory(this.id, this.name, this.active, this.revision);
  final String id, name;
  final bool active;
  final int revision;
  bool sameVersion(AdminCategory other) =>
      id == other.id &&
      name == other.name &&
      active == other.active &&
      revision == other.revision;
}

final class AdminServiceStatus {
  const AdminServiceStatus(
    this.service,
    this.configured,
    this.state,
    this.observedAt,
    this.succeededAt,
    this.reason,
  );
  final String service, state;
  final bool configured;
  final DateTime? observedAt, succeededAt;
  final String? reason;
}

final class AdminStatus {
  const AdminStatus(this.observedAt, this.services);
  final DateTime observedAt;
  final List<AdminServiceStatus> services;
}

final class AdminOperationRecord {
  const AdminOperationRecord(
    this.id,
    this.occurredAt,
    this.expiresAt,
    this.actor,
    this.targetType,
    this.targetId,
    this.operation,
    this.beforeRevision,
    this.afterRevision,
  );
  final String id, actor, targetType, targetId, operation;
  final DateTime occurredAt, expiresAt;
  final int? beforeRevision;
  final int afterRevision;
}

final class AdminRecordPage {
  const AdminRecordPage(this.records, this.nextCursor);
  final List<AdminOperationRecord> records;
  final String? nextCursor;
}

final class AdminClassification {
  const AdminClassification(this.eventId, this.revision, this.category);
  final String eventId;
  final int revision;
  final ManagedEventCategory? category;
}

abstract interface class AdminRepository {
  Future<Result<AdminStatus>> status(bool Function() current);
  Future<Result<List<AdminCategory>>> categories(bool Function() current);
  Future<Result<AdminCategory>> create(String name, bool Function() current);
  Future<Result<AdminCategory>> rename(
    AdminCategory expected,
    String name,
    bool Function() current,
  );
  Future<Result<AdminCategory>> lifecycle(
    AdminCategory expected,
    bool active,
    bool Function() current,
  );
  Future<Result<AdminRecordPage>> records(
    String? cursor,
    bool Function() current,
  );
  Future<Result<AdminClassification>> classification(
    String eventId,
    bool Function() current,
  );
  Future<Result<AdminClassification>> assign(
    AdminClassification expected,
    String? categoryId,
    bool Function() current,
  );
}
