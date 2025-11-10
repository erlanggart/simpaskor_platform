const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting participant count synchronization...\n');
  
  // Get all events
  const events = await prisma.event.findMany({
    include: {
      schoolCategoryLimits: true,
      participations: {
        where: {
          status: 'CONFIRMED'
        },
        include: {
          groups: {
            where: {
              status: 'ACTIVE'
            }
          }
        }
      }
    }
  });
  
  for (const event of events) {
    console.log(`\nProcessing event: ${event.title}`);
    
    // Calculate total confirmed participants
    let totalConfirmed = 0;
    const categoryCount = {};
    
    for (const participation of event.participations) {
      const groupCount = participation.groups.length;
      totalConfirmed += groupCount;
      
      const categoryId = participation.schoolCategoryId;
      categoryCount[categoryId] = (categoryCount[categoryId] || 0) + groupCount;
    }
    
    console.log(`  Total confirmed participants: ${totalConfirmed}`);
    console.log(`  Current count in DB: ${event.currentParticipants}`);
    
    // Update event total
    await prisma.event.update({
      where: { id: event.id },
      data: {
        currentParticipants: totalConfirmed
      }
    });
    
    // Update each school category limit
    for (const limit of event.schoolCategoryLimits) {
      const count = categoryCount[limit.schoolCategoryId] || 0;
      const categoryName = limit.schoolCategoryId; // We'll show ID for now
      
      console.log(`  Category ${categoryName}: ${count} confirmed`);
      
      await prisma.eventSchoolCategoryLimit.update({
        where: { id: limit.id },
        data: {
          currentParticipants: count
        }
      });
    }
    
    console.log(`  ✓ Event updated`);
  }
  
  console.log('\n✓ Synchronization completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
