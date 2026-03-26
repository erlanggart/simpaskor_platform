const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const registrations = await prisma.eventParticipation.findMany({
    where: {
      eventId: '02896c03-79e5-4f9c-8dfc-b8fa122fc5d2' // karismatis
    },
    include: {
      user: { select: { name: true, email: true } },
      schoolCategory: { select: { name: true } },
      groups: {
        where: { status: 'ACTIVE' }
      }
    }
  });
  
  console.log(JSON.stringify(registrations, null, 2));
}

main().finally(() => prisma.$disconnect());
