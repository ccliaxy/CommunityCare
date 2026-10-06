import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth/auth_gate.dart';
import 'config/supabase_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  String? setupError;
  try {
    final uri = Uri.tryParse(SupabaseConfig.url);
    final key = SupabaseConfig.publishableKey;
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        key.isEmpty ||
        key.startsWith('PASTE_')) {
      throw const FormatException(
        'Set your Project URL and publishable key in lib/config/supabase_config.dart.',
      );
    }
    if (key.startsWith('sb_secret_')) {
      throw const FormatException(
        'Use a publishable key, not a server secret key.',
      );
    }
    if (key.split('.').length == 3) {
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(key.split('.')[1]))),
      );
      if (payload is Map && payload['role'] == 'service_role') {
        throw const FormatException(
          'Do not use a service_role key in the mobile app.',
        );
      }
    }
    await Supabase.initialize(
      url: SupabaseConfig.url,
      publishableKey: key,
      authOptions: const FlutterAuthClientOptions(detectSessionInUri: false),
    );
  } on FormatException catch (error) {
    setupError = error.message;
  } catch (_) {
    setupError =
        'Supabase could not start. Check the configuration and restart the app.';
  }
  runApp(MyApp(setupError: setupError));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, this.setupError});
  final String? setupError;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'CommunityCare',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF43A047)),
      useMaterial3: true,
    ),
    home: setupError == null
        ? const AuthGate()
        : Scaffold(
            body: SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    setupError!,
                    style: const TextStyle(fontSize: 18),
                  ),
                ),
              ),
            ),
          ),
  );
}
