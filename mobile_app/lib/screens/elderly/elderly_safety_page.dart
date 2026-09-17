import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';
import 'elderly_widgets.dart';

class ElderlySafetyPage extends StatelessWidget {
  const ElderlySafetyPage({super.key});
  @override
  Widget build(BuildContext context) => CarePage(
    children: [
      Text(
        'Help when you need it',
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 8),
      const Text('Keep your trusted contacts close.'),
      const SizedBox(height: 24),
      Center(
        child: SizedBox.square(
          dimension: 240,
          child: FilledButton(
            key: const ValueKey('safety-emergency'),
            style: FilledButton.styleFrom(
              backgroundColor: careRed,
              padding: const EdgeInsets.all(24),
              shape: const CircleBorder(),
            ),
            onPressed: () => showEmergencyPreview(context),
            child: const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.sos_rounded, size: 70),
                SizedBox(height: 8),
                Text(
                  'HELP',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      const Text(
        'Press SOS, then confirm your request.',
        textAlign: TextAlign.center,
      ),
      const SectionTitle('Emergency Contacts'),
      for (final contact in ElderlyDemoData.contacts)
        ContactCard(contact: contact),
      const CareCard(
        color: Color(0xFFFFF0E8),
        child: Text(
          'Preview mode: SOS and call buttons demonstrate the screens only. No alerts or calls are sent.',
        ),
      ),
    ],
  );
}
