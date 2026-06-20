import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';
import '../constants/storage_keys.dart';

class ApiClient {
  ApiClient._internal();

  static final ApiClient _instance = ApiClient._internal();

  factory ApiClient() => _instance;

  late final Dio _dio;
  late final FlutterSecureStorage _storage;

  void init() {
    _storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(),
    );

    _dio = Dio(
      BaseOptions(
        baseUrl: apiUrl,
        connectTimeout: connectTimeout,
        receiveTimeout: apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Mobile-Client': mobileClientHeader,
        },
      ),
    );

    _dio.interceptors.add(_authInterceptor());
  }

  Dio get dio => _dio;

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: StorageKeys.authToken);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    );
  }
}

final apiClient = ApiClient();
