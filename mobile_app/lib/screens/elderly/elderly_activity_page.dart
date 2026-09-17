import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';
import 'elderly_widgets.dart';

class ElderlyActivityPage extends StatelessWidget {
  const ElderlyActivityPage({super.key, required this.data});
  final ElderlyDemoData data;

  Future<void> _join(BuildContext context, CareActivity activity) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: Text('Join ${activity.title}?'),
        content: Text(
          '${activity.time}\n${activity.location}\n\n${activity.description}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Join activity'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      data.join(activity);
      careMessage(context, 'Added to your activities for this demo.');
    }
  }

  @override
  Widget build(BuildContext context) => CarePage(
    children: [
      Text(
        'Something to look forward to',
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 8),
      const Text('Meet neighbours. Try something new.'),
      if (data.reminderVisible) ...[
        const SizedBox(height: 24),
        CareCard(
          color: const Color(0xFFE7F0DC),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.notifications_active_outlined,
                color: careGreen,
                size: 30,
              ),
              const SizedBox(height: 10),
              const Text(
                'Your next activity',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
              ),
              const SizedBox(height: 6),
              const Text('Tech Support Drop-in\nSaturday · 2:00 PM'),
              TextButton(
                onPressed: data.dismissReminder,
                child: const Text('Dismiss'),
              ),
            ],
          ),
        ),
      ],
      const SectionTitle('Upcoming Activities'),
      for (final activity in ElderlyDemoData.activities)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: CareCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Align(
                  alignment: Alignment.centerLeft,
                  child: CircleAvatar(
                    radius: 26,
                    backgroundColor: Color(0xFFF0F5E8),
                    child: Icon(
                      Icons.event_outlined,
                      color: careGreen,
                      size: 30,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  activity.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                Text(activity.time),
                Text(activity.location),
                const SizedBox(height: 12),
                Text(activity.description),
                const SizedBox(height: 18),
                if (data.isJoined(activity))
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      '✓ Joined',
                      style: TextStyle(
                        fontSize: 20,
                        color: careGreen,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  )
                else
                  FilledButton(
                    key: ValueKey('join-${activity.id}'),
                    onPressed: () => _join(context, activity),
                    child: const Text('Join activity'),
                  ),
              ],
            ),
          ),
        ),
      const SectionTitle('Past Activities'),
      for (final entry in [
        ('Garden Walk', 'Last Tuesday'),
        ('Morning Yoga', 'Last Monday'),
      ])
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: CareCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.$1, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(entry.$2),
                const SizedBox(height: 8),
                const Text('✓ Completed', style: TextStyle(color: careGreen)),
              ],
            ),
          ),
        ),
    ],
  );
}
