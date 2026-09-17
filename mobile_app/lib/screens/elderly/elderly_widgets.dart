import 'package:flutter/material.dart';
import 'elderly_demo_data.dart';

const careGreen = Color(0xFF246A3B);
const careInk = Color(0xFF233D2D);
const careRed = Color(0xFFB3262D);
const careCream = Color(0xFFFAF8F2);

ThemeData elderlyTheme() => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: careGreen,
    primary: careGreen,
    surface: careCream,
    error: careRed,
  ),
  scaffoldBackgroundColor: careCream,
  textTheme: const TextTheme(
    headlineMedium: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: careInk,
    ),
    titleLarge: TextStyle(
      fontSize: 23,
      fontWeight: FontWeight.w700,
      color: careInk,
    ),
    titleMedium: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: careInk,
    ),
    bodyLarge: TextStyle(fontSize: 18, height: 1.45, color: careInk),
    bodyMedium: TextStyle(fontSize: 16, height: 1.4, color: careInk),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(0, 56),
      padding: const EdgeInsets.all(16),
      textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(0, 56),
      padding: const EdgeInsets.all(16),
      textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  ),
);

class CarePage extends StatelessWidget {
  const CarePage({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ),
  );
}

class CareCard extends StatelessWidget {
  const CareCard({super.key, required this.child, this.color = Colors.white});
  final Widget child;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: const Color(0xFFE0E7DD)),
    ),
    child: child,
  );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key});
  final String title;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 26, bottom: 14),
    child: Text(title, style: Theme.of(context).textTheme.titleLarge),
  );
}

void careMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 4)),
    );
}

Future<void> showDemoInfo(BuildContext context, String title, String body) =>
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        scrollable: true,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );

Future<void> showEmergencyPreview(BuildContext context) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      scrollable: true,
      icon: const Icon(Icons.sos_rounded, color: careRed, size: 48),
      title: const Text('Request emergency help?'),
      content: const Text(
        'UI demo only. No staff, family member or emergency service will be contacted.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: careRed),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Preview request'),
        ),
      ],
    ),
  );
  if (confirmed == true && context.mounted) {
    await showDemoInfo(
      context,
      'Emergency request preview',
      'This is where the request status will appear once the backend is connected. No alert was sent.',
    );
  }
}

class ContactCard extends StatelessWidget {
  const ContactCard({super.key, required this.contact});
  final CareContact contact;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: CareCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(contact.name, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('${contact.relationship} · ${contact.phone}'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            icon: const Icon(Icons.call_outlined),
            label: Text('Call ${contact.relationship}'),
            onPressed: () => showDemoInfo(
              context,
              'Call preview',
              '${contact.name}\n${contact.phone}\n\nThis demo does not place a phone call.',
            ),
          ),
        ],
      ),
    ),
  );
}
