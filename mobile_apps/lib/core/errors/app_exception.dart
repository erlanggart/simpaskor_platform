class AppException implements Exception {
  const AppException({required this.message, this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException({required super.message, super.statusCode});
}

class AuthException extends AppException {
  const AuthException({required super.message, super.statusCode, this.field});

  /// Which field caused the error: "email", "password", etc.
  final String? field;
}

class ValidationException extends AppException {
  const ValidationException({
    required super.message,
    super.statusCode,
    this.fieldErrors,
  });

  final Map<String, String>? fieldErrors;
}

class ServerException extends AppException {
  const ServerException({required super.message, super.statusCode});
}
