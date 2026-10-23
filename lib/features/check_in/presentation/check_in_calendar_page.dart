import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../check_in_providers.dart';
import '../domain/check_in_calendar_repository.dart';
import '../domain/check_in_repository.dart';

typedef MonthQuery = ({String month, String zone});
final checkInMonthProvider = FutureProvider.autoDispose
    .family<Result<CheckInMonth>, MonthQuery>((ref, query) async {
      ref.watch(authSessionProvider);
      final access = ref.watch(contentAccessProvider);
      if (!access.foreground) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Return to reload current access.',
          ),
        );
      }
      final repository = ref.watch(checkInRepositoryProvider);
      if (repository is! CheckInCalendarRepository) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.configurationUnavailable,
            message: 'Calendar is unavailable.',
          ),
        );
      }
      return (repository as CheckInCalendarRepository).readMonth(
        month: query.month,
        timeZone: query.zone,
      );
    });
typedef DayQuery = ({String date, String zone, String? cursor});
final calendarDayProvider = FutureProvider.autoDispose
    .family<Result<CheckInHistoryPage>, DayQuery>((ref, query) {
      ref.watch(authSessionProvider);
      final access = ref.watch(contentAccessProvider);
      if (!access.foreground) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Return to reload current access.',
          ),
        );
      }
      return ref
          .watch(checkInRepositoryProvider)
          .readOwnForDate(
            date: query.date,
            timeZone: query.zone,
            cursor: query.cursor,
          );
    });

final class CalendarSelection {
  const CalendarSelection(this.date, [this.checkInId]);
  final DateTime date;
  final String? checkInId;
}

final class CheckInCalendarPage extends ConsumerStatefulWidget {
  const CheckInCalendarPage({
    required this.initialDate,
    required this.latestDate,
    required this.timeZone,
    super.key,
  });
  final DateTime initialDate, latestDate;
  final String timeZone;
  @override
  ConsumerState<CheckInCalendarPage> createState() =>
      _CheckInCalendarPageState();
}

class _CheckInCalendarPageState extends ConsumerState<CheckInCalendarPage> {
  late DateTime _month, _selected;
  String? _cursor;
  @override
  void initState() {
    super.initState();
    _month = DateTime.utc(widget.initialDate.year, widget.initialDate.month);
    _selected = widget.initialDate;
  }

