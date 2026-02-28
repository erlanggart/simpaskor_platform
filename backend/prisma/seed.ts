import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  // STEP 5: Create Sample Event
  // ============================================================================
  console.log('\n🎯 Creating sample event...');

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
      pinnedOrder: 1,
      createdById: panitia.id,
    },
  });
  console.log('✅ Created Sample Event:', sampleEvent.title);

  // Assign assessment categories to the event
  const allAssessmentCategories = await prisma.assessmentCategory.findMany();
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
  const allSchoolCategories = await prisma.schoolCategory.findMany();
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

  // Assign panitia to event
  await prisma.panitiaEventAssignment.upsert({
    where: {
      panitiaId_eventId: {
        panitiaId: panitia.id,
        eventId: sampleEvent.id,
      },
    },
    update: {},
    create: {
      panitiaId: panitia.id,
      eventId: sampleEvent.id,
      isActive: true,
    },
  });
  console.log('✅ Assigned panitia to event');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Database seeding completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📝 Summary:\n');
  console.log('👤 Users Created:');
  console.log('   • SuperAdmin: superadmin@simpaskor.com / Admin123!');
  console.log('   • Panitia:    panitia@simpaskor.com    / Panitia123!');
  console.log('   • Juri:       juri@simpaskor.com       / Juri123!');
  console.log('   • Peserta:    demo@simpaskor.com       / password123');
  console.log('   • Pelatih:    pelatih@simpaskor.com    / Pelatih123!');
  console.log('\n🏫 School Categories: SD, SMP, SMA, PURNA');
  console.log('📊 Assessment Categories: PBB, KOMANDAN, VARIASI, FORMASI, KOSTUM_MAKEUP');
  console.log('🎟️ Event Coupons: 3 coupons created');
  console.log('🎯 Sample Events: 1 event created');
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
