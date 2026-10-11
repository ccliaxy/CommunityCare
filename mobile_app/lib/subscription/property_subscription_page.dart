import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/backend_config.dart';

/// The Node API resolves current residency/family links; no billing data is returned.
class PropertySubscriptionPage extends StatefulWidget {
  const PropertySubscriptionPage({super.key});
  @override
  State<PropertySubscriptionPage> createState() => _PropertySubscriptionPageState();
}

class _PropertySubscriptionPageState extends State<PropertySubscriptionPage>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> _items = [];
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
      final uri = Uri.parse('${BackendConfig.baseUrl.replaceAll(RegExp(r'/$'), '')}/api/mobile/subscription');
      final request = await client.getUrl(uri).timeout(const Duration(seconds: 20));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = jsonDecode(await utf8.decoder.bind(response).join().timeout(const Duration(seconds: 20)));
      if (response.statusCode != 200) throw const FormatException('Could not load your property plan. Please try again.');
      final items = (body as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      if (mounted) setState(() { _items = items; _error = null; });
    } catch (_) {
      if (mounted) setState(() { _items = []; _error = 'Could not load your property plan. Check your connection and sign-in, then retry.'; });
    } finally {
      client.close(force: true);
      _running = false;
      if (mounted) setState(() => _loading = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Property plan')),
    body: RefreshIndicator(onRefresh: _load, child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      children: [
        const Text('Test environment · Property subscription'),
        const SizedBox(height: 16),
        if (_loading) const Center(child: CircularProgressIndicator()),
        if (_error != null) ...[
          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          TextButton(onPressed: _load, child: const Text('Retry')),
        ],
        if (!_loading && _error == null && _items.isEmpty)
          const Text('No current property is linked to your account.'),
        ..._items.map((item) => Card(child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item['property_name'] as String, style: Theme.of(context).textTheme.titleLarge),
            Text(item['resident_name'] as String),
            const SizedBox(height: 12),
            Text(item['active'] == true ? '${item['plan_name']} · Active' : 'No active property plan'),
            if (item['ends_at'] != null) Text('Paid until ${DateTime.parse(item['ends_at'] as String).toLocal()}'),
            const SizedBox(height: 12),
            ...(item['features'] as List).map((f) => Text('• $f')),
          ]),
        ))),
        const SizedBox(height: 16),
        const Text('Your property manager manages this plan. Contact them for subscription questions.'),
      ],
    )),
  );
}
