import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';
import 'elderly_widgets.dart';

/// Called by the shell when a demo activity event arrives.
/// Later, call the same function from a real activity notification listener.
Future<bool?> showNewActivityDialog(
    BuildContext context,
    CareActivity activity,
    ) => showDialog<bool>(
  context: context,
  barrierDismissible: false,
  builder: (context) => AlertDialog(
    backgroundColor: careCream,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
    icon: const CircleAvatar(
      radius: 34,
      backgroundColor: Color(0xFFDDEECC),
      child: Icon(Icons.event_available_rounded, size: 36, color: careGreen),
    ),
    title: Text('New Activity\n${activity.title}', textAlign: TextAlign.center),
    scrollable: true,
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          activity.time,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        Text(activity.description, textAlign: TextAlign.center),
        const SizedBox(height: 20),
        const Text(
          'Would you like to join this event?',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
        ),
      ],
    ),
    actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
    actions: [
      SizedBox(
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton.icon(
              key: const ValueKey('join-invitation'),
              onPressed: () => Navigator.pop(context, true),
              icon: const Icon(Icons.check_rounded),
              label: const Text('Yes, join activity'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              key: const ValueKey('decline-invitation'),
              onPressed: () => Navigator.pop(context, false),
              child: const Text('No, not now'),
            ),
          ],
        ),
      ),
    ],
  ),
);
