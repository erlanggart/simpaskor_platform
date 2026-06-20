import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/domain/auth_provider.dart';
import '../../auth/domain/models/user_model.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.value?.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Simpaskor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildWelcomeCard(context, user),
              const SizedBox(height: 24),
              Text(
                'Menu Utama',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _buildMenuGrid(context, user?.role ?? ''),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(BuildContext context, UserModel? user) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Halo, ${user?.name.split(' ').first ?? 'Pengguna'}! 👋',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    user?.roleName ?? '',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.shield_outlined, color: Colors.white, size: 48),
        ],
      ),
    );
  }

  Widget _buildMenuGrid(BuildContext context, String role) {
    final menuItems = _getMenuItems(role);
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.1,
      ),
      itemCount: menuItems.length,
      itemBuilder: (_, index) => _MenuCard(item: menuItems[index]),
    );
  }

  List<_MenuItem> _getMenuItems(String role) {
    final common = [
      _MenuItem(
        icon: Icons.event_outlined,
        label: 'Event',
        color: AppColors.primary,
        route: '/events',
      ),
      _MenuItem(
        icon: Icons.person_outlined,
        label: 'Profil',
        color: AppColors.secondary,
        route: '/profile',
      ),
    ];

    switch (role) {
      case 'PESERTA':
        return [
          ...common,
          _MenuItem(
            icon: Icons.assignment_outlined,
            label: 'Pendaftaran',
            color: AppColors.success,
            route: '/registrations',
          ),
          _MenuItem(
            icon: Icons.confirmation_number_outlined,
            label: 'Tiket Saya',
            color: AppColors.warning,
            route: '/tickets',
          ),
        ];
      case 'JURI':
        return [
          ...common,
          _MenuItem(
            icon: Icons.rate_review_outlined,
            label: 'Penilaian',
            color: AppColors.success,
            route: '/evaluations',
          ),
        ];
      case 'PANITIA':
        return [
          ...common,
          _MenuItem(
            icon: Icons.manage_accounts_outlined,
            label: 'Kelola Event',
            color: AppColors.success,
            route: '/manage-events',
          ),
          _MenuItem(
            icon: Icons.qr_code_scanner_outlined,
            label: 'Scan Tiket',
            color: AppColors.info,
            route: '/scan-ticket',
          ),
        ];
      default:
        return common;
    }
  }
}

class _MenuItem {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.color,
    required this.route,
  });

  final IconData icon;
  final String label;
  final Color color;
  final String route;
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.item});

  final _MenuItem item;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(item.route),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(item.icon, color: item.color, size: 26),
            ),
            const SizedBox(height: 12),
            Text(
              item.label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
