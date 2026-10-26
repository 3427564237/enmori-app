import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../content_access.dart';
import '../domain/own_avatar.dart';
import '../own_avatar_providers.dart';
import 'own_avatar_editor.dart';

final class OwnAvatarButton extends ConsumerWidget {
  const OwnAvatarButton({required this.initial, this.size = 56, super.key});
  final String initial;
  final double size;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider).asData?.value;
    final photo = switch (ref.watch(ownAvatarProvider)) {
      AsyncData<Result<OwnAvatar>>(value: Success<OwnAvatar>(:final value)) =>
        value.photo,
      _ => null,
    };
    return Semantics(
      button: true,
      label: context.tr('Change my photo', '更换我的照片'),
      child: Tooltip(
        message: context.tr('Change my photo', '更换我的照片'),
        child: InkWell(
          key: const Key('own-avatar-edit'),
          customBorder: const CircleBorder(),
          onTap: () async {
            if (!identical(
                  session,
                  ref.read(authSessionProvider).asData?.value,
                ) ||
                ref.read(currentAuthSubjectProvider) == null ||
                !ref.read(contentAccessProvider).foreground ||
                ModalRoute.of(context)?.isCurrent != true) {
              return;
            }
            await Navigator.of(context).push<void>(
              MaterialPageRoute(builder: (_) => const OwnAvatarEditor()),
            );
            if (context.mounted) ref.invalidate(ownAvatarProvider);
          },
          child: AvatarPixels(photo: photo, initial: initial, size: size),
        ),
      ),
    );
  }
}

/// A local decoded image, disposed with this view; no shared ImageCache entry.
final class AvatarPixels extends StatefulWidget {
  const AvatarPixels({
    required this.photo,
    required this.initial,
    required this.size,
    super.key,
  });
  final AvatarPhoto? photo;
  final String initial;
  final double size;
  @override
  State<AvatarPixels> createState() => _AvatarPixelsState();
}

final class _AvatarPixelsState extends State<AvatarPixels> {
  ui.Image? _image;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _decode();
  }

  @override
  void didUpdateWidget(AvatarPixels oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.photo, widget.photo)) _decode();
  }

  Future<void> _decode() async {
    final epoch = ++_generation;
    _image?.dispose();
    _image = null;
    final photo = widget.photo;
    if (photo == null) return;
    ui.Codec? codec;
    try {
      codec = await ui.instantiateImageCodec(photo.bytes);
      final image = (await codec.getNextFrame()).image;
      if (!mounted || epoch != _generation) {
        image.dispose();
        return;
      }
      setState(() => _image = image);
    } catch (_) {
      /* Initial remains available if decoding fails. */
    } finally {
      codec?.dispose();
    }
  }

  @override
  void dispose() {
    _generation++;
    _image?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: widget.size,
    child: ClipOval(
      child: _image == null
          ? ColoredBox(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Center(
                child: Text(
                  widget.initial,
                  style: TextStyle(fontSize: widget.size * .4),
                ),
              ),
            )
          : RawImage(image: _image, fit: BoxFit.cover),
    ),
  );
}
