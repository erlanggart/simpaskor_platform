class UserProfile {
  const UserProfile({
    this.institution,
    this.bio,
    this.avatarUrl,
    this.address,
  });

  final String? institution;
  final String? bio;
  final String? avatarUrl;
  final String? address;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        institution: json['institution'] as String?,
        bio: json['bio'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        address: json['address'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'institution': institution,
        'bio': bio,
        'avatarUrl': avatarUrl,
        'address': address,
      };
}

class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    this.phone,
    this.profile,
    this.lastLogin,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String status;
  final String? phone;
  final UserProfile? profile;
  final DateTime? lastLogin;

  bool get isPending => status == 'PENDING';
  bool get isActive => status == 'ACTIVE';
  bool get isSuspended => status == 'SUSPENDED';

  String get roleName {
    switch (role) {
      case 'PESERTA':
        return 'Peserta';
      case 'JURI':
        return 'Juri';
      case 'PELATIH':
        return 'Pelatih';
      case 'PANITIA':
        return 'Panitia';
      case 'MITRA':
        return 'Mitra';
      case 'SUPERADMIN':
        return 'Super Admin';
      default:
        return role;
    }
  }

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as String,
        email: json['email'] as String,
        name: json['name'] as String,
        role: json['role'] as String,
        status: json['status'] as String,
        phone: json['phone'] as String?,
        profile: json['profile'] != null
            ? UserProfile.fromJson(json['profile'] as Map<String, dynamic>)
            : null,
        lastLogin: json['lastLogin'] != null
            ? DateTime.tryParse(json['lastLogin'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'status': status,
        'phone': phone,
        'profile': profile?.toJson(),
        'lastLogin': lastLogin?.toIso8601String(),
      };
}
