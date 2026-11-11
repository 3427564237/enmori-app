final class ManagedEventCategory {
  const ManagedEventCategory(this.id, this.name, this.active);
  final String id, name;
  final bool active;
}

ManagedEventCategory? parseManagedEventCategory(Object? value) {
  if (value == null) return null;
  if (value is! Map<String, Object?> ||
      value.length != 3 ||
      value.keys.any(
        (k) =>
            !['eventCategoryId', 'displayName', 'lifecycleState'].contains(k),
      )) {
    throw const FormatException();
  }
  final id = value['eventCategoryId'],
      name = value['displayName'],
      state = value['lifecycleState'];
  if (id is! String ||
      !RegExp(
        r'^cat_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      ).hasMatch(id) ||
      name is! String ||
      name.trim().isEmpty ||
      name.runes.length > 50 ||
      RegExp(r'[\x00-\x1f\x7f]').hasMatch(name) ||
      (state != 'active' && state != 'inactive')) {
    throw const FormatException();
  }
  return ManagedEventCategory(id, name, state == 'active');
}
