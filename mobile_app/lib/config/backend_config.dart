class BackendConfig {
  // Android Emulator: http://10.0.2.2:5000
  // Physical phone: http://YOUR_COMPUTER_LAN_IP:5000
  // Production: your HTTPS API URL. Never put a service_role key in the app.
  static const baseUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );
}
