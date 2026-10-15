import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/backend_config.dart';

class IncidentUpdatesPage extends StatefulWidget {
  const IncidentUpdatesPage({super.key});
  @override
  State<IncidentUpdatesPage> createState() => _IncidentUpdatesPageState();
}

class _IncidentUpdatesPageState extends State<IncidentUpdatesPage>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> _items = [];
  String? _error;
  bool _loading = true;
  bool _running = false;
  Timer? _timer;
  HttpClient? _client;
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
      final request = await client.getUrl(Uri.parse('${BackendConfig.baseUrl.replaceAll(RegExp(r'/$'), '')}/api/mobile/incidents')).timeout(const Duration(seconds: 20));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = jsonDecode(await utf8.decoder.bind(response).join().timeout(const Duration(seconds: 20)));
      if (response.statusCode != 200) throw const FormatException('Could not load incident updates.');
      final items = (body as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      if (mounted) setState(() { _items = items; _error = null; });
    } catch (_) {
      if (mounted) setState(() { _items = []; _error = 'Could not load updates. Check your connection and sign-in, then retry.'; });
    } finally {
      client.close(force: true);
      _running = false;
      if (mounted) setState(() => _loading = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Incident updates')),
    body: RefreshIndicator(onRefresh: _load, child: ListView(
      physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(20),
      children: [
        if (_loading) const Center(child: CircularProgressIndicator()),
        if (_error != null) ...[
          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          TextButton(onPressed: _load, child: const Text('Retry')),
        ],
        if (!_loading && _error == null && _items.isEmpty)
          const Text('No incident updates have been shared with you.'),
        ..._items.map((item) => Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${item['resident']} · ${item['incident_type']}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(item['property_name'] as String),
            Text('Incident: ${DateTime.parse(item['incident_time'] as String).toLocal()}'),
            Text('Status: ${item['status']}'),
            const SizedBox(height: 16),
            Text(item['summary'] as String),
            const SizedBox(height: 12),
            Text('Shared: ${DateTime.parse(item['summary_published_at'] as String).toLocal()}', style: Theme.of(context).textTheme.bodySmall),
          ],
        )))),
      ],
    )),
  );
}
