import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/backend_config.dart';

class MobileDeviceRegistration {
  static const channel = MethodChannel('communitycare/device');
  Future<void> register(String expectedUserId) async {
    if (!Platform.isAndroid) throw const FormatException('Device registration currently supports Android only.');
    final root = Uri.tryParse(BackendConfig.baseUrl);
    if (root == null || root.host.isEmpty || !['http', 'https'].contains(root.scheme)) {
      throw const FormatException('Set the Node.js URL in backend_config.dart.');
    }
    if (!kDebugMode && root.scheme != 'https') {
      throw const FormatException('Release builds require an HTTPS backend URL.');
    }
    final data = await channel.invokeMapMethod<String, dynamic>('getRegistrationInfo');
    if (data == null) throw const FormatException('Phone information is unavailable.');
    final auth = Supabase.instance.client.auth;
    var session = auth.currentSession;
    if (session?.user.id != expectedUserId) return;
    if (session!.isExpired) {
      await auth.refreshSession();
      session = auth.currentSession;
    }
    if (session == null || session.user.id != expectedUserId) return;
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
    try {
      final request = await client.postUrl(root.resolve('/api/mobile/device')).timeout(const Duration(seconds: 15));
      request.followRedirects = false;
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer ${session.accessToken}');
      request.write(jsonEncode(data));
      final response = await request.close().timeout(const Duration(seconds: 20));
      final text = await response.transform(utf8.decoder).join().timeout(const Duration(seconds: 10));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        String message = 'Phone registration failed (${response.statusCode}).';
        try {
          final body = jsonDecode(text);
          if (body is Map && body['error'] is String) message = body['error'] as String;
        } catch (_) { /* Keep the readable status message. */ }
        throw FormatException(message);
      }
    } finally {
      client.close(force: true);
    }
  }
}
