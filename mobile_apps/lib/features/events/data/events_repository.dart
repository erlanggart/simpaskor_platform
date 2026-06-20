import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/api/api_client.dart';
import '../../dashboard/domain/dashboard_models.dart';

class EventsRepository {
  EventsRepository() : _dio = apiClient.dio;

  final Dio _dio;

  Future<Map<String, dynamic>> getEvents({
    String? search,
    String? status,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final res = await _dio.get('/events', queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (status != null && status != 'ALL') 'status': status,
        'limit': limit,
        'offset': offset,
      });
      final data = res.data as Map<String, dynamic>;
      final List<dynamic> items = data['data'] as List? ?? [];
      final total = data['total'] as int? ?? 0;
      return {
        'events': items
            .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        'total': total,
      };
    } catch (e) {
      debugPrint('❌ [Events] getEvents error: $e');
      return {'events': <EventModel>[], 'total': 0};
    }
  }
}
