import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('redirectFor', () {
    test('keeps resolving traffic on the startup boundary', () {
      expect(
        redirectFor(gate: RouterGateState.resolving, location: AppRoutes.home),
        AppRoutes.startup,
      );
      expect(
        redirectFor(
          gate: RouterGateState.resolving,
          location: AppRoutes.startup,
        ),
        isNull,
      );
    });

    test('routes unauthenticated and incomplete members separately', () {
      expect(
        redirectFor(
          gate: RouterGateState.unauthenticated,
          location: AppRoutes.home,
        ),
        AppRoutes.register,
      );
      expect(
        redirectFor(
          gate: RouterGateState.onboardingRequired,
          location: AppRoutes.home,
        ),
        AppRoutes.onboarding,
      );
    });

    test('authenticated members keep product routes without loops', () {
      expect(
        redirectFor(
          gate: RouterGateState.authenticated,
          location: AppRoutes.checkIn,
        ),
        isNull,
      );
      expect(
        redirectFor(
          gate: RouterGateState.authenticated,
          location: AppRoutes.onboarding,
        ),
        AppRoutes.home,
      );
    });

    test('fails closed on the unavailable boundary', () {
      expect(
        redirectFor(
          gate: RouterGateState.unavailable,
          location: AppRoutes.home,
        ),
        AppRoutes.unavailable,
      );
    });
  });
}
