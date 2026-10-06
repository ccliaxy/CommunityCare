// Use the SAME project URL and publishable key as your React portal.
// Never use a secret/service_role key. These client settings are not passwords.
class SupabaseConfig {
  static const url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://isaqlrhnxsmgjxnntfmg.supabase.co',
  );
  static const publishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_f6CBOwR6yhjrF7VNddc-ng_LNtEldLz',
  );
}
