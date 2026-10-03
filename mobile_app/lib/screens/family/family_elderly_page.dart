import 'package:flutter/material.dart';
import 'family_demo_data.dart';
import 'family_widgets.dart';

class FamilyElderlyPage extends StatelessWidget {
  const FamilyElderlyPage({super.key, required this.data});
  final FamilyDemoData data;
  Future<void> _edit(BuildContext context) async {
    final resident = data.selected;
    final fields = await familyForm(context, 'Edit ${resident.name}', [
      FamilyField('Full name', initial: resident.name),
      FamilyField('Address', initial: resident.address),
      FamilyField(
        'Phone',
        initial: resident.phone,
        keyboard: TextInputType.phone,
      ),
      FamilyField(
        'Email',
        initial: resident.email,
        keyboard: TextInputType.emailAddress,
        validate: (value) =>
            RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)
            ? null
            : 'Enter a valid email address.',
      ),
    ]);
    if (fields != null && context.mounted) {
      data.updateProfile(resident, fields);
      familyMessage(context, 'Profile updated for this demo session.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final resident = data.selected;
    return FamilyPage(
      children: [
        FamilyCard(
          color: const Color(0xFFEAF2E1),
          child: Column(
            children: [
              FamilyAvatar(name: resident.name, radius: 42),
              const SizedBox(height: 14),
              Text(
                resident.name,
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(resident.details),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                key: const ValueKey('edit-profile'),
                onPressed: () => _edit(context),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Edit Profile'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        FamilyCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final item in [
                ('MEDICAL ID', '#${resident.id}'),
                ('ADDRESS', resident.address),
                ('PHONE', resident.phone),
                ('EMAIL', resident.email),
              ])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.$1,
                        style: const TextStyle(
                          fontSize: 12,
                          color: familyGreen,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        item.$2,
                        style: const TextStyle(fontSize: 17),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const FamilySection('Health Records'),
        if (resident.id != '12345')
          const FamilyCard(
            child: Text('No sample health records for this resident.'),
          )
        else
          for (final record in [
            (
              'General Checkup',
              'Oct 12, 2023',
              'Routine comprehensive examination completed. Sample record only.',
            ),
            (
              'Flu Shot',
              'Oct 5, 2023',
              'Annual seasonal influenza vaccination. Sample record only.',
            ),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FamilyCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Icon(
                        Icons.health_and_safety_outlined,
                        color: familyGreen,
                        size: 30,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      record.$1,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(record.$2),
                    const SizedBox(height: 10),
                    Text(record.$3),
                    TextButton(
                      onPressed: () => familyInfo(
                        context,
                        record.$1,
                        '${record.$2}\n\n${record.$3}',
                      ),
                      child: const Text('View record'),
                    ),
                  ],
                ),
              ),
            ),
        const FamilySection('Healthcare Contacts'),
        if (resident.id != '12345')
          const FamilyCard(
            child: Text('No healthcare contacts configured in this sample.'),
          )
        else
          for (final contact in [
            (
              'Dr. Sarah Jenkins',
              'PRIMARY PHYSICIAN',
              '555-0199',
              'dr.jenkins@clinic.com',
            ),
            (
              'Marcus Reed',
              'CARDIOLOGIST',
              '555-0245',
              'm.reed@heartcenter.com',
            ),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FamilyCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      contact.$1,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      contact.$2,
                      style: const TextStyle(fontSize: 12, color: familyGreen),
                    ),
                    const SizedBox(height: 8),
                    Text(contact.$3),
                    Text(contact.$4),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => familyInfo(
                        context,
                        'Call preview',
                        '${contact.$1}\n${contact.$3}\n\nNo call will be placed in this demo.',
                      ),
                      icon: const Icon(Icons.call_outlined),
                      label: const Text('Call'),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}
