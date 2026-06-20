import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/errors/app_exception.dart';
import '../domain/models/user_model.dart';

class AuthResult {
  const AuthResult({required this.user, required this.token});

  final UserModel user;
  final String token;
}

class AuthRepository {
  AuthRepository() : _dio = apiClient.dio;

  final Dio _dio;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('🌐 [Repo] POST ${ApiEndpoints.login} email=$email');
      final response = await _dio.post(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );
      debugPrint('🌐 [Repo] response ${response.statusCode}: ${response.data}');
      return _parseAuthResponse(response.data as Map<String, dynamic>);
    } on AppException {
      rethrow;
    } on DioException catch (e) {
      debugPrint('🌐 [Repo] DioException type=${e.type} hasResponse=${e.response != null} status=${e.response?.statusCode} data=${e.response?.data} inner=${e.error?.runtimeType}: ${e.error}');
      throw _handleDioError(e);
    }
  }

  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? institution,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.register,
        data: {
          'name': name,
          'email': email,
          'password': password,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
          if (institution != null && institution.isNotEmpty)
            'institution': institution,
        },
      );
      return _parseAuthResponse(response.data as Map<String, dynamic>);
    } on AppException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> forgotPassword({required String email}) async {
    try {
      await _dio.post(
        ApiEndpoints.forgotPassword,
        data: {'email': email},
      );
    } on AppException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore errors on logout; clear local state regardless
    }
  }

  AuthResult _parseAuthResponse(Map<String, dynamic> data) {
    final userData = data['user'] as Map<String, dynamic>;
    final token = data['token'] as String;
    return AuthResult(
      user: UserModel.fromJson(userData),
      token: token,
    );
  }

  AppException _handleDioError(DioException e) {
    // No response → network/connectivity issue
    if (e.response == null ||
        e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return const NetworkException(
        message: 'Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.',
      );
    }

    final statusCode = e.response?.statusCode;
    final data = e.response?.data;
    final message =
        data is Map ? (data['message'] ?? 'Terjadi kesalahan') : 'Terjadi kesalahan';
    final field = data is Map ? data['field'] as String? : null;

    if (statusCode == 401) {
      return AuthException(
        message: message.toString(),
        statusCode: statusCode,
        field: field,
      );
    }
    if (statusCode == 403) {
      return AuthException(
        message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.',
        statusCode: statusCode,
      );
    }
    if (statusCode == 400 || statusCode == 422) {
      return ValidationException(
          message: message.toString(), statusCode: statusCode);
    }
    if (statusCode != null && statusCode >= 500) {
      return ServerException(
        message: 'Server sedang bermasalah. Coba beberapa saat lagi.',
        statusCode: statusCode,
      );
    }
    return ServerException(message: message.toString(), statusCode: statusCode);
  }
}
