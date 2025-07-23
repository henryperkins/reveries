import { prisma } from './prisma.js'

async function testRelations() {
  try {
    console.log('🔍 Testing Prisma relations...')

    // Test user with related sessions
    const userWithSessions = await prisma.user.findFirst({
      include: {
        researchSessions: {
          include: {
            researchSteps: true,
            researchSources: true
          }
        }
      }
    })

    if (userWithSessions) {
      console.log('✅ User found with sessions:', {
        userId: userWithSessions.id,
        sessionId: userWithSessions.sessionId,
        sessionCount: userWithSessions.researchSessions.length,
        firstSession: userWithSessions.researchSessions[0] ? {
          id: userWithSessions.researchSessions[0].id,
          title: userWithSessions.researchSessions[0].title,
          stepCount: userWithSessions.researchSessions[0].researchSteps.length,
          sourceCount: userWithSessions.researchSessions[0].researchSources.length
        } : null
      })
    }

    // Test session with all related data
    const sessionWithData = await prisma.researchSession.findFirst({
      include: {
        user: true,
        researchSteps: {
          include: {
            researchSources: true,
            functionCalls: true
          }
        },
        researchSources: true,
        graphNodes: true,
        graphEdges: true,
        functionCalls: true
      }
    })

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
    })

    console.log('✅ Aggregation stats:', stats)

    console.log('🎉 All relation tests passed!')

  } catch (error) {
    console.error('❌ Relation test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testRelations().catch((error) => {
  console.error('❌ Relation test script failed:', error)
  process.exit(1)
})
