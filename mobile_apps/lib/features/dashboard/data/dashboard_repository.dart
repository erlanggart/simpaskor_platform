import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../domain/dashboard_models.dart';

class DashboardRepository {
  DashboardRepository() : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<EventModel>> getMyEvents({int limit = 5}) async {
    try {
      final res = await _dio.get('/registrations', queryParameters: {
        'limit': limit,
        'status': 'APPROVED',
      });
      final data = res.data;
      final List<dynamic> items = data is Map
          ? (data['data'] ?? data['registrations'] ?? []) as List
          : data as List? ?? [];
      return items
          .map((e) => RegistrationModel.fromJson(e as Map<String, dynamic>))
          .where((r) => r.eventTitle != null)
          .map((r) => EventModel(
                id: r.eventId ?? '',
                title: r.eventTitle ?? '',
                slug: r.eventSlug ?? '',
                status: 'APPROVED',
                imageUrl: r.eventImageUrl,
                startDate: r.eventStartDate,
                location: r.eventLocation,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<EventModel>> getFeaturedEvents({int limit = 5}) async {
    try {
      final res = await _dio.get('/events', queryParameters: {
        'limit': limit,
        'status': 'REGISTRATION_OPEN',
        'sort': 'latest',
      });
      final data = res.data;
      final List<dynamic> items = data is Map
          ? (data['data'] ?? data['events'] ?? []) as List
          : data as List? ?? [];
      return items
          .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<RegistrationModel>> getRecentRegistrations({int limit = 3}) async {
    try {
      final res = await _dio.get('/registrations', queryParameters: {
        'limit': limit,
      });
      final data = res.data;
      final List<dynamic> items = data is Map
          ? (data['data'] ?? data['registrations'] ?? []) as List
          : data as List? ?? [];
      return items
          .map((e) => RegistrationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<TicketModel>> getMyTickets({int limit = 3}) async {
    try {
      final res = await _dio.get('/tickets', queryParameters: {'limit': limit});
      final data = res.data;
      final List<dynamic> items = data is Map
          ? (data['data'] ?? data['tickets'] ?? []) as List
          : data as List? ?? [];
      return items
          .map((e) => TicketModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
