import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../domain/check_in_repository.dart';
import 'check_in_edit_controller.dart';

enum CheckInEditResult { saved, deleted }

final class CheckInEditPage extends ConsumerStatefulWidget {
  const CheckInEditPage({required this.checkIn, super.key});
  final CheckIn checkIn;
  @override
  ConsumerState<CheckInEditPage> createState() => _CheckInEditPageState();
}

class _CheckInEditPageState extends ConsumerState<CheckInEditPage> {
  late CheckIn _current;
  late final TextEditingController _note;
  late CheckInVisibility _visibility;
  String? _mood, _activity, _locationLabel;
  bool get _dirty =>
      _locationLabel != _current.locationLabel ||
      _mood != _current.mood ||
      _activity != _current.activity ||
      _note.text != _current.note ||
      _visibility != (_current.checkInVisibility ?? CheckInVisibility.private);
  @override
  void initState() {
    super.initState();
    _current = widget.checkIn;
    _mood = _current.mood;
    _activity = _current.activity;
    _locationLabel = _current.locationLabel;
    _note = TextEditingController(text: _current.note);
    _visibility = _current.checkInVisibility ?? CheckInVisibility.private;
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<bool> _confirm(String title, String body, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInEditControllerProvider);
    final controller = ref.read(checkInEditControllerProvider.notifier);
    final mustReload =
        state.failure != null &&
        state.failure!.kind != AppFailureKind.checkInInvalid;
    ref.listen(checkInEditControllerProvider, (previous, next) {
      if (next.saved != null || next.deleted) {
        Navigator.of(context).pop(
          next.deleted ? CheckInEditResult.deleted : CheckInEditResult.saved,
        );
      }
    });
    return PopScope(
      canPop: !state.pending && !_dirty,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || state.pending) return;
        if (await _confirm(
              'Discard changes?',
              'Your unsaved changes will be lost.',
              'Discard',
            ) &&
            context.mounted) {
          setState(() {
            _note.text = _current.note;
            _mood = _current.mood;
            _activity = _current.activity;
            _locationLabel = _current.locationLabel;
            _visibility =
                _current.checkInVisibility ?? CheckInVisibility.private;
          });
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) Navigator.pop(context);
          });
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Edit Check-in')),
        body: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 8,
                  children: [
                    for (final mood in [
                      'Happy',
                      'Calm',
                      'Focused',
                      'Tired',
                      'Stressed',
                      'Not sure',
                      if (_mood != null &&
                          ![
                            'Happy',
                            'Calm',
                            'Focused',
                            'Tired',
                            'Stressed',
                            'Not sure',
                          ].contains(_mood))
                        _mood!,
                    ])
                      ChoiceChip(
                        label: Text(mood),
                        selected: _mood == mood,
                        onSelected: state.pending
                            ? null
                            : (selected) => setState(
                                () => _mood = selected ? mood : null,
                              ),
                      ),
                  ],
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final activity in [
                      'Study',
                      'Fitness',
                      'Social',
                      'Food',
                      'Travel',
                      if (_activity != null &&
                          ![
                            'Study',
                            'Fitness',
                            'Social',
                            'Food',
                            'Travel',
                          ].contains(_activity))
                        _activity!,
                    ])
                      FilterChip(
                        label: Text(activity),
                        selected: _activity == activity,
                        onSelected: state.pending
                            ? null
                            : (selected) => setState(
                                () => _activity = selected ? activity : null,
                              ),
                      ),
                  ],
                ),
                TextField(
                  key: const Key('check-in-edit-note'),
                  controller: _note,
                  enabled: !state.pending,
                  maxLines: 5,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'Note',
                    helperText: 'Up to 500 characters',
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: ValueKey('edit-place-${_current.revision}'),
                  initialValue: _locationLabel,
                  enabled: !state.pending,
                  maxLength: 50,
                  decoration: const InputDecoration(
                    labelText: 'Place name',
                    helperText: 'A label only; GPS stays separate.',
                  ),
                  onChanged: (v) => setState(
                    () => _locationLabel = v.trim().isEmpty ? null : v.trim(),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<CheckInVisibility>(
                  key: ValueKey(
                    'check-in-edit-visibility-${_current.revision}',
                  ),
                  initialValue: _visibility,
                  decoration: const InputDecoration(labelText: 'Visibility'),
                  items: const [
                    DropdownMenuItem(
                      value: CheckInVisibility.private,
                      child: Text('Private'),
                    ),
                    DropdownMenuItem(
                      value: CheckInVisibility.friendsOnly,
                      child: Text('Friends-only'),
                    ),
                    DropdownMenuItem(
                      value: CheckInVisibility.public,
                      child: Text('Public'),
                    ),
                  ],
                  onChanged: state.pending
                      ? null
                      : (value) => setState(() => _visibility = value!),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Editing this record keeps its original date and weather.',
                ),
                if (state.failure case final failure?) ...[
                  const SizedBox(height: 16),
                  Text(switch (failure.kind) {
                    AppFailureKind.checkInRevisionPreconditionFailed => 'This record changed. Your draft is still here. Reload before saving.',
                    AppFailureKind.checkInInvalid => 'Add a Note or Mood; Notes can contain up to 500 characters.',
                    AppFailureKind.checkInUnavailable =>
                      'This Check-in is no longer available.',
                    _ => 'The result could not be confirmed. Reload before trying again.',
                  }, key: const Key('check-in-edit-error')),
                  OutlinedButton(
                    onPressed: state.pending
                        ? null
                        : () async {
                            if (_dirty &&
                                !await _confirm(
                                  'Reload Check-in?',
                                  'Replace your draft with the latest saved record?',
                                  'Reload',
                                )) {
                              return;
                            }
                            final latest = await controller.reload(
                              _current.checkInId,
                            );
                            if (latest != null && mounted) {
                              setState(() {
                                _current = latest;
                                _mood = latest.mood;
                                _activity = latest.activity;
                                _locationLabel = latest.locationLabel;
                                _note.text = latest.note;
                                _visibility =
                                    latest.checkInVisibility ??
                                    CheckInVisibility.private;
                              });
                            }
                          },
                    child: const Text('Reload saved record'),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  key: const Key('check-in-edit-save'),
                  onPressed: state.pending || mustReload
                      ? null
                      : () => controller.save(
                          _current,
                          _note.text,
                          _visibility,
                          mood: _mood,
                          activity: _activity,
                          locationLabel: _locationLabel,
                        ),
                  child: Text(state.pending ? 'Saving…' : 'Save changes'),
                ),
                const SizedBox(height: 12),
                TextButton.icon(
                  key: const Key('check-in-edit-delete'),
                  onPressed: state.pending || mustReload
                      ? null
                      : () async {
                          if (await _confirm(
                                'Delete Check-in?',
                                'This removes this record from your history and shared views.',
                                'Delete',
                              ) &&
                              mounted) {
                            await controller.remove(_current);
                          }
                        },
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete Check-in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
