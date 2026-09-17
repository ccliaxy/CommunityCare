import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';
import 'elderly_widgets.dart';

class ElderlyProfilePage extends StatelessWidget {
  const ElderlyProfilePage({super.key, required this.onLogout});
  final VoidCallback onLogout;
  @override
  Widget build(BuildContext context) => CarePage(
    children: [
      CareCard(
        color: const Color(0xFFEAF2E1),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 44,
              backgroundColor: Colors.white,
              child: Icon(
                Icons.person_outline_rounded,
                color: careGreen,
                size: 54,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Tan Ah Beng',
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text('Unit A-12-3', style: TextStyle(fontSize: 20)),
            const SizedBox(height: 16),
            const Chip(
              avatar: Icon(Icons.water_drop_outlined, color: careRed),
              label: Text('Blood type: O+'),
            ),
            const SizedBox(height: 8),
            const Text('Sample resident profile', textAlign: TextAlign.center),
          ],
        ),
      ),
      const SectionTitle('Emergency Contacts'),
      for (final contact in ElderlyDemoData.contacts)
        ContactCard(contact: contact),
      const ContactCard(
        contact: CareContact('Ambulance', 'Emergency service', '999'),
      ),
      const SizedBox(height: 18),
      OutlinedButton.icon(
        key: const ValueKey('logout'),
        style: OutlinedButton.styleFrom(foregroundColor: careRed),
        onPressed: () async {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Leave the preview?'),
              scrollable: true,
              content: const Text(
                'Your demo check-in and activity selections will be reset.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Stay'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Logout'),
                ),
              ],
            ),
          );
          if (confirmed == true && context.mounted) onLogout();
        },
        icon: const Icon(Icons.logout_rounded),
        label: const Text('Logout'),
      ),
    ],
  );
}
