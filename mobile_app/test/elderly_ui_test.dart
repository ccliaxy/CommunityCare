import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/screens/elderly/elderly_demo_data.dart';
import 'package:mobile_app/screens/elderly/elderly_shell.dart';

Future<void> openPreview(
    WidgetTester tester, {
      double width = 390,
      double scale = 1,
    }) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: const ElderlyShell(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  test('joining is idempotent and declining does not register', () {
    final data = ElderlyDemoData();
    addTearDown(data.dispose);
    data.dismissInvitation();
    expect(data.isJoined(ElderlyDemoData.healthTalk), false);
    data.join(ElderlyDemoData.healthTalk);
    data.join(ElderlyDemoData.healthTalk);
    expect(
      data.joinedActivities
          .where((activity) => activity.id == 'health-talk')
          .length,
      1,
    );
    expect(data.hasNewActivity, false);
  });

  testWidgets('invitation joins and updates the home and activity tabs', (
      tester,
      ) async {
    await openPreview(tester);
    await tester.tap(find.byKey(const ValueKey('join-invitation')));
    await tester.pumpAndSettle();
    expect(find.text('Health Talk'), findsOneWidget);
    await tester.tap(find.widgetWithText(NavigationDestination, 'Activity'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('join-health-talk')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('decline, switch tabs, then simulate a new event', (
      tester,
      ) async {
    await openPreview(tester);
    await tester.tap(find.byKey(const ValueKey('decline-invitation')));
    await tester.pumpAndSettle();
    for (final label in ['Safety', 'Activity', 'Profile', 'Home']) {
      await tester.tap(find.widgetWithText(NavigationDestination, label));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
      expect(tester.takeException(), isNull);
    }
    await tester.tap(find.byKey(const ValueKey('demo-event')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('join-invitation')), findsOneWidget);
  });

  testWidgets('daily check-in survives tab changes', (tester) async {
    await openPreview(tester);
    await tester.tap(find.byKey(const ValueKey('decline-invitation')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('check-in')));
    await tester.tap(find.byKey(const ValueKey('check-in')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Feeling good'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Safety'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Home'));
    await tester.pumpAndSettle();
    expect(find.text('Today: Feeling good'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('SOS opens confirmation and cancel closes it', (tester) async {
    await openPreview(tester);
    await tester.tap(find.byKey(const ValueKey('decline-invitation')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('home-emergency')));
    await tester.pumpAndSettle();
    expect(find.text('Request emergency help?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
  });

  for (final width in [320.0, 390.0, 600.0]) {
    for (final scale in [1.0, 1.6, 2.0]) {
      testWidgets('no overflow at width $width and text scale $scale', (
          tester,
          ) async {
        await openPreview(tester, width: width, scale: scale);
        expect(tester.takeException(), isNull);
        await tester.tap(find.byKey(const ValueKey('decline-invitation')));
        await tester.pumpAndSettle();
        for (final label in ['Home', 'Safety', 'Activity', 'Profile']) {
          await tester.tap(find.widgetWithText(NavigationDestination, label));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        }
      });
    }
  }
}
