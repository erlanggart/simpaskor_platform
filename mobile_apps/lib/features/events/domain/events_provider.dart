import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/events_repository.dart';
import '../../dashboard/domain/dashboard_models.dart';

final eventsRepositoryProvider = Provider<EventsRepository>(
  (_) => EventsRepository(),
);

class EventsFilter {
  const EventsFilter({this.search = '', this.status = 'ALL'});
  final String search;
  final String status;

  EventsFilter copyWith({String? search, String? status}) =>
      EventsFilter(search: search ?? this.search, status: status ?? this.status);
}

class EventsState {
  const EventsState({
    this.events = const [],
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
  });

  final List<EventModel> events;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  bool get hasMore => events.length < total;

  EventsState copyWith({
    List<EventModel>? events,
    int? total,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
  }) =>
      EventsState(
        events: events ?? this.events,
        total: total ?? this.total,
        isLoading: isLoading ?? this.isLoading,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        error: error,
      );
}

class EventsNotifier extends Notifier<EventsState> {
  static const _pageSize = 20;

  late EventsRepository _repository;
  EventsFilter _filter = const EventsFilter();

  @override
  EventsState build() {
    _repository = ref.read(eventsRepositoryProvider);
    Future.microtask(() => _fetch(reset: true));
    return const EventsState(isLoading: true);
  }

  Future<void> _fetch({bool reset = false}) async {
    if (reset) {
      state = state.copyWith(isLoading: true, error: null);
    } else {
      if (!state.hasMore) return;
      state = state.copyWith(isLoadingMore: true);
    }

    final offset = reset ? 0 : state.events.length;
    final result = await _repository.getEvents(
      search: _filter.search.isEmpty ? null : _filter.search,
      status: _filter.status,
      limit: _pageSize,
      offset: offset,
    );

    final newEvents = result['events'] as List<EventModel>;
    final total = result['total'] as int;

    state = state.copyWith(
      events: reset ? newEvents : [...state.events, ...newEvents],
      total: total,
      isLoading: false,
      isLoadingMore: false,
    );
  }

  Future<void> refresh() => _fetch(reset: true);

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;
    await _fetch(reset: false);
  }

  void setSearch(String search) {
    _filter = _filter.copyWith(search: search);
    _fetch(reset: true);
  }

  void setStatus(String status) {
    _filter = _filter.copyWith(status: status);
    _fetch(reset: true);
  }
}

final eventsProvider =
    NotifierProvider.autoDispose<EventsNotifier, EventsState>(
  EventsNotifier.new,
);
