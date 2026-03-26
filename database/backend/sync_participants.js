const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting participant count synchronization...\n');
  
  // Get all events
  const events = await prisma.event.findMany({
    include: {
      schoolCategoryLimits: {
        include: {
          schoolCategory: true
        }
      },
      participations: {
        where: {
          status: 'CONFIRMED'
        },
        include: {
          groups: {
            where: {
              status: 'ACTIVE'
            },
            select: {
              id: true,
              schoolCategoryId: true
            }
          }
        }
      }
    }
  });
  
  for (const event of events) {
    console.log(`\nProcessing event: ${event.title}`);
    
    // Calculate total confirmed participants based on groups
    let totalConfirmed = 0;
    const categoryCount = {};
    
    for (const participation of event.participations) {
      for (const group of participation.groups) {
        totalConfirmed += 1;
        
        // Count by the group's school category, not the participation's
        const categoryId = group.schoolCategoryId;
        if (categoryId) {
          categoryCount[categoryId] = (categoryCount[categoryId] || 0) + 1;
        }
      }
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
      const categoryName = limit.schoolCategory?.name || limit.schoolCategoryId;
      
      console.log(`  Category ${categoryName}: ${count} confirmed (was: ${limit.currentParticipants})`);
      
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
