import 'package:flutter/material.dart';
import 'family_demo_data.dart';
import 'family_widgets.dart';
import 'family_location_map.dart';

class FamilySettingsPage extends StatelessWidget {
  const FamilySettingsPage({
    super.key,
    required this.data,
    required this.onLogout,
  });
  final FamilyDemoData data;
  final VoidCallback onLogout;

  Future<void> _addContact(BuildContext context) async {
    final resident = data.selected;
    final values = await familyForm(context, 'Add emergency contact', const [
      FamilyField('Name'),
      FamilyField('Relationship'),
      FamilyField('Phone', keyboard: TextInputType.phone),
    ]);
    if (values != null && context.mounted)
      data.addContact(resident, FamilyContact(values[0], values[1], values[2]));
  }

  Future<void> _addPhrase(BuildContext context) async {
    final resident = data.selected;
    final values = await familyForm(context, 'Add voice phrase', const [
      FamilyField('Phrase'),
    ]);
    if (values != null && context.mounted) {
      final added = data.addPhrase(resident, values[0]);
      familyMessage(
        context,
        added
            ? 'Sample phrase saved. Voice recognition is not connected.'
            : 'This phrase already exists.',
      );
    }
  }

  Future<void> _addReminder(BuildContext context) async {
    final resident = data.selected;
    final values = await familyForm(context, 'Add reminder', [
      const FamilyField('Reminder title'),
      FamilyField(
        'Time (24-hour HH:mm)',
        initial: '18:00',
        keyboard: TextInputType.datetime,
        validate: (value) =>
            RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(value)
            ? null
            : 'Use a time such as 08:30 or 18:00.',
      ),
    ]);
    if (values != null && context.mounted) {
      data.addReminder(resident, FamilyReminder(values[0], values[1]));
      familyMessage(
        context,
        'Reminder saved for this demo. No notification is scheduled.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final resident = data.selected;
    return FamilyPage(
      children: [
        Text(
          'Care preferences',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 6),
        Text('Settings for ${resident.name}'),
        const FamilySection('Emergency Contacts'),
        const Text('Choose the trusted people to contact for help.'),
        const SizedBox(height: 12),
        for (final contact in resident.contacts)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FamilyCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    contact.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(contact.relationship),
                  Text(contact.phone),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () async {
                        if (await familyConfirm(
                              context,
                              'Remove contact?',
                              'Remove ${contact.name} from ${resident.name}’s demo contacts?',
                            ) &&
                            context.mounted) {
                          data.removeContact(resident, contact);
                        }
                      },
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Remove'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (resident.contacts.isEmpty)
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text('No emergency contacts yet.'),
          ),
        OutlinedButton.icon(
          key: const ValueKey('add-contact'),
          onPressed: () => _addContact(context),
          icon: const Icon(Icons.person_add_alt),
          label: const Text('Add New Contact'),
        ),
        const FamilySection('Safe Zone Management'),
        FamilyCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Set a sample boundary around the residence.'),
              const SizedBox(height: 12),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                key: const ValueKey('safe-alerts'),
                title: const Text('Enable Alerts'),
                subtitle: const Text('Demo preference only'),
                value: resident.alertsEnabled,
                onChanged: (value) => data.setAlerts(resident, value),
              ),
              const SizedBox(height: 12),
              Text(
                'Centre: ${resident.zoneLatitude.toStringAsFixed(5)}, ${resident.zoneLongitude.toStringAsFixed(5)}',
              ),
              Text(
                'Radius: ${resident.radius.round()} m',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                key: const ValueKey('edit-safe-zone'),
                onPressed: () async {
                  final result = await Navigator.of(context)
                      .push<SafeZoneDraft>(
                        MaterialPageRoute(
                          builder: (_) => FamilyLocationMap(
                            resident: resident,
                            editable: true,
                          ),
                        ),
                      );
                  if (result != null && context.mounted) {
                    data.setSafeZone(
                      resident,
                      result.latitude,
                      result.longitude,
                      result.radius,
                    );
                    familyMessage(
                      context,
                      'Safe zone saved for this demo session only.',
                    );
                  }
                },
                icon: const Icon(Icons.edit_location_alt_outlined),
                label: const Text('Edit on map'),
              ),
              const SizedBox(height: 12),
              const Text(
                'Location monitoring and boundary alerts will be connected later.',
              ),
            ],
          ),
        ),
        const FamilySection('Voice Commands'),
        FamilyCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Sample phrases for this resident. Voice detection is not active.',
              ),
              const SizedBox(height: 12),
              for (final phrase in resident.phrases)
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '“$phrase”',
                        style: const TextStyle(fontSize: 17),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Remove phrase $phrase',
                      onPressed: () => data.removePhrase(resident, phrase),
                      icon: const Icon(Icons.close, size: 20),
                    ),
                  ],
                ),
              if (resident.phrases.isEmpty) const Text('No phrases yet.'),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _addPhrase(context),
                icon: const Icon(Icons.add),
                label: const Text('Add Phrase'),
              ),
            ],
          ),
        ),
        const FamilySection('Reminders'),
        FamilyCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text('Voice Reminders'),
                subtitle: const Text('Demo preference only'),
                value: resident.voiceReminders,
                onChanged: (value) => data.setVoiceReminders(resident, value),
              ),
              const Divider(height: 24),
              Text(
                'Medication Schedules',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text(
                'Sample reminders, including medication and daily activities.',
              ),
              for (final reminder in resident.reminders)
                Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        reminder.time,
                        style: const TextStyle(
                          color: familyGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(reminder.title),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () async {
                            if (await familyConfirm(
                                  context,
                                  'Remove reminder?',
                                  reminder.title,
                                ) &&
                                context.mounted) {
                              data.removeReminder(resident, reminder);
                            }
                          },
                          child: const Text('Remove reminder'),
                        ),
                      ),
                    ],
                  ),
                ),
              if (resident.reminders.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('No reminders yet.'),
                ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _addReminder(context),
                icon: const Icon(Icons.add_alarm),
                label: const Text('Add reminder'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        OutlinedButton.icon(
          key: const ValueKey('family-logout'),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFB3262D),
          ),
          onPressed: () async {
            if (await familyConfirm(
                  context,
                  'Log out?',
                  'Your demo changes will be reset.',
                  action: 'Log Out',
                ) &&
                context.mounted)
              onLogout();
          },
          icon: const Icon(Icons.logout),
          label: const Text('Log Out'),
        ),
      ],
    );
  }
}
