import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';
import 'elderly_widgets.dart';

class ElderlyHomePage extends StatelessWidget {
  const ElderlyHomePage({
    super.key,
    required this.data,
    required this.onActivities,
  });
  final ElderlyDemoData data;
  final VoidCallback onActivities;

  Future<void> _checkIn(BuildContext context) async {
    final mood = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('How are you feeling today?'),
        children: ['Feeling good', 'Feeling okay', 'Need support']
            .map(
              (mood) => Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 20,
              vertical: 6,
            ),
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context, mood),
              child: Text(mood),
            ),
          ),
        )
            .toList(),
      ),
    );
    if (mood != null && context.mounted) {
      data.checkIn(mood);
      careMessage(context, 'Check-in saved for this demo session.');
      if (mood == 'Need support' && context.mounted) {
        await showDemoInfo(
          context,
          'Support check-in preview',
          'Your selection is recorded only in this demo. Nobody has been notified.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => CarePage(
    children: [
      const Text(
        'YOUR EVERYDAY COMPANION',
        style: TextStyle(
          fontSize: 12,
          letterSpacing: 1.4,
          fontWeight: FontWeight.w700,
          color: careGreen,
        ),
      ),
      const SizedBox(height: 10),
      Text('Hello, Ah Beng', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 8),
      const Text('A little care, every day.', style: TextStyle(fontSize: 18)),
      const SizedBox(height: 24),
      FilledButton.icon(
        key: const ValueKey('home-emergency'),
        style: FilledButton.styleFrom(
          backgroundColor: careRed,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        ),
        onPressed: () => showEmergencyPreview(context),
        icon: const Icon(Icons.sos_rounded, size: 38),
        label: const Text(
          'Emergency Help',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
        ),
      ),
      const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text('Tap to open a confirmation.', textAlign: TextAlign.center),
      ),
      const SectionTitle('Today’s wellbeing'),
      CareCard(
        color: const Color(0xFFF0F5E8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.medication_outlined, color: careGreen, size: 36),
            const SizedBox(height: 10),
            Text(
              'Medication',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Your medication reminders',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => showDemoInfo(
                context,
                'Medication reminders',
                'No real medication schedule is connected yet. Your reminders will appear here after setup.',
              ),
              child: const Text('View reminders'),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      CareCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.sentiment_satisfied_alt_rounded,
              color: careGreen,
              size: 36,
            ),
            const SizedBox(height: 10),
            Text(
              'Daily Check-In',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              data.mood == null
                  ? 'How are you feeling today?'
                  : 'Today: ${data.mood}',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const ValueKey('check-in'),
              onPressed: () => _checkIn(context),
              child: Text(
                data.mood == null ? 'Log your mood' : 'Update check-in',
              ),
            ),
          ],
        ),
      ),
      const SectionTitle('Your activities'),
      for (final activity in data.joinedActivities)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: CareCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.event_available_outlined,
                  color: careGreen,
                  size: 30,
                ),
                const SizedBox(height: 10),
                Text(
                  activity.title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 6),
                Text(activity.time),
                const SizedBox(height: 10),
                const Text(
                  '✓ Registered',
                  style: TextStyle(
                    color: careGreen,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      OutlinedButton.icon(
        onPressed: onActivities,
        icon: const Icon(Icons.arrow_forward_rounded),
        label: const Text('See all activities'),
      ),
    ],
  );
}
