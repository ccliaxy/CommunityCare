import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/backend_config.dart';

/// Read-only saved policy; this page does not activate device automation.
class SystemConfigurationPage extends StatefulWidget {
  const SystemConfigurationPage({super.key});
  @override
  State<SystemConfigurationPage> createState() => _SystemConfigurationPageState();
}

class _SystemConfigurationPageState extends State<SystemConfigurationPage>
    with WidgetsBindingObserver {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;
  bool _running = false;
  HttpClient? _client;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_load());
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && ModalRoute.of(context)?.isCurrent == true &&
          WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        unawaited(_load());
      }
    });
  }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_load());
  }
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _client?.close(force: true);
    super.dispose();
  }
  Future<void> _load() async {
    if (_running) return;
    _running = true;
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
    _client = client;
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token == null) throw const FormatException('Please sign in again.');
      final uri = Uri.parse('${BackendConfig.baseUrl.replaceAll(RegExp(r'/$'), '')}/api/configuration');
      final request = await client.getUrl(uri).timeout(const Duration(seconds: 20));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = jsonDecode(await utf8.decoder.bind(response).join().timeout(const Duration(seconds: 20)));
      if (response.statusCode != 200) throw const FormatException('Could not load system preferences. Please try again.');
      final data = Map<String, dynamic>.from(body as Map);
      if (mounted) setState(() { _data = data; _error = null; });
    } catch (_) {
      if (mounted) setState(() { _data = null; _error = 'Could not load system preferences. Check your connection and sign-in, then retry.'; });
    } finally {
      client.close(force: true);
      _running = false;
      if (mounted) setState(() => _loading = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('System preferences')),
    body: RefreshIndicator(onRefresh: _load, child: ListView(
      physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(20),
      children: [
        const Text('Managed by your system administrator'),
        const SizedBox(height: 12),
        const Text('Device integration pending. These saved preferences do not activate voice detection, fall monitoring, SMS or automatic calls.'),
        if (_loading) const Center(child: CircularProgressIndicator()),
        if (_error != null) ...[Text(_error!), TextButton(onPressed: _load, child: const Text('Retry'))],
        if (_data != null) ...[
          const SizedBox(height: 16),
          Text('Saved revision ${_data!['revision']}'),
          ...(_data!['value'] as Map).entries.map((entry) => ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_labels[entry.key] ?? entry.key.toString()),
            subtitle: Text(entry.value is bool ? (entry.value == true ? 'Requested on' : 'Requested off') : entry.value is List ? (entry.value as List).join(' → ') : '${entry.value}'),
          )),
        ],
      ],
    )),
  );
  static const _labels = {
    'wake':'Wake word', 'language':'Language', 'volume':'Voice volume (%)', 'voice':'Voice confirmation',
    'activation':'Requested SOS activation', 'escalation':'Escalation delay (seconds)', 'sms':'SMS backup',
    'contacts':'Requested contact order', 'fall':'Fall monitoring', 'sensitivity':'Fall sensitivity',
    'impact':'Impact threshold (g)', 'confirmation':'Confirmation timeout (seconds)',
    'noMovement':'No movement timeout (seconds)', 'postVoice':'Post-fall voice prompt',
  };
}
