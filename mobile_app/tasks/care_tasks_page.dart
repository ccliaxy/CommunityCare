import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/backend_config.dart';

/// Read-only progress of staff work explicitly shared with this account.
/// These records are not medication schedules or elderly check-in actions.
class CareTasksPage extends StatefulWidget {
  const CareTasksPage({super.key});
  @override
  State<CareTasksPage> createState() => _CareTasksPageState();
}

class _CareTasksPageState extends State<CareTasksPage>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> _tasks = [];
  bool _loading = true;
  bool _running = false;
  String? _error;
  String _resident = '';
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
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
    _client = client;
    try {
      final auth = Supabase.instance.client.auth;
      var session = auth.currentSession;
      if (session == null) throw const FormatException('Please sign in again.');
      final userId = session.user.id;
      if (session.isExpired) {
        await auth.refreshSession();
        session = auth.currentSession;
      }
      if (session == null || session.user.id != userId) {
        throw const FormatException('Please sign in again.');
      }
      final root = Uri.tryParse(BackendConfig.baseUrl);
      if (root == null || root.host.isEmpty || !['http', 'https'].contains(root.scheme)) {
        throw const FormatException('Configure the Node.js backend URL.');
      }
      if (!kDebugMode && root.scheme != 'https') {
        throw const FormatException('Release builds require an HTTPS backend.');
      }
      final request = await client.getUrl(root.resolve('/api/mobile/tasks'))
          .timeout(const Duration(seconds: 15));
      request.followRedirects = false;
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer ${session.accessToken}');
      final response = await request.close().timeout(const Duration(seconds: 25));
      final text = await response.transform(utf8.decoder).join()
          .timeout(const Duration(seconds: 10));
      final body = jsonDecode(text);
      if (response.statusCode != 200) {
        throw FormatException(body is Map && body['error'] is String
            ? body['error'] as String : 'Unable to load care tasks.');
      }
      if (body is! Map || body['tasks'] is! List) {
        throw const FormatException('Invalid task response.');
      }
      final tasks = (body['tasks'] as List)
          .map((row) => Map<String, dynamic>.from(row as Map)).toList()
        ..sort((a, b) => (b['due_at'] as String).compareTo(a['due_at'] as String));
      if (auth.currentUser?.id != userId) {
        throw const FormatException('Account changed. Please reopen this page.');
      }
      if (mounted) setState(() {
        _tasks = tasks;
        _error = null;
        if (!_tasks.any((t) => t['elderly_id'] == _resident)) _resident = '';
      });
    } catch (e) {
      if (mounted) setState(() {
        _tasks = [];
        _resident = '';
        _error = e is FormatException ? e.message
            : 'Could not load care tasks. Check the backend and Wi-Fi, then retry.';
      });
    } finally {
      client.close(force: true);
      if (identical(_client, client)) _client = null;
      _running = false;
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final residents = <String, String>{
      for (final t in _tasks) t['elderly_id'] as String: t['resident'] as String,
    };
    final visible = _tasks.where((t) => _resident.isEmpty || t['elderly_id'] == _resident).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Care tasks')),
      body: _loading ? const Center(child: CircularProgressIndicator())
          : _error != null ? Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(_error!), const SizedBox(height: 16),
                FilledButton(onPressed: _load, child: const Text('Retry')),
              ])))
          : RefreshIndicator(onRefresh: _load, child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              children: [
                const Text('Tasks carried out by property staff and shared with you. Pull down to update.'),
                const SizedBox(height: 16),
                if (residents.length > 1) DropdownButtonFormField<String>(
                  key: ValueKey(_resident), initialValue: _resident,
                  decoration: const InputDecoration(labelText: 'Resident'),
                  items: [const DropdownMenuItem(value: '', child: Text('All linked residents')),
                    ...residents.entries.map((r) => DropdownMenuItem(value: r.key, child: Text(r.value)))],
                  onChanged: (v) => setState(() { _resident = v ?? ''; }),
                ),
                if (visible.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 32),
                    child: Text('No shared care tasks yet.')),
                ...visible.map((task) => Card(child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(task['title'] as String, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text('${task['resident']} · ${task['property_name']}'),
                    Text('Due: ${task['due_local']} (${task['time_zone']})'),
                    const SizedBox(height: 8),
                    Text('Status: ${task['status'].toString().replaceAll('_', ' ')}',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  ]),
                ))),
              ],
            )),
    );
  }
}
