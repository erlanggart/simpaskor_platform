const String appName = 'Simpaskor';
const String appVersion = '1.0.0';

const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://192.168.1.1:3001/api',
);

const String mobileClientHeader = 'simpaskor-flutter';

const Duration apiTimeout = Duration(seconds: 30);
const Duration connectTimeout = Duration(seconds: 15);
