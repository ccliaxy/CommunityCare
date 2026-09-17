import 'package:flutter/material.dart';
import 'screens/elderly/elderly_shell.dart';

// Separate entry point: your existing main.dart and login stay intact.
void main() => runApp(const ElderlyPreviewApp());

class ElderlyPreviewApp extends StatelessWidget {
  const ElderlyPreviewApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'CommunityCare · Elderly Preview',
    home: ElderlyShell(),
  );
}
