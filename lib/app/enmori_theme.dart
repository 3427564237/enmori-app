import 'package:flutter/material.dart';

/// Shared by the app and controlled preview. Feature pages inherit these tokens.
ThemeData enmoriTheme() {
  const green = Color(0xff244b3f);
  const paper = Color(0xfffaf9f5);
  final scheme = ColorScheme.fromSeed(seedColor: green, surface: paper)
      .copyWith(
        primary: green,
        onPrimary: Colors.white,
        primaryContainer: const Color(0xffe4eee4),
        onPrimaryContainer: const Color(0xff203b32),
        onSurface: const Color(0xff203b32),
        onSurfaceVariant: const Color(0xff58665f),
        outline: const Color(0xff75837b),
        outlineVariant: const Color(0xffd7ded5),
      );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme);
  TextStyle? heading(TextStyle? style) => style?.copyWith(
    fontFamily: 'Playfair Display',
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
  );
  final text = base.textTheme.copyWith(
    displayLarge: heading(base.textTheme.displayLarge),
    displayMedium: heading(base.textTheme.displayMedium),
    displaySmall: heading(base.textTheme.displaySmall),
    headlineLarge: heading(base.textTheme.headlineLarge),
    headlineMedium: heading(base.textTheme.headlineMedium),
    headlineSmall: heading(base.textTheme.headlineSmall),
    titleLarge: heading(base.textTheme.titleLarge),
  );
  final buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(14),
  );
  final inputBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide(color: scheme.outline),
  );
  return base.copyWith(
    scaffoldBackgroundColor: paper,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: paper,
      foregroundColor: scheme.onSurface,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: text.titleLarge,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: inputBorder,
      enabledBorder: inputBorder,
      focusedBorder: inputBorder.copyWith(
        borderSide: const BorderSide(color: green, width: 2),
      ),
      errorBorder: inputBorder.copyWith(
        borderSide: BorderSide(color: scheme.error),
      ),
      focusedErrorBorder: inputBorder.copyWith(
        borderSide: BorderSide(color: scheme.error, width: 2),
      ),
      prefixIconColor: scheme.onSurfaceVariant,
      helperMaxLines: 3,
      errorMaxLines: 3,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: buttonShape,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: buttonShape,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: buttonShape,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(48, 48),
        shape: buttonShape,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: scheme.primaryContainer,
      surfaceTintColor: Colors.transparent,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: paper,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: paper,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      titleTextStyle: text.headlineSmall,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: green,
      contentTextStyle: text.bodyMedium?.copyWith(color: Colors.white),
      actionTextColor: const Color(0xffc6e6cc),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant),
  );
}
