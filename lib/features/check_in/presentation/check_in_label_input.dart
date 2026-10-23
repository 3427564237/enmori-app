import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';

const checkInMoodChoices = [
  'Happy',
  'Calm',
  'Focused',
  'Tired',
  'Stressed',
  'Not sure',
];
const checkInActivityChoices = ['Study', 'Fitness', 'Social', 'Food', 'Travel'];

/// Null means dismissed; an empty result explicitly clears the personal label.
Future<String?> chooseCheckInLabel(
  BuildContext context, {
  required String title,
  required String? current,
  required List<String> choices,
}) async {
  FocusScope.of(context).unfocus();
  var input = current ?? '';
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    sheetAnimationStyle: EnmoriMotion.surface(context),
    builder: (context) => SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              checkInLabelTitle(context, title),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (title == 'Place name')
              Text(
                context.tr(
                  'A display label only. It does not add or change GPS or weather.',
                  '仅作为地点名称，不会添加或改变 GPS 位置与天气。',
                ),
              ),
            if (title == 'Activity')
              Text(
                context.tr(
                  'A personal label, separate from an official event.',
                  '个人标签，与正式活动无关。',
                ),
              ),
            if (choices.isNotEmpty)
              Wrap(
                spacing: 8,
                children: [
                  for (final choice in choices)
                    ActionChip(
                      chipAnimationStyle: EnmoriMotion.chips(context),
                      label: Text(checkInPresetLabel(context, choice)),
                      onPressed: () => Navigator.pop(
                        context,
                        checkInPresetLabel(context, choice),
                      ),
                    ),
                ],
              ),
            const SizedBox(height: 12),
            TextFormField(
              initialValue: input,
              onChanged: (value) => input = value,
              maxLength: 50,
              decoration: InputDecoration(
                labelText: context.tr(
                  'Custom $title',
                  '自定义${checkInLabelTitle(context, title)}',
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => Navigator.pop(context, input.trim()),
              child: Text(context.tr('Apply', '应用')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, ''),
              child: Text(context.tr('Clear', '清除')),
            ),
          ],
        ),
      ),
    ),
  );
}

final class CheckInLabelChip extends StatelessWidget {
  const CheckInLabelChip({
    required this.label,
    required this.avatar,
    required this.selected,
    required this.onPressed,
    super.key,
  });
  final String label;
  final Widget avatar;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => MotionSize(
    alignment: Alignment.centerLeft,
    child: AnimatedContainer(
      duration: EnmoriMotion.duration(context, EnmoriMotion.feedback),
      curve: EnmoriMotion.settle,
      decoration: ShapeDecoration(
        shape: const StadiumBorder(),
        color: selected
            ? Theme.of(context).colorScheme.primaryContainer
            : Colors.transparent,
      ),
      child: ActionChip(
        chipAnimationStyle: EnmoriMotion.chips(context),
        backgroundColor: Colors.transparent,
        avatar: avatar,
        label: MotionReveal(trigger: label, distance: 0, child: Text(label)),
        onPressed: onPressed,
      ),
    ),
  );
}

String checkInLabelTitle(BuildContext context, String kind) => switch (kind) {
  'Mood' => context.tr('Mood', '心情'),
  'Activity' => context.tr('Activity', '活动标签'),
  'Place name' => context.tr('Place name', '地点名称'),
  _ => kind,
};

String checkInPresetLabel(BuildContext context, String value) =>
    switch (value) {
      'Happy' => context.tr('Happy', '开心'),
      'Calm' => context.tr('Calm', '平静'),
      'Focused' => context.tr('Focused', '专注'),
      'Tired' => context.tr('Tired', '疲惫'),
      'Stressed' => context.tr('Stressed', '有压力'),
      'Not sure' => context.tr('Not sure', '说不清'),
      'Study' => context.tr('Study', '学习'),
      'Fitness' => context.tr('Fitness', '运动'),
      'Social' => context.tr('Social', '社交'),
      'Food' => context.tr('Food', '美食'),
      'Travel' => context.tr('Travel', '旅行'),
      _ => value,
    };
