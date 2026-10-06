import 'dart:async';
import 'package:flutter/foundation.dart';

enum MobileAuthPhase { checking, signedOut, signedIn, blocked }

class MobileProfile {
  const MobileProfile(this.id, this.name, this.role);
  final String id;
  final String name;
  final String role;

  static MobileProfile parse(Map<String, dynamic>? row, String userId) {
    if (row == null || row['id'] != userId) {
      throw const AuthProblem(
        'Your account has no app_users profile. Contact your administrator.',
      );
    }
    if (row['status'] != 'active') {
      throw const AuthProblem(
        'This account is inactive. Contact your administrator.',
      );
    }
    if (row['role'] != 'elderly' && row['role'] != 'family') {
      throw const AuthProblem(
        'Staff and Admin accounts use the web portal. Please sign out and use an Elderly or Family account.',
      );
    }
    return MobileProfile(
      userId,
      row['full_name'] as String? ?? '',
      row['role'] as String,
    );
  }
}

class AuthProblem implements Exception {
  const AuthProblem(this.message);
  final String message;
}

abstract interface class MobileAuthGateway {
  Stream<bool> get changes; // false = signed out; true = revalidate.
  Future<MobileProfile?> verify();
  Future<void> signIn(String email, String password);
  Future<void> signOut();
}

class MobileAuthController extends ChangeNotifier {
  MobileAuthController(this.gateway);
  final MobileAuthGateway gateway;
  MobileAuthPhase phase = MobileAuthPhase.checking;
  MobileProfile? profile;
  String error = '';
  bool busy = false;
  bool _disposed = false;
  int _revision = 0;
  StreamSubscription<bool>? _subscription;
  bool _current(int revision) => !_disposed && revision == _revision;
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void start() {
    _subscription = gateway.changes.listen(
      (hasSession) {
        if (_disposed) return;
        if (!hasSession) {
          ++_revision;
          profile = null;
          phase = MobileAuthPhase.signedOut;
          busy = false;
          error = '';
          _notify();
        } else {
          // Leave the Auth event callback before making more client calls.
          Future<void>(() async {
            if (!_disposed) await verify();
          });
        }
      },
      onError: (Object _) {
        ++_revision;
        profile = null;
        phase = MobileAuthPhase.blocked;
        error = 'Session refresh failed. Check your connection and retry.';
        busy = false;
        _notify();
      },
    );
    unawaited(verify());
  }

  Future<void> verify({bool showLoading = false}) async {
    final revision = ++_revision;
    if (showLoading) {
      phase = MobileAuthPhase.checking;
      _notify();
    }
    try {
      final result = await gateway.verify();
      if (!_current(revision)) return;
      profile = result;
      phase = result == null
          ? MobileAuthPhase.signedOut
          : MobileAuthPhase.signedIn;
      error = '';
      busy = false;
      _notify();
    } catch (exception) {
      if (!_current(revision)) return;
      profile = null;
      phase = MobileAuthPhase.blocked;
      busy = false;
      error = exception is AuthProblem
          ? exception.message
          : 'Unable to verify your account. Check your connection and retry.';
      _notify();
    }
  }

  Future<void> signIn(String email, String password) async {
    if (busy || phase != MobileAuthPhase.signedOut) return;
    final revision = ++_revision;
    busy = true;
    error = '';
    _notify();
    try {
      await gateway.signIn(email.trim(), password);
      if (!_disposed) await verify();
    } catch (exception) {
      if (!_current(revision)) return;
      busy = false;
      error = exception is AuthProblem
          ? exception.message
          : 'Login failed. Check your connection and try again.';
      _notify();
    }
  }

  Future<void> signOut() async {
    ++_revision;
    phase = MobileAuthPhase.checking;
    profile = null;
    busy = true;
    _notify();
    try {
      await gateway.signOut();
      if (_disposed) return;
      phase = MobileAuthPhase.signedOut;
      error = '';
      busy = false;
      _notify();
    } catch (_) {
      if (_disposed) return;
      phase = MobileAuthPhase.blocked;
      busy = false;
      error =
          'Sign-out could not complete. Check your connection and retry Sign out.';
      _notify();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    ++_revision;
    _subscription?.cancel();
    super.dispose();
  }
}
