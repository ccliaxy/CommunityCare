import 'package:flutter/material.dart';

const familyGreen = Color(0xFF246A3B);
const familyInk = Color(0xFF233D2D);
const familyCream = Color(0xFFFAF8F2);

ThemeData familyTheme() => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: familyGreen,
    primary: familyGreen,
    surface: familyCream,
  ),
  scaffoldBackgroundColor: familyCream,
  textTheme: const TextTheme(
    headlineMedium: TextStyle(
      fontSize: 27,
      fontWeight: FontWeight.w700,
      color: familyInk,
    ),
    titleLarge: TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w700,
      color: familyInk,
    ),
    titleMedium: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: familyInk,
    ),
    bodyLarge: TextStyle(fontSize: 17, height: 1.45, color: familyInk),
    bodyMedium: TextStyle(fontSize: 15, height: 1.45, color: familyInk),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(0, 52),
      padding: const EdgeInsets.all(14),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(0, 52),
      padding: const EdgeInsets.all(14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  inputDecorationTheme: const InputDecorationTheme(
    border: OutlineInputBorder(),
  ),
);

class FamilyPage extends StatelessWidget {
  const FamilyPage({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ),
  );
}

class FamilyCard extends StatelessWidget {
  const FamilyCard({super.key, required this.child, this.color = Colors.white});
  final Widget child;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: const Color(0xFFDEE6D9)),
    ),
    child: child,
  );
}

class FamilySection extends StatelessWidget {
  const FamilySection(this.title, {super.key});
  final String title;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 26, bottom: 14),
    child: Text(title, style: Theme.of(context).textTheme.titleLarge),
  );
}

void familyMessage(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}

Future<void> familyInfo(BuildContext context, String title, String message) =>
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );

Future<bool> familyConfirm(
  BuildContext context,
  String title,
  String message, {
  String action = 'Remove',
}) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(action),
          ),
        ],
      ),
    ) ??
    false;

class FamilyField {
  const FamilyField(
    this.label, {
    this.initial = '',
    this.keyboard = TextInputType.text,
    this.validate,
  });
  final String label;
  final String initial;
  final TextInputType keyboard;
  final String? Function(String)? validate;
}

Future<List<String>?> familyForm(
  BuildContext context,
  String title,
  List<FamilyField> fields,
) => showDialog<List<String>>(
  context: context,
  builder: (_) => _FamilyForm(title: title, fields: fields),
);

class _FamilyForm extends StatefulWidget {
  const _FamilyForm({required this.title, required this.fields});
  final String title;
  final List<FamilyField> fields;
  @override
  State<_FamilyForm> createState() => _FamilyFormState();
}

class _FamilyFormState extends State<_FamilyForm> {
  final _key = GlobalKey<FormState>();
  late final _controllers = widget.fields
      .map((field) => TextEditingController(text: field.initial))
      .toList();
  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    scrollable: true,
    title: Text(widget.title),
    content: SizedBox(
      width: 420,
      child: Form(
        key: _key,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (int i = 0; i < widget.fields.length; i++)
              Padding(
                padding: const EdgeInsets.only(top: 10, bottom: 8),
                child: TextFormField(
                  key: ValueKey('field-$i'),
                  controller: _controllers[i],
                  keyboardType: widget.fields[i].keyboard,
                  decoration: InputDecoration(
                    labelText: widget.fields[i].label,
                    errorMaxLines: 3,
                  ),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) return 'Please fill in this field.';
                    return widget.fields[i].validate?.call(text);
                  },
                ),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        key: const ValueKey('save-form'),
        onPressed: () {
          if (_key.currentState!.validate())
            Navigator.pop(
              context,
              _controllers.map((c) => c.text.trim()).toList(),
            );
        },
        child: const Text('Save'),
      ),
    ],
  );
}

class FamilyAvatar extends StatelessWidget {
  const FamilyAvatar({super.key, required this.name, this.radius = 28});
  final String name;
  final double radius;
  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: radius,
    backgroundColor: const Color(0xFFE7F0DC),
    child: Icon(Icons.person_outline, color: familyGreen, size: radius),
  );
}
