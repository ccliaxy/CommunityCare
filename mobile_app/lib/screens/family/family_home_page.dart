import 'package:flutter/material.dart';
import 'family_demo_data.dart';
import 'family_widgets.dart';

class FamilyHomePage extends StatelessWidget {
  const FamilyHomePage({
    super.key,
    required this.data,
    required this.onProfile,
  });
  final FamilyDemoData data;
  final ValueChanged<int> onProfile;
  @override
  Widget build(BuildContext context) => FamilyPage(
    children: [
      const Text(
        'CARE, EVEN FROM A DISTANCE',
        style: TextStyle(
          fontSize: 12,
          letterSpacing: 1.1,
          color: familyGreen,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 10),
      Text('Hello, Sarah!', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 6),
      const Text('A little closer to the people you love.'),
      const FamilySection('Your loved ones'),
      for (int i = 0; i < data.residents.length; i++) ...[
        _ResidentCard(
          resident: data.residents[i],
          onProfile: () => onProfile(i),
        ),
        const SizedBox(height: 18),
      ],
    ],
  );
}

class _ResidentCard extends StatelessWidget {
  const _ResidentCard({required this.resident, required this.onProfile});
  final FamilyResident resident;
  final VoidCallback onProfile;
  @override
  Widget build(BuildContext context) => FamilyCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            FamilyAvatar(name: resident.name),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    resident.name,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text('Unit ${resident.unit}'),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: resident.checkedIn
                ? const Color(0xFFEAF3E4)
                : const Color(0xFFFFF0DE),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                resident.checkedIn
                    ? Icons.check_circle_outline
                    : Icons.schedule,
                color: resident.checkedIn
                    ? familyGreen
                    : const Color(0xFF8C520B),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  resident.checkedIn ? 'Checked in today' : 'Missed check-in',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'SCHEDULED REMINDER',
          style: TextStyle(
            fontSize: 12,
            letterSpacing: 1,
            fontWeight: FontWeight.w700,
            color: familyGreen,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          resident.reminders.isEmpty
              ? 'No reminders set'
              : '${resident.reminders.first.time} – ${resident.reminders.first.title}',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: () => familyInfo(
                context,
                'Call ${resident.name}',
                '${resident.phone}\n\nDemo only. No phone call will be placed.',
              ),
              icon: const Icon(Icons.call_outlined),
              label: const Text('Call'),
            ),
            OutlinedButton.icon(
              onPressed: () => familyInfo(
                context,
                'Video call preview',
                'Video calling with ${resident.name} is not connected yet.',
              ),
              icon: const Icon(Icons.videocam_outlined),
              label: const Text('Video'),
            ),
            FilledButton.icon(
              key: ValueKey('profile-${resident.id}'),
              onPressed: onProfile,
              icon: const Icon(Icons.person_outline),
              label: const Text('Profile'),
            ),
          ],
        ),
      ],
    ),
  );
}
