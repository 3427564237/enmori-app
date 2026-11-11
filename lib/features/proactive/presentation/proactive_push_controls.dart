import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../domain/proactive_messaging.dart';
import '../proactive_notification_controller.dart';

/// Inserted by explicit composition. With a null installation all controls stay
/// unavailable and the controller never opens the SDK or obtains a token.
class ProactivePushControls extends ConsumerWidget {
  const ProactivePushControls({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(proactiveNotificationControllerProvider);
    final controller = ref.read(
      proactiveNotificationControllerProvider.notifier,
    );
    final otherInstallation =
        state.registration?.enabled == true &&
        state.registration?.installationRef !=
            ref.watch(proactiveMessagingInstallationRefProvider);
    final active = state.configured && state.authenticated && !state.busy;
    final expiry = state.configured && state.authenticated && !state.unconfirmed
        ? state.registration?.expiresAt
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('System notifications', '系统通知'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (!state.configured)
          Text(
            context.tr(
              'System notifications are not configured for this installation. Check follow-ups in the app.',
              '本次安装尚未配置系统通知，请在 App 内查看跟进。',
            ),
          )
        else if (!state.authenticated)
          Text(
            context.tr('Sign in to check notification access.', '登录后核对通知权限。'),
          )
        else if (state.unconfirmed)
          Text(
            context.tr(
              'Notification changes are unconfirmed. Read current status before continuing.',
              '通知设置结果尚未确认，请先核对当前状态。',
            ),
          )
        else if (state.permission == ProactiveNotificationPermission.denied)
          Text(
            context.tr(
              'Notification permission is off. Follow-ups remain available in the app.',
              '系统通知权限未开启，仍可在 App 内查看跟进。',
            ),
          )
        else if (state.registration?.availability ==
            ProactiveRegistrationAvailability.expired)
          Text(
            context.tr(
              'This notification registration has expired. Follow-ups remain in the app.',
              '本次通知登记已过期，仍可在 App 内查看跟进。',
            ),
          )
        else if (otherInstallation)
          Text(
            context.tr(
              'Notifications are registered on another installation. Enabling here replaces that registration.',
              '通知已登记在另一台设备或旧安装上。在此启用将替换那次登记。',
            ),
          )
        else if (state.registration?.enabled == true)
          Text(
            context.tr(
              'Notification registration is active. Delivery is not guaranteed.',
              '通知登记有效，送达仍无法保证。',
            ),
          )
        else
          Text(
            context.tr(
              'System notifications are off or have not been checked.',
              '系统通知已关闭或尚未核对。',
            ),
          ),
        if (expiry != null)
          Text(
            context.tr(
              'Registration expiry: ${localTimeLabel(context, expiry)} (local time)',
              '登记到期时间：${localTimeLabel(context, expiry)}（本地时间）',
            ),
          ),
        if (state.busy)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          ),
        if (state.failure != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(localizedFailure(context, state.failure!)),
          ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton(
              onPressed: active ? controller.readRegistration : null,
              child: Text(context.tr('Check notification status', '核对通知状态')),
            ),
            FilledButton(
              onPressed: active && !state.unconfirmed
                  ? controller.enablePush
                  : null,
              child: Text(context.tr('Enable system notifications', '启用系统通知')),
            ),
            OutlinedButton(
              onPressed: active && !state.unconfirmed && !otherInstallation
                  ? controller.disablePush
                  : null,
              child: Text(context.tr('Disable system notifications', '关闭系统通知')),
            ),
            if (state.hasPendingDelivery)
              OutlinedButton(
                onPressed: active && !state.resolvingDelivery
                    ? () => controller.openPendingDelivery()
                    : null,
                child: Text(context.tr('Open notification', '查看通知')),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          context.tr(
            'Permission, an enabled channel and registration are required. A received or opened notification is not marked read.',
            '通知需要系统权限、已开启的通知频道及登记。收到或点击通知不会标记消息已读。',
          ),
        ),
      ],
    );
  }
}
