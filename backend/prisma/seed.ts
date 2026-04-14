import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedGuides } from './seed-guides';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ============================================================================
  // STEP 1: Create Default Users with Different Roles
  // ============================================================================
  console.log('👥 Creating default users...');

  const defaultPassword = await bcrypt.hash('nobunaga1945', 12);
  const pesertaPassword = await bcrypt.hash('password123', 12);

  // SuperAdmin
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@simpaskor.id' },
    update: {},
    create: {
      email: 'superadmin@simpaskor.id',
      passwordHash: defaultPassword,
      name: 'Super Admin',
      phone: '081234567890',
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          bio: 'System administrator with full access',
          institution: 'Simpaskor Platform',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          gender: 'Laki-laki',
        },
      },
    },
  });
  console.log('✅ Created SuperAdmin:', superadmin.email);

  // Panitia
  const panitia = await prisma.user.upsert({
    where: { email: 'panitia@simpaskor.com' },
    update: {},
    create: {
      email: 'panitia@simpaskor.com',
      passwordHash: await bcrypt.hash('Panitia123!', 12),
      name: 'Panitia Demo',
      phone: '081234567891',
      role: 'PANITIA',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          bio: 'Event organizer and manager',
          institution: 'Simpaskor Events',
          city: 'Bandung',
          province: 'Jawa Barat',
          gender: 'Laki-laki',
        },
      },
    },
  });
  console.log('✅ Created Panitia:', panitia.email);

  // Juri
  const juri = await prisma.user.upsert({
    where: { email: 'juri@simpaskor.com' },
    update: {},
    create: {
      email: 'juri@simpaskor.com',
      passwordHash: await bcrypt.hash('Juri123!', 12),
      name: 'Juri Demo',
      phone: '081234567892',
      role: 'JURI',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          bio: 'Professional judge and evaluator',
          institution: 'Paskibra Indonesia',
          city: 'Surabaya',
          province: 'Jawa Timur',
          gender: 'Perempuan',
        },
      },
    },
  });
  console.log('✅ Created Juri:', juri.email);

  // Peserta
  const peserta = await prisma.user.upsert({
    where: { email: 'demo@simpaskor.com' },
    update: {},
    create: {
      email: 'demo@simpaskor.com',
      passwordHash: pesertaPassword,
      name: 'Peserta Demo',
      phone: '081234567893',
      role: 'PESERTA',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          bio: 'Participant from demo school',
          institution: 'SMA Negeri 1 Jakarta',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          gender: 'Laki-laki',
        },
      },
    },
  });
  console.log('✅ Created Peserta:', peserta.email);

  // Pelatih
  const pelatih = await prisma.user.upsert({
    where: { email: 'pelatih@simpaskor.com' },
    update: {},
    create: {
      email: 'pelatih@simpaskor.com',
      passwordHash: await bcrypt.hash('Pelatih123!', 12),
      name: 'Pelatih Demo',
      phone: '081234567894',
      role: 'PELATIH',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          bio: 'Experienced coach and trainer',
          institution: 'Paskibra Training Center',
          city: 'Yogyakarta',
          province: 'DI Yogyakarta',
          gender: 'Laki-laki',
        },
      },
    },
  });
  console.log('✅ Created Pelatih:', pelatih.email);

  // ============================================================================
  // STEP 2: Create School Categories
  // ============================================================================
  console.log('\n🏫 Creating school categories...');

  const schoolCategories = [
    {
      name: 'SD',
      description: 'Sekolah Dasar',
      order: 1,
    },
    {
      name: 'SMP',
      description: 'Sekolah Menengah Pertama',
      order: 2,
    },
    {
      name: 'SMA',
      description: 'Sekolah Menengah Atas',
      order: 3,
    },
    {
      name: 'PURNA',
      description: 'Paskibra Purna / Alumni',
      order: 4,
    },
  ];

  for (const category of schoolCategories) {
    await prisma.schoolCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    console.log(`✅ Created School Category: ${category.name}`);
  }

  // ============================================================================
  // STEP 3: Create Assessment Categories
  // ============================================================================
  console.log('\n📊 Creating assessment categories...');

  const assessmentCategories = [
    {
      name: 'PBB',
      description: 'Peraturan Baris-Berbaris',
      order: 1,
    },
    {
      name: 'KOMANDAN',
      description: 'Penilaian Komandan Regu',
      order: 2,
    },
    {
      name: 'VARIASI',
      description: 'Variasi Gerakan dan Kreativitas',
      order: 3,
    },
    {
      name: 'FORMASI',
      description: 'Formasi dan Kekompakan',
      order: 4,
    },
    {
      name: 'KOSTUM_MAKEUP',
      description: 'Kostum dan Tata Rias',
      order: 5,
    },
  ];

  for (const category of assessmentCategories) {
    await prisma.assessmentCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    console.log(`✅ Created Assessment Category: ${category.name}`);
  }

  // ============================================================================
  // STEP 4: Create Sample Event Coupons
  // ============================================================================
  console.log('\n🎟️ Creating sample event coupons...');

  const coupons = [
    {
      code: 'EVENT2026-DEMO01',
      description: 'Demo coupon for Panitia 1',
      assignedToEmail: panitia.email,
    },
    {
      code: 'EVENT2026-DEMO02',
      description: 'Demo coupon for Panitia 2',
      assignedToEmail: 'panitia@simpaskor.com',
    },
    {
      code: 'EVENT2026-TEST01',
      description: 'Test coupon - Unassigned',
      assignedToEmail: null,
    },
  ];

  for (const coupon of coupons) {
    await prisma.eventCoupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: {
        ...coupon,
        createdByAdminId: superadmin.id,
      },
    });
    console.log(`✅ Created Coupon: ${coupon.code}`);
  }

  // ============================================================================
  // STEP 5: Create Sample Events
  // ============================================================================
  console.log('\n🎯 Creating sample events...');

  // Get all categories first (needed for event creation)
  const allAssessmentCategories = await prisma.assessmentCategory.findMany();
  const allSchoolCategories = await prisma.schoolCategory.findMany();

  // Event data from production database
  const eventsData = [
    {
      title: 'SABATIK COMPETITION 2.0',
      slug: 'sabatik-competition-2-0',
      description: 'Kompetisi LKBB SABATIK 2.0 tingkat SMA/SMK se-Jawa Barat',
      location: 'Tasikmalaya',
      venue: 'SMKN 1 TASIKMALAYA',
      startDate: new Date('2025-05-25T08:00:00Z'),
      endDate: new Date('2025-05-25T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'SEASON 1 LKBB DIWANGKARA 2025',
      slug: 'lkbb-diwangkara-2025',
      description: 'Kompetisi LKBB Diwangkara Season 1 tingkat SMA/SMK se-Jawa Barat',
      location: 'Kabupaten Garut',
      venue: 'SMAN 6 GARUT',
      startDate: new Date('2025-05-31T08:00:00Z'),
      endDate: new Date('2025-05-31T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LAKARAJA',
      slug: 'lakaraja-bogor',
      description: 'Lomba Ketangkasan Baris-berbaris Antar Pelajar Kabupaten Bogor',
      location: 'Kabupaten Bogor',
      venue: 'MAN 1 BOGOR',
      startDate: new Date('2026-01-31T08:00:00Z'),
      endDate: new Date('2026-01-31T17:00:00Z'),
      status: 'PUBLISHED',
      isPinned: true,
      pinnedOrder: 1,
    },
    {
      title: 'SILIWANGI BARIS BERBARIS',
      slug: 'siliwangi-baris-berbaris',
      description: 'Kompetisi baris-berbaris Siliwangi tingkat SMA/SMK',
      location: 'Cimahi',
      venue: 'Lapangan Siliwangi',
      startDate: new Date('2025-05-31T08:00:00Z'),
      endDate: new Date('2025-05-31T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB GAPURA 5.0',
      slug: 'lkbb-gapura-5-0',
      description: 'Lomba Kreasi Baris-berbaris GAPURA ke-5 tingkat SMA/SMK se-Jawa Timur',
      location: 'Kabupaten Gresik',
      venue: 'SMA Negeri 1 Gresik',
      startDate: new Date('2025-07-19T08:00:00Z'),
      endDate: new Date('2025-07-19T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB BRIGASTHA TAHUN 2025',
      slug: 'lkbb-brigastha-2025',
      description: 'Lomba Kreasi Baris-berbaris Brigastha 2025',
      location: 'Cimahi',
      venue: 'SMK Moh Toha Cimahi',
      startDate: new Date('2025-06-29T08:00:00Z'),
      endDate: new Date('2025-06-29T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB WIGARAKSI 1.0',
      slug: 'lkbb-wigaraksi-1-0',
      description: 'Lomba Kreasi Baris-berbaris WIGARAKSI Season 1',
      location: 'Kabupaten Bogor',
      venue: 'SMAN 1 Jonggol',
      startDate: new Date('2025-07-05T08:00:00Z'),
      endDate: new Date('2025-07-05T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB THE CROWN 2',
      slug: 'lkbb-the-crown-2',
      description: 'Lomba Kreasi Baris-berbaris The Crown Season 2',
      location: 'Kota Serang',
      venue: 'SMAN 4 Kota Serang',
      startDate: new Date('2025-10-18T08:00:00Z'),
      endDate: new Date('2025-10-18T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB AVATAR',
      slug: 'lkbb-avatar',
      description: 'Lomba Kreasi Baris-berbaris Avatar tingkat SMP',
      location: 'Kota Bogor',
      venue: 'SMP 15 Kota Bogor',
      startDate: new Date('2025-08-23T08:00:00Z'),
      endDate: new Date('2025-08-23T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LBB APP',
      slug: 'lbb-app-godean',
      description: 'Lomba Baris-berbaris APP SMAN 1 Godean',
      location: 'Yogyakarta',
      venue: 'SMAN 1 GODEAN',
      startDate: new Date('2025-10-11T08:00:00Z'),
      endDate: new Date('2025-10-11T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'FAMOUS 5.0',
      slug: 'famous-5-0-cileungsi',
      description: 'Lomba Kreasi Baris-berbaris FAMOUS Season 5',
      location: 'Cileungsi',
      venue: 'SMA Negeri 1 Cileungsi',
      startDate: new Date('2025-10-25T08:00:00Z'),
      endDate: new Date('2025-10-25T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB NEPTUNUS',
      slug: 'lkbb-neptunus-jakarta',
      description: 'Lomba Kreasi Baris-berbaris Neptunus',
      location: 'Jakarta',
      venue: 'Lapangan Neptunus Jakarta',
      startDate: new Date('2025-10-11T08:00:00Z'),
      endDate: new Date('2025-10-11T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB NAWASENA SEASON 4',
      slug: 'lkbb-nawasena-season-4',
      description: 'Lomba Kreasi Baris-berbaris NAWASENA Season 4',
      location: 'Gresik',
      venue: 'SMA MUHAMMADIYAH 1 GRESIK',
      startDate: new Date('2025-09-27T08:00:00Z'),
      endDate: new Date('2025-09-27T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LPBB KARISMATIS 12',
      slug: 'lpbb-karismatis-12',
      description: 'Lomba Paskibra Baris-berbaris KARISMATIS Season 12',
      location: 'Kabupaten Bogor',
      venue: 'SMAN 1 Cibungbulang',
      startDate: new Date('2025-10-04T08:00:00Z'),
      endDate: new Date('2025-10-04T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'PASKIBRA FESTIVAL 3.0',
      slug: 'paskibra-festival-3-0',
      description: 'Festival Paskibra tingkat Nasional di Universitas Dinamika',
      location: 'Surabaya',
      venue: 'UNIVERSITAS DINAMIKA',
      startDate: new Date('2025-10-26T08:00:00Z'),
      endDate: new Date('2025-10-26T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'FLUTTER GAMES 2025',
      slug: 'flutter-games-2025',
      description: 'Kompetisi Flutter tingkat SMA/SMK se-Jawa Barat',
      location: 'Kabupaten Cianjur',
      venue: 'SMAN 2 Cianjur',
      startDate: new Date('2025-11-22T08:00:00Z'),
      endDate: new Date('2025-11-23T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB BHINEKA SANGGA VIKRAMA',
      slug: 'lkbb-bhineka-sangga-vikrama',
      description: 'Lomba Kreasi Baris-berbaris Bhineka Sangga Vikrama',
      location: 'Kabupaten Pekalongan',
      venue: 'Gedung Pertemuan Umum (GPU) Kajen',
      startDate: new Date('2025-11-22T08:00:00Z'),
      endDate: new Date('2025-11-22T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'TRISAGA GLORIENCE',
      slug: 'trisaga-glorience-samarinda',
      description: 'Kompetisi Paskibra TRISAGA GLORIENCE',
      location: 'Samarinda',
      venue: 'SMA NEGERI 10 SAMARINDA',
      startDate: new Date('2025-12-10T08:00:00Z'),
      endDate: new Date('2025-12-10T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'ARGANTARA',
      slug: 'argantara-cikarang',
      description: 'Kompetisi Paskibra ARGANTARA tingkat SMA/SMK',
      location: 'Cikarang',
      venue: 'SMAN 2 CIKARANG SELATAN',
      startDate: new Date('2025-12-20T08:00:00Z'),
      endDate: new Date('2025-12-20T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'GEPRAK SEASON 1',
      slug: 'geprak-season-1',
      description: 'Gerakan Pramuka Bina Karya Season 1',
      location: 'Karawang',
      venue: 'SMK BINA KARYA 1 KARAWANG',
      startDate: new Date('2025-12-27T08:00:00Z'),
      endDate: new Date('2025-12-27T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'TANAH JAWARA',
      slug: 'tanah-jawara',
      description: 'Kompetisi LKBB Tanah Jawara',
      location: 'Tangerang',
      venue: 'SMK AVICENA RAJEG',
      startDate: new Date('2025-11-29T08:00:00Z'),
      endDate: new Date('2025-11-29T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LBB DIYATA 11',
      slug: 'lbb-diyata-11',
      description: 'Lomba Baris-berbaris DIYATA ke-11 SMAN 11 Yogyakarta',
      location: 'Yogyakarta',
      venue: 'SMAN 11 Yogyakarta',
      startDate: new Date('2026-02-07T08:00:00Z'),
      endDate: new Date('2026-02-07T17:00:00Z'),
      status: 'PUBLISHED',
      isPinned: true,
      pinnedOrder: 2,
    },
    {
      title: 'LIBASKOT SEASON IV',
      slug: 'libaskot-season-4',
      description: 'Lomba Inovasi Baris-berbaris Kota Season IV',
      location: 'Kabupaten Bekasi',
      venue: 'Gedung LIBASKOT',
      startDate: new Date('2026-01-17T08:00:00Z'),
      endDate: new Date('2026-01-17T17:00:00Z'),
      status: 'COMPLETED',
    },
    {
      title: 'LKBB GALAKSI',
      slug: 'lkbb-galaksi-kediri',
      description: 'Lomba Kreasi Baris-berbaris GALAKSI SMAN 2 Kota Kediri',
      location: 'Kediri',
      venue: 'SMAN 2 KOTA KEDIRI',
      startDate: new Date('2026-05-16T08:00:00Z'),
      endDate: new Date('2026-05-16T17:00:00Z'),
      status: 'PUBLISHED',
      isPinned: true,
      pinnedOrder: 3,
    },
    {
      title: 'LPSC 2026',
      slug: 'lpsc-2026',
      description: 'Lomba Paskibra Simpaskor Championship 2026',
      location: 'Kalimantan Barat',
      venue: 'GOR Kalimantan Barat',
      startDate: new Date('2026-02-13T08:00:00Z'),
      endDate: new Date('2026-02-13T17:00:00Z'),
      status: 'PUBLISHED',
      isPinned: true,
      pinnedOrder: 4,
    },
    {
      title: 'LKBB FRIENDSHIP RACE 6.0',
      slug: 'lkbb-friendship-race-6-0',
      description: 'Lomba Kreasi Baris-berbaris Friendship Race Season 6',
      location: 'Kota Tangerang',
      venue: 'SMA AN NURMANIYAH CILEDUG',
      startDate: new Date('2026-04-25T08:00:00Z'),
      endDate: new Date('2026-04-25T17:00:00Z'),
      status: 'PUBLISHED',
      isPinned: true,
      pinnedOrder: 5,
    },
  ];

  for (const eventData of eventsData) {
    const existingEvent = await prisma.event.findFirst({
      where: { slug: eventData.slug },
    });

    if (!existingEvent) {
      const event = await prisma.event.create({
        data: {
          ...eventData,
          registrationDeadline: new Date(
            eventData.startDate.getTime() - 7 * 24 * 60 * 60 * 1000
          ), // 7 days before
          maxParticipants: 100,
          currentParticipants: 0,
          registrationFee: 250000,
          organizer: 'Simpaskor Platform',
          contactEmail: 'info@simpaskor.com',
          contactPhone: '081234567890',
          featured: eventData.isPinned || false,
          isPinned: eventData.isPinned || false,
          pinnedOrder: eventData.pinnedOrder || null,
          wizardStep: 0,
          wizardCompleted: true,
          createdById: panitia.id,
        },
      });

      // Assign assessment categories to the event
      for (const category of allAssessmentCategories) {
        await prisma.eventAssessmentCategory.create({
          data: {
            eventId: event.id,
            assessmentCategoryId: category.id,
            isRequired: true,
            customMaxScore: 100,
          },
        });
      }

      // Set school category limits for the event
      for (const category of allSchoolCategories) {
        await prisma.eventSchoolCategoryLimit.create({
          data: {
            eventId: event.id,
            schoolCategoryId: category.id,
            maxParticipants: 25,
            currentParticipants: 0,
          },
        });
      }

      console.log(`✅ Created Event: ${event.title}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${eventData.title}`);
    }
  }

  // Also create the original sample event
  const sampleEvent = await prisma.event.upsert({
    where: { slug: 'lomba-paskibra-nasional-2026' },
    update: {},
    create: {
      title: 'Lomba Paskibra Tingkat Nasional 2026',
      slug: 'lomba-paskibra-nasional-2026',
      description:
        'Kompetisi Pasukan Pengibar Bendera tingkat nasional untuk kategori SD, SMP, SMA, dan Purna. Event ini bertujuan untuk meningkatkan kualitas dan prestasi Paskibra di Indonesia.',
      startDate: new Date('2026-08-17T08:00:00Z'),
      endDate: new Date('2026-08-19T17:00:00Z'),
      registrationDeadline: new Date('2026-07-31T23:59:59Z'),
      location: 'Jakarta',
      venue: 'Istora Senayan',
      maxParticipants: 100,
      currentParticipants: 0,
      registrationFee: 500000,
      organizer: 'Simpaskor Platform',
      contactEmail: 'info@simpaskor.com',
      contactPhone: '081234567890',
      status: 'PUBLISHED',
      featured: true,
      isPinned: true,
      pinnedOrder: 0,
      createdById: panitia.id,
    },
  });
  console.log('✅ Created Sample Event:', sampleEvent.title);

  // Assign assessment categories to the sample event
  for (const category of allAssessmentCategories) {
    await prisma.eventAssessmentCategory.upsert({
      where: {
        eventId_assessmentCategoryId: {
          eventId: sampleEvent.id,
          assessmentCategoryId: category.id,
        },
      },
      update: {},
      create: {
        eventId: sampleEvent.id,
        assessmentCategoryId: category.id,
        isRequired: true,
        customMaxScore: 100,
      },
    });
  }
  console.log('✅ Linked assessment categories to event');

  // Set school category limits for the event
  for (const category of allSchoolCategories) {
    await prisma.eventSchoolCategoryLimit.upsert({
      where: {
        eventId_schoolCategoryId: {
          eventId: sampleEvent.id,
          schoolCategoryId: category.id,
        },
      },
      update: {},
      create: {
        eventId: sampleEvent.id,
        schoolCategoryId: category.id,
        maxParticipants: 25,
        currentParticipants: 0,
      },
    });
  }
  console.log('✅ Set school category limits for event');

  // ============================================================================
  // STEP 6: Ensure Default Guides
  // ============================================================================
  console.log('\n📚 Ensuring default guides...');
  await seedGuides(prisma);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Database seeding completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📝 Summary:\n');
  console.log('👤 Users Created:');
  console.log('   • SuperAdmin: superadmin@simpaskor.id  / nobunaga1945');
  console.log('   • Panitia:    panitia@simpaskor.com    / Panitia123!');
  console.log('   • Juri:       juri@simpaskor.com       / Juri123!');
  console.log('   • Peserta:    demo@simpaskor.com       / password123');
  console.log('   • Pelatih:    pelatih@simpaskor.com    / Pelatih123!');
  console.log('\n🏫 School Categories: SD, SMP, SMA, PURNA');
  console.log('📊 Assessment Categories: PBB, KOMANDAN, VARIASI, FORMASI, KOSTUM_MAKEUP');
  console.log('🎟️ Event Coupons: 3 coupons created');
  console.log('🎯 Sample Events: 27 events created (from production database)');
  console.log('\n🌐 Access the application at: http://localhost:5173');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
