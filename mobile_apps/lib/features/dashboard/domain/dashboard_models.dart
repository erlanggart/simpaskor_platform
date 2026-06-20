double? _parseDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

class EventModel {
  const EventModel({
    required this.id,
    required this.title,
    required this.slug,
    required this.status,
    this.description,
    this.imageUrl,
    this.startDate,
    this.endDate,
    this.location,
    this.category,
    this.registrationFee,
    this.maxParticipants,
    this.currentParticipants,
  });

  final String id;
  final String title;
  final String slug;
  final String status;
  final String? description;
  final String? imageUrl;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? location;
  final String? category;
  final double? registrationFee;
  final int? maxParticipants;
  final int? currentParticipants;

  factory EventModel.fromJson(Map<String, dynamic> json) => EventModel(
        id: json['id'] as String,
        title: json['title'] as String,
        slug: json['slug'] as String,
        status: json['status'] as String? ?? 'UPCOMING',
        description: json['description'] as String?,
        imageUrl: (json['imageUrl'] ?? json['thumbnail']) as String?,
        startDate: json['startDate'] != null
            ? DateTime.tryParse(json['startDate'] as String)
            : null,
        endDate: json['endDate'] != null
            ? DateTime.tryParse(json['endDate'] as String)
            : null,
        location: json['location'] as String?,
        category: json['category'] as String?,
        registrationFee: _parseDouble(json['registrationFee']),
        maxParticipants: json['maxParticipants'] as int?,
        currentParticipants: json['currentParticipants'] as int?,
      );

  bool get isFree => registrationFee == null || registrationFee == 0;
  bool get isUpcoming => status == 'UPCOMING' || status == 'REGISTRATION_OPEN';
  bool get isOngoing => status == 'ONGOING';

  String get statusLabel {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'Pendaftaran Dibuka';
      case 'REGISTRATION_CLOSED':
        return 'Pendaftaran Ditutup';
      case 'UPCOMING':
        return 'Akan Datang';
      case 'ONGOING':
        return 'Sedang Berlangsung';
      case 'COMPLETED':
        return 'Selesai';
      default:
        return status;
    }
  }
}

class RegistrationModel {
  const RegistrationModel({
    required this.id,
    required this.status,
    required this.createdAt,
    this.eventId,
    this.eventTitle,
    this.eventSlug,
    this.eventImageUrl,
    this.eventStartDate,
    this.eventLocation,
    this.teamName,
    this.paymentStatus,
    this.totalAmount,
  });

  final String id;
  final String status;
  final DateTime createdAt;
  final String? eventId;
  final String? eventTitle;
  final String? eventSlug;
  final String? eventImageUrl;
  final DateTime? eventStartDate;
  final String? eventLocation;
  final String? teamName;
  final String? paymentStatus;
  final double? totalAmount;

  factory RegistrationModel.fromJson(Map<String, dynamic> json) {
    final event = json['event'] as Map<String, dynamic>?;
    return RegistrationModel(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      eventId: event?['id'] as String?,
      eventTitle: event?['title'] as String?,
      eventSlug: event?['slug'] as String?,
      eventImageUrl: event?['imageUrl'] as String?,
      eventStartDate: event?['startDate'] != null
          ? DateTime.tryParse(event!['startDate'] as String)
          : null,
      eventLocation: event?['location'] as String?,
      teamName: json['teamName'] as String?,
      paymentStatus: json['paymentStatus'] as String?,
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
    );
  }

  String get statusLabel {
    switch (status) {
      case 'PENDING':
        return 'Menunggu';
      case 'APPROVED':
        return 'Disetujui';
      case 'REJECTED':
        return 'Ditolak';
      case 'CANCELLED':
        return 'Dibatalkan';
      case 'WAITING_PAYMENT':
        return 'Menunggu Pembayaran';
      default:
        return status;
    }
  }

  bool get isApproved => status == 'APPROVED';
  bool get isPending => status == 'PENDING' || status == 'WAITING_PAYMENT';
}

class TicketModel {
  const TicketModel({
    required this.id,
    required this.status,
    required this.quantity,
    required this.createdAt,
    this.eventTitle,
    this.eventImageUrl,
    this.eventStartDate,
    this.totalAmount,
    this.qrCode,
  });

  final String id;
  final String status;
  final int quantity;
  final DateTime createdAt;
  final String? eventTitle;
  final String? eventImageUrl;
  final DateTime? eventStartDate;
  final double? totalAmount;
  final String? qrCode;

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    final event = json['event'] as Map<String, dynamic>? ??
        json['ticketConfig']?['event'] as Map<String, dynamic>?;
    return TicketModel(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      quantity: json['quantity'] as int? ?? 1,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      eventTitle: event?['title'] as String?,
      eventImageUrl: event?['imageUrl'] as String?,
      eventStartDate: event?['startDate'] != null
          ? DateTime.tryParse(event!['startDate'] as String)
          : null,
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
      qrCode: json['qrCode'] as String?,
    );
  }

  bool get isValid => status == 'PAID' || status == 'ACTIVE';

  String get statusLabel {
    switch (status) {
      case 'PENDING':
        return 'Menunggu Pembayaran';
      case 'PAID':
        return 'Lunas';
      case 'ACTIVE':
        return 'Aktif';
      case 'USED':
        return 'Sudah Digunakan';
      case 'CANCELLED':
        return 'Dibatalkan';
      case 'EXPIRED':
        return 'Kadaluarsa';
      default:
        return status;
    }
  }
}
