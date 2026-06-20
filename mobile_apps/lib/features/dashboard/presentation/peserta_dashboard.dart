import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/domain/auth_provider.dart';
import '../../auth/domain/models/user_model.dart';
import '../domain/dashboard_models.dart';
import '../domain/dashboard_provider.dart';

class PesertaDashboard extends ConsumerStatefulWidget {
  const PesertaDashboard({super.key});

  @override
  ConsumerState<PesertaDashboard> createState() => _PesertaDashboardState();
}

class _PesertaDashboardState extends ConsumerState<PesertaDashboard> {
  late Timer _timer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).value?.user;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          ref.invalidate(myEventsProvider);
          ref.invalidate(featuredEventsProvider);
          ref.invalidate(recentRegistrationsProvider);
          ref.invalidate(myTicketsProvider);
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildWelcomeHeader(user)),
            SliverToBoxAdapter(child: _buildSearchBar()),
            SliverToBoxAdapter(child: _buildMyEvents()),
            SliverToBoxAdapter(child: _buildFeaturedEvents()),
            SliverToBoxAdapter(child: _buildRecentRegistrations()),
            SliverToBoxAdapter(child: _buildMyTickets()),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  // ─── Welcome Header ──────────────────────────────────────────────────────────

  Widget _buildWelcomeHeader(UserModel? user) {
    final hour = _now.hour;
    final greeting = hour < 11
        ? 'Selamat Pagi'
        : hour < 15
            ? 'Selamat Siang'
            : hour < 18
                ? 'Selamat Sore'
                : 'Selamat Malam';

    final dayName = DateFormat('EEEE', 'id_ID').format(_now);
    final dateStr = DateFormat('d MMMM yyyy', 'id_ID').format(_now);
    final timeStr = DateFormat('HH:mm:ss').format(_now);

    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.primaryGradient,
      ),
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user?.name.split(' ').take(2).join(' ') ?? 'Pengguna',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        user?.roleName ?? 'Peserta',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Avatar
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: Colors.white.withValues(alpha: 0.4), width: 2),
                ),
                child: const Icon(Icons.person, color: Colors.white, size: 28),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Date & Time row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_outlined,
                    color: Colors.white70, size: 16),
                const SizedBox(width: 6),
                Text(
                  '$dayName, $dateStr',
                  style: const TextStyle(
                      color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                ),
                const Spacer(),
                const Icon(Icons.access_time_outlined,
                    color: Colors.white70, size: 16),
                const SizedBox(width: 6),
                Text(
                  timeStr,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Search Bar ──────────────────────────────────────────────────────────────

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: GestureDetector(
        onTap: () => context.push('/events'),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.search, color: AppColors.textSecondary, size: 20),
              const SizedBox(width: 10),
              Text(
                'Cari event kompetisi...',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Cari',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Section header ─────────────────────────────────────────────────────────

  Widget _sectionHeader(String title, String action, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: onTap,
            child: Text(
              action,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── My Events (horizontal scroll) ──────────────────────────────────────────

  Widget _buildMyEvents() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('Event Saya', 'Lihat Semua', () => context.go('/registrations')),
        SizedBox(
          height: 160,
          child: ref.watch(myEventsProvider).when(
                data: (events) => events.isEmpty
                    ? _emptyHorizontal('Belum ada event yang diikuti')
                    : ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: events.length,
                        separatorBuilder: (ctx, i) => const SizedBox(width: 12),
                        itemBuilder: (ctx, i) => _EventCardHorizontal(event: events[i]),
                      ),
                loading: () => _shimmerHorizontal(),
                error: (err, st) => _emptyHorizontal('Gagal memuat data'),
              ),
        ),
      ],
    );
  }

  // ─── Featured Events ─────────────────────────────────────────────────────────

  Widget _buildFeaturedEvents() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('Event Unggulan', 'Lihat Semua', () => context.go('/events')),
        SizedBox(
          height: 160,
          child: ref.watch(featuredEventsProvider).when(
                data: (events) => events.isEmpty
                    ? _emptyHorizontal('Belum ada event tersedia')
                    : ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: events.length,
                        separatorBuilder: (ctx, i) => const SizedBox(width: 12),
                        itemBuilder: (ctx, i) => _EventCardHorizontal(
                          event: events[i],
                          showBadge: true,
                        ),
                      ),
                loading: () => _shimmerHorizontal(),
                error: (err, st) => _emptyHorizontal('Gagal memuat data'),
              ),
        ),
      ],
    );
  }

  // ─── Recent Registrations ────────────────────────────────────────────────────

  Widget _buildRecentRegistrations() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(
            'Pendaftaran Terbaru', 'Lihat Semua', () => context.go('/registrations')),
        ref.watch(recentRegistrationsProvider).when(
              data: (list) => list.isEmpty
                  ? _emptyVertical('Belum ada pendaftaran')
                  : Column(
                      children: list
                          .map((r) => _RegistrationCard(registration: r))
                          .toList(),
                    ),
              loading: () => _shimmerVertical(3),
              error: (err, st) => _emptyVertical('Gagal memuat data'),
            ),
      ],
    );
  }

  // ─── My Tickets ──────────────────────────────────────────────────────────────

  Widget _buildMyTickets() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader('Tiket Saya', 'Lihat Semua', () => context.go('/history')),
        ref.watch(myTicketsProvider).when(
              data: (list) => list.isEmpty
                  ? _emptyVertical('Belum ada tiket yang dibeli')
                  : Column(
                      children: list.map((t) => _TicketCard(ticket: t)).toList(),
                    ),
              loading: () => _shimmerVertical(2),
              error: (err, st) => _emptyVertical('Gagal memuat data'),
            ),
      ],
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  Widget _emptyHorizontal(String msg) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_outlined, size: 32, color: AppColors.textSecondary.withValues(alpha: 0.4)),
          const SizedBox(height: 8),
          Text(msg, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _emptyVertical(String msg) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_outlined, size: 20, color: AppColors.textSecondary.withValues(alpha: 0.5)),
          const SizedBox(width: 8),
          Text(msg, style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _shimmerHorizontal() {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 3,
      separatorBuilder: (ctx, i) => const SizedBox(width: 12),
      itemBuilder: (ctx, i) => Container(
        width: 200,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Widget _shimmerVertical(int count) {
    return Column(
      children: List.generate(
        count,
        (_) => Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

// ─── Event Card (horizontal) ─────────────────────────────────────────────────

class _EventCardHorizontal extends StatelessWidget {
  const _EventCardHorizontal({required this.event, this.showBadge = false});

  final EventModel event;
  final bool showBadge;

  @override
  Widget build(BuildContext context) {
    final dateStr = event.startDate != null
        ? DateFormat('d MMM yyyy', 'id_ID').format(event.startDate!)
        : 'Tanggal TBA';

    return GestureDetector(
      onTap: () => context.push('/events/${event.slug}'),
      child: Container(
        width: 210,
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Container(
              height: 90,
              color: AppColors.primary.withValues(alpha: 0.12),
              child: Stack(
                children: [
                  if (event.imageUrl != null)
                    SizedBox(
                      width: double.infinity,
                      height: 90,
                      child: Image.network(
                        event.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, err, st) => _imagePlaceholder(),
                      ),
                    )
                  else
                    _imagePlaceholder(),
                  if (showBadge)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Unggulan',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined,
                          size: 11, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        dateStr,
                        style: const TextStyle(
                            fontSize: 10, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      width: double.infinity,
      height: 90,
      alignment: Alignment.center,
      child: Icon(Icons.event_outlined,
          size: 32, color: AppColors.primary.withValues(alpha: 0.4)),
    );
  }
}

// ─── Registration Card ───────────────────────────────────────────────────────

class _RegistrationCard extends StatelessWidget {
  const _RegistrationCard({required this.registration});

  final RegistrationModel registration;

  @override
  Widget build(BuildContext context) {
    final color = registration.isApproved
        ? AppColors.success
        : registration.isPending
            ? AppColors.warning
            : AppColors.error;

    final dateStr = DateFormat('d MMM yyyy', 'id_ID').format(registration.createdAt);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.assignment_outlined, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  registration.eventTitle ?? 'Event Tidak Diketahui',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  dateStr,
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              registration.statusLabel,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Ticket Card ─────────────────────────────────────────────────────────────

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.ticket});

  final TicketModel ticket;

  @override
  Widget build(BuildContext context) {
    final color = ticket.isValid ? AppColors.success : AppColors.textSecondary;
    final dateStr = DateFormat('d MMM yyyy', 'id_ID').format(ticket.createdAt);
    final priceStr = ticket.totalAmount != null
        ? 'Rp ${NumberFormat('#,###', 'id_ID').format(ticket.totalAmount)}'
        : 'Gratis';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.confirmation_number_outlined,
                color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ticket.eventTitle ?? 'Tiket Event',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Text(
                      dateStr,
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 6),
                    const Text('·',
                        style: TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(width: 6),
                    Text(
                      '${ticket.quantity} tiket · $priceStr',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              ticket.statusLabel,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
