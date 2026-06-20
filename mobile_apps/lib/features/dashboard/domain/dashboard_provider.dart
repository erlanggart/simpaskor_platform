import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/dashboard_repository.dart';
import 'dashboard_models.dart';

final dashboardRepositoryProvider = Provider((_) => DashboardRepository());

final myEventsProvider = FutureProvider.autoDispose<List<EventModel>>((ref) {
  return ref.read(dashboardRepositoryProvider).getMyEvents();
});

final featuredEventsProvider = FutureProvider.autoDispose<List<EventModel>>((ref) {
  return ref.read(dashboardRepositoryProvider).getFeaturedEvents();
});

final recentRegistrationsProvider =
    FutureProvider.autoDispose<List<RegistrationModel>>((ref) {
  return ref.read(dashboardRepositoryProvider).getRecentRegistrations();
});

final myTicketsProvider = FutureProvider.autoDispose<List<TicketModel>>((ref) {
  return ref.read(dashboardRepositoryProvider).getMyTickets();
});
