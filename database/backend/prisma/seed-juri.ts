import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to generate email from name
function generateEmail(name: string): string {
  // Remove titles and clean name
  let cleanName = name
    .replace(/S\.Pd\.?|S\.Par\.?|S\.Kom\.?|S\.Ak\.?|S\.Hub\.Int\.?|S\.M\.?|M\.Sn\.?|A\.Md\.?|Far\.?|S\.Tr\.KM\.?|M\.M\.?|C\.Ps\.?|S\.Pi\.?/gi, '')
    .replace(/\(.*?\)/g, '') // Remove text in parentheses
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '.') // Replace spaces with dots
    .toLowerCase()
    .trim()
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .replace(/\.+/g, '.'); // Replace multiple dots with single dot

  // Remove common prefixes
  cleanName = cleanName
    .replace(/^(kang|teh|ka|kak|pak|bu|bapak|bang|serka|serma|sertu|peltu|pelda|koptu|kopka|mayor|letda|lettu|kapten|bripda|briptu|aipda|aiptu|srd|dr)\.?/gi, '')
    .replace(/^\.+/, '');

  if (!cleanName) {
    cleanName = name.toLowerCase().replace(/[^\w]/g, '');
  }

  return `${cleanName}@simpaskor.id`;
}

// List of unique juri names from database (cleaned and consolidated)
const juriNames = [
  // A
  'Adam Garmana',
  'Adang Yanuar',
  'Adi Prasetyo',
  'Agus Purwanto',
  'Ahmad Jueni',
  'Amirullah Rakadani',
  'Andri Saputra Asnan',
  'Angga Hermawan',
  'Anggi',
  'Ani Krisnawati',
  'Anisa Hasya Nazhara',
  'Arinto Prihatmoko',
  'Ary Andryana',
  'Aulia S. Humaira',
  
  // B
  'Bahari Pradana',
  'Bambang Santoso',
  'Bambang Sutejo',
  'Bentar Wardana',
  'Billy',
  'Budi Santoso',
  
  // C
  'Cakra Bagaskara',
  'Cecep Zakaria',
  'Chaerul Imam',
  'Cindy F. Lestari',
  
  // D
  'Dandung',
  'Dani',
  'David',
  'Dedeh',
  'Dedi Irawan',
  'Deni Setiawan',
  'Didik Wulyanto',
  'Dimas',
  'Dinar',
  'Dinda',
  'Dodi Ahmadijaya',
  'Doni Eduardo',
  'Dony',
  'Dwi',
  'Dwi Adhi Purnomo',
  'Dwina Christy Siregar',
  
  // E
  'Edy',
  'Edy Supriyanto',
  'Eko',
  'Eko Juli Setiawan',
  'Ela Kusyanti',
  'Elisa',
  'Eman',
  'Erly Firdayati Arianti',
  'Ervin',
  'Estu',
  'Eza Pratama',
  'Ezhar',
  
  // F
  'Fahrul',
  'Faisal Afandi',
  'Fajrin Saputra',
  'Falix',
  'Fazri',
  'Feme Adella Sofia',
  'Firdza DJ',
  'Fitriyadi',
  
  // G
  'Gifari',
  'Guntur',
  
  // H
  'Hendra Tandu',
  'Hengki',
  'Herudin',
  
  // I
  'Ida',
  'Ika',
  'Ilham Lahia',
  'Irma',
  'Irman',
  
  // J
  'Jafar',
  'Jangkung',
  'Jaya Saputra',
  'Jenal',
  'JP',
  'Jueni Ahmad',
  
  // K
  'Kamim',
  'Karna',
  'Kiki Syarief',
  'Kim Kurniawan',
  'Komandin',
  'Kusno',
  'Kusvianto',
  
  // L
  'Ladi',
  'Lia Emilia',
  'Lidya',
  'Lucky',
  'Lukman',
  
  // M
  'Makruf',
  'Meta',
  'Michelle Luna',
  'Miftahul Jannah',
  'Minna Nur Rahman',
  'Muji',
  'Muhammad Fahrul',
  'Munir',
  'Mydani Gustiani',
  
  // N
  'Nazar Rusly',
  'Nazwa',
  'Nessya',
  'Nur Adly',
  
  
  
  // P
  'Pabos',
  'Pingkan Ardhana Rheswari',
  'Ponpon Rivana',
  'Prasanta',
  
  // R
  'Rafi Taufik',
  'Ratu Ayu Salsabila',
  'Rensa',
  'Reza',
  'Rifal',
  'Riswan',
  'Roki Punggawa',
  'Roni',
  'Roni Anggriawan Saputra',
  
  // S
  'Sabella Nadya Azzahra',
  'Sandi Gifari',
  'Sandi',
  'Setyo Aji',
  'Shihab',
  'Sonni',
  'Sugeng',
  'Sugeng Pranoto',
  'Sungging',
  'Suprat',
  'Suroto',
  'Suryadi',
  'Susilo',
  'Suwanto',
  'Suyoto',
  'Syahrul',
  'Syam Yoga Pratama',
  
  // T
  'Teguh Ramadhan',
  'Tegar Prasetiyo',
  'Tito Riansyah',
  'Tiur Indri Rohani Manurung',
  'Toto',
  
  // U
  'Ujang',
  'Usep',
  'Uthe',
  
  // W
  'Wawan',
  'Wawan Kamiel',
  'Wisnu Dermawan',
  
  // Y
  'Y. Adityanto Aji',
  'Yoda Hadi',
  'Yoga',
  'Yuda',
  'Yudith',
  'Yudith Febry',
  
  // Z
  'Zimri',
  'Zulkifli',
];

async function main() {
  console.log('🌱 Starting juri database seeding...\n');

  const defaultPassword = await bcrypt.hash('simpaskor', 12);
  
  let created = 0;
  let skipped = 0;
  const usedEmails = new Set<string>();

  for (const name of juriNames) {
    let email = generateEmail(name);
    
    // Handle duplicate emails
    let counter = 1;
    const baseEmail = email;
    while (usedEmails.has(email)) {
      email = baseEmail.replace('@', `${counter}@`);
      counter++;
    }
    usedEmails.add(email);

    try {
      // Check if email already exists
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`⏭️  Skipped (exists): ${name} - ${email}`);
        skipped++;
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPassword,
          name,
          role: 'JURI',
          status: 'ACTIVE',
          emailVerified: true,
          profile: {
            create: {
              institution: 'Simpaskor',
              city: 'Indonesia',
              province: 'Indonesia',
            },
          },
        },
      });

      console.log(`✅ Created: ${name} - ${email}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${juriNames.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
