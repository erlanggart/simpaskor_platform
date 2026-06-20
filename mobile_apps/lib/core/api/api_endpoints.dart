class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String selectRole = '/auth/select-role';
  static const String googleAuth = '/auth/google';

  // Users
  static const String me = '/users/me';
  static const String updateProfile = '/users/me';

  // Events
  static const String events = '/events';
  static String eventDetail(String slug) => '/events/$slug';

  // Registrations
  static const String registrations = '/registrations';

  // Evaluations (Juri)
  static const String evaluations = '/evaluations';

  // Tickets
  static const String tickets = '/tickets';

  // Voting
  static const String voting = '/voting';
}
