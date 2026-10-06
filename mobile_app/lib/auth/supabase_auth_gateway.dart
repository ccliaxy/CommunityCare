import 'package:supabase_flutter/supabase_flutter.dart';
import 'mobile_auth_controller.dart';

class SupabaseAuthGateway implements MobileAuthGateway {
  SupabaseAuthGateway(this.client);
  final SupabaseClient client;
  @override
  Stream<bool> get changes => client.auth.onAuthStateChange.map(
    (state) =>
        state.event != AuthChangeEvent.signedOut && state.session != null,
  );
  @override
  Future<MobileProfile?> verify() async {
    final session = client.auth.currentSession;
    if (session == null) return null;
    if (session.isExpired) await client.auth.refreshSession();
    final user = (await client.auth.getUser()).user;
    if (user == null)
      throw const AuthProblem(
        'Your session could not be verified. Sign out and log in again.',
      );
    final row = await client
        .from('app_users')
        .select('id,full_name,role,status')
        .eq('id', user.id)
        .maybeSingle();
    return MobileProfile.parse(row, user.id);
  }

  @override
  Future<void> signIn(String email, String password) async {
    try {
      await client.auth.signInWithPassword(email: email, password: password);
    } on AuthException catch (exception) {
      throw AuthProblem(
        exception.code == 'email_not_confirmed'
            ? 'Please confirm your email before logging in.'
            : exception.code == 'invalid_credentials'
            ? 'Incorrect email or password.'
            : 'Unable to sign in. Check your account details and connection.',
      );
    }
  }

  @override
  Future<void> signOut() => client.auth.signOut(scope: SignOutScope.local);
}