  String _date(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  void _move(int delta) {
    setState(() {
      _month = DateTime.utc(_month.year, _month.month + delta);
      _selected = _month;
      _cursor = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final monthText = _date(_month).substring(0, 7),
        monthQuery = (month: monthText, zone: widget.timeZone);
    final counts = ref.watch(checkInMonthProvider(monthQuery));
    final dayQuery = (
      date: _date(_selected),
      zone: widget.timeZone,
      cursor: _cursor,
    );
    final day = ref.watch(calendarDayProvider(dayQuery));
    final numberOfDays = DateTime.utc(_month.year, _month.month + 1, 0).day;
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Check-in calendar', '签到日历')),
        actions: [
          IconButton(
            tooltip: context.tr('Reload calendar', '重新加载日历'),
            onPressed: () {
              ref.invalidate(checkInMonthProvider(monthQuery));
              ref.invalidate(calendarDayProvider(dayQuery));
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  key: const Key('calendar-previous-month'),
                  tooltip: context.tr('Previous month', '上个月'),
                  onPressed: _month.year == 1 && _month.month == 1
                      ? null
                      : () => _move(-1),
                  icon: const Icon(Icons.chevron_left),
                ),
                Flexible(
                  child: Text(
                    monthText,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  key: const Key('calendar-next-month'),
                  tooltip: context.tr('Next month', '下个月'),
                  onPressed:
                      !_month.isBefore(
                        DateTime.utc(
                          widget.latestDate.year,
                          widget.latestDate.month,
                        ),
                      )
                      ? null
                      : () => _move(1),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            Text(
              context.tr(
                'Choose a day to read its records. Times use ${widget.timeZone}.',
                '选择日期阅读记录。时区：${widget.timeZone}。',
              ),
            ),
            if (counts.isLoading)
              LinearProgressIndicator()
            else if (counts.value case Success<CheckInMonth>(:final value)) ...[
              Row(
                children: [
                  for (final label
                      in (context.usesChinese
                          ? ['一', '二', '三', '四', '五', '六', '日']
                          : ['M', 'T', 'W', 'T', 'F', 'S', 'S']))
                    Expanded(child: Center(child: Text(label))),
                ],
              ),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 7,
                mainAxisExtent:
                    24 + 32 * MediaQuery.textScalerOf(context).scale(1),
                children: [
                  for (var blank = 1; blank < _month.weekday; blank++)
                    const SizedBox.shrink(),
                  for (var day = 1; day <= numberOfDays; day++)
                    Builder(
                      builder: (context) {
                        final date = DateTime.utc(
                              _month.year,
                              _month.month,
                              day,
                            ),
                            count =
                                value.counts[_date(
                                  DateTime.utc(_month.year, _month.month, day),
                                )] ??
                                0;
                        final selected = _date(date) == _date(_selected);
                        return Semantics(
                          label: context.tr(
                            '${_date(date)}, $count Check-ins',
                            '${_date(date)}，$count 条签到',
                          ),
                          selected: selected,
                          button: true,
                          enabled: !date.isAfter(widget.latestDate),
                          child: Padding(
                            padding: const EdgeInsets.all(.5),
                            child: Material(
                              color: selected
                                  ? Theme.of(context)
                                        .colorScheme
                                        .primaryContainer
                                  : count == 0
                                  ? Theme.of(context).colorScheme.surface
                                  : Theme.of(context).colorScheme.primary
                                        .withValues(
                                          alpha: count < 2
                                              ? 0.15
                                              : count < 4
                                              ? 0.3
                                              : 0.5,
                                        ),
                              borderRadius: BorderRadius.circular(10),
                              child: InkWell(
                                key: Key('calendar-day-$day'),
                                borderRadius: BorderRadius.circular(10),
                                onTap: date.isAfter(widget.latestDate)
                                    ? null
                                    : () => setState(() {
                                        _selected = date;
                                        _cursor = null;
                                      }),
                                child: Center(
                                  child: Text(
                                    '$day\n$count',
                                    textAlign: TextAlign.center,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ] else
              TextButton(
                onPressed: () =>
                    ref.invalidate(checkInMonthProvider(monthQuery)),
                child: Text(
                  context.tr('Calendar unavailable. Retry', '日历暂时不可用，重试'),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              _date(_selected),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            TextButton(
              onPressed: () =>
                  Navigator.pop(context, CalendarSelection(_selected)),
              child: Text(
                context.tr('Read this date in History', '在历史中阅读当天记录'),
              ),
            ),
            if (day.isLoading)
              Center(child: CircularProgressIndicator())
            else if (day.value case Success<CheckInHistoryPage>(
              :final value,
            )) ...[
              if (value.checkIns.isEmpty)
                Text(context.tr('No Check-ins for this date.', '当天没有签到。')),
              for (final entry in value.checkIns)
                ListTile(
                  key: Key('calendar-record-${entry.checkInId}'),
                  title: Text(
                    entry.note.isEmpty ? entry.mood ?? '' : entry.note,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: entry.mood == null ? null : Text(entry.mood!),
                  trailing: const Icon(Icons.arrow_forward),
                  onTap: () => Navigator.pop(
                    context,
                    CalendarSelection(_selected, entry.checkInId),
                  ),
                ),
              if (value.nextCursor != null)
                TextButton(
                  onPressed: () => setState(() => _cursor = value.nextCursor),
                  child: Text(context.tr('Next records', '下一页记录')),
                ),
            ] else
              TextButton(
                onPressed: () => ref.invalidate(calendarDayProvider(dayQuery)),
                child: Text(
                  context.tr('Records unavailable. Retry', '记录暂时不可用，重试'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
