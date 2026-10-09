import 'dart:async';
import 'package:flutter/material.dart';
import 'mobile_device_registration.dart';

class DeviceRegistrationScope extends StatefulWidget {
  const DeviceRegistrationScope({super.key, required this.userId, required this.child});
  final String userId;
  final Widget child;
  @override
  State<DeviceRegistrationScope> createState() => _DeviceRegistrationScopeState();
}

class _DeviceRegistrationScopeState extends State<DeviceRegistrationScope> with WidgetsBindingObserver {
  final _service = MobileDeviceRegistration();
  bool _busy = false;
  String? _error;
  DateTime? _lastSuccess;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_register());
  }
  @override
  void dispose() { WidgetsBinding.instance.removeObserver(this); super.dispose(); }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && (_lastSuccess == null || DateTime.now().difference(_lastSuccess!) > const Duration(minutes: 5))) {
      unawaited(_register());
    }
  }
  Future<void> _register() async {
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    try { await _service.register(widget.userId); if (mounted) _lastSuccess = DateTime.now(); }
    catch (e) {
      if (mounted) setState(() { _error = e is FormatException ? e.message : 'Phone registration could not reach the server. Check the backend URL and Wi-Fi.'; });
    } finally { if (mounted) setState(() { _busy = false; }); }
  }
  @override
  Widget build(BuildContext context) => Column(children: [
    if (_error != null) Material(color: Theme.of(context).colorScheme.errorContainer,
      child: SafeArea(bottom: false, child: Padding(padding: const EdgeInsets.all(12),
        child: Row(children: [Expanded(child: Text(_error!)), TextButton(onPressed: _busy ? null : _register, child: const Text('Retry'))])))),
    Expanded(child: widget.child),
  ]);
}
