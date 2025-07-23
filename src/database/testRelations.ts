import { prisma } from './prisma.js'

async function testRelations() {
  try {
    console.log('🔍 Testing Prisma relations...')

    // Test user with related sessions - simplified to avoid type conflicts
    const userWithSessions = await prisma.user.findFirst({
      include: {
        researchSessions: true
      }
    } as any)

    if (userWithSessions) {
      console.log('✅ User found with sessions:', {
        userId: userWithSessions.id,
        sessionId: userWithSessions.sessionId,
        sessionCount: userWithSessions.researchSessions.length,
        firstSession: userWithSessions.researchSessions[0] ? {
          id: userWithSessions.researchSessions[0].id,
          title: userWithSessions.researchSessions[0].title
        } : null
      })

      // Get detailed data for the first session separately
      if (userWithSessions.researchSessions[0]) {
        const detailedSession = await prisma.researchSession.findUnique({
          where: { id: userWithSessions.researchSessions[0].id },
          include: {
            researchSteps: true,
            researchSources: true
          }
        } as any)

        if (detailedSession) {
          console.log('   Session details:', {
            stepCount: detailedSession.researchSteps.length,
            sourceCount: detailedSession.researchSources.length
          })
        }
      }
    }

    // Test session with all related data - simplified
    const sessionWithData = await prisma.researchSession.findFirst({
      include: {
        user: true,
        researchSteps: true,
        researchSources: true,
        graphNodes: true,
        graphEdges: true,
        functionCalls: true
      }
    } as any)

    if (sessionWithData) {
      console.log('✅ Session found with related data:', {
        sessionId: sessionWithData.id,
        title: sessionWithData.title,
        user: sessionWithData.user.sessionId,
        paradigm: sessionWithData.paradigm,
        steps: sessionWithData.researchSteps.length,
        sources: sessionWithData.researchSources.length,
        nodes: sessionWithData.graphNodes.length,
        edges: sessionWithData.graphEdges.length,
        functionCalls: sessionWithData.functionCalls.length
      })
    }

    // Test aggregation
    const stats = await prisma.researchSession.aggregate({
      _count: {
        id: true
      },
      _avg: {
        totalSteps: true,
        totalSources: true
      }
    } as any)

    console.log('✅ Aggregation stats:', stats)

    console.log('🎉 All relation tests passed!')

  } catch (error) {
    console.error('❌ Relation test failed:', error)
    // Ensure we're throwing an Error object
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(String(error))
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testRelations().catch((error) => {
  console.error('❌ Relation test script failed:', error)
  process.exit(1)
})
