import '../devices/device_registration_scope.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../screens/auth/login_page.dart';
import '../screens/elderly/elderly_shell.dart';
import '../screens/family/family_shell.dart';
import 'mobile_auth_controller.dart';
import 'supabase_auth_gateway.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> with WidgetsBindingObserver {
  late final MobileAuthController _auth;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _auth = MobileAuthController(SupabaseAuthGateway(Supabase.instance.client))
      ..start();
    _auth.addListener(_clearDialogs);
  }

  void _clearDialogs() {
    if (_auth.phase == MobileAuthPhase.signedIn) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _auth.phase != MobileAuthPhase.signedIn) {
        Navigator.of(
          context,
          rootNavigator: true,
        ).popUntil((route) => route.isFirst);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _auth.phase == MobileAuthPhase.signedIn) {
      unawaited(_auth.verify());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth.removeListener(_clearDialogs);
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _auth,
    builder: (context, _) {
      if (_auth.phase == MobileAuthPhase.checking) {
        return const Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Checking your session…'),
              ],
            ),
          ),
        );
      }
      if (_auth.phase == MobileAuthPhase.signedOut) {
        return LoginPage(
          onSignIn: _auth.signIn,
          busy: _auth.busy,
          authError: _auth.error,
        );
      }
      if (_auth.phase == MobileAuthPhase.blocked) {
        return Scaffold(
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.lock_outline, size: 48),
                      const SizedBox(height: 20),
                      Text(
                        _auth.error,
                        style: const TextStyle(fontSize: 20),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: () => _auth.verify(showLoading: true),
                        child: const Text('Retry verification'),
                      ),
                      TextButton(
                        onPressed: _auth.signOut,
                        child: const Text('Sign out'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }
      final profile = _auth.profile!;
      // Dialogs/routes belong to this authenticated subtree and disappear on logout.
      return Navigator(
        key: ValueKey('${profile.id}:${profile.role}'),
        onGenerateRoute: (_) => MaterialPageRoute<void>(
          builder: (_) => profile.role == 'elderly'
              ? DeviceRegistrationScope(
                  key: ValueKey(profile.id),
                  userId: profile.id,
                  child: ElderlyShell(
                    showInitialInvitation: false,
                    onLogout: () => unawaited(_auth.signOut()),
                    accountName: profile.name,
                  ),
                )
              : FamilyShell(
                  onLogout: () => unawaited(_auth.signOut()),
                  accountName: profile.name,
                ),
        ),
      );
    },
  );
}
