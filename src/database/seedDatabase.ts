import { prisma } from './prisma.js'

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with initial data...')

    // Create a test user
    const user = await prisma.user.create({
      data: {
        sessionId: 'development-session',
        preferences: {
          theme: 'westworld',
          defaultModel: 'gemini-2.5-flash',
          defaultEffort: 'Medium'
        }
      }
    })
    console.log('✅ Created user:', user.id)

    // Create a test research session
    const session = await prisma.researchSession.create({
      data: {
        userId: user.id,
        sessionId: 'test-session-001',
        query: 'How does quantum computing work?',
        title: 'Understanding Quantum Computing',
        status: 'active',
        modelType: 'gemini-2.5-flash',
        effortLevel: 'Medium',
        paradigm: 'bernard',
        paradigmProbabilities: {
          bernard: 0.8,
          dolores: 0.1,
          maeve: 0.05,
          teddy: 0.05
        },
        metadata: {
          queryType: 'analytical',
          domain: 'technology'
        }
      }
    })
    console.log('✅ Created research session:', session.id)

    // Create a test research step
    const step = await prisma.researchStep.create({
      data: {
        sessionId: session.id,
        stepId: 'step-001',
        stepType: 'search',
        title: 'Initial quantum computing search',
        content: 'Searching for information about quantum computing principles...',
        stepIndex: 1,
        status: 'completed',
        metadata: {
          searchTerms: ['quantum computing', 'qubits', 'superposition'],
          confidence: 0.85
        }
      }
    })
    console.log('✅ Created research step:', step.id)

    // Create a test source
    const source = await prisma.researchSource.create({
      data: {
        sessionId: session.id,
        stepId: step.id,
        url: 'https://example.com/quantum-computing',
        title: 'Introduction to Quantum Computing',
        name: 'Quantum Computing Guide',
        authors: ['Dr. Alice Quantum', 'Prof. Bob Superposition'],
        year: 2024,
        snippet: 'Quantum computing harnesses quantum mechanics to process information...',
        domain: 'quantum-computing.com',
        metadata: {
          relevanceScore: 0.92,
          sourceType: 'academic'
        }
      }
    })
    console.log('✅ Created research source:', source.id)

    console.log('🎉 Database seeding completed successfully!')

    // Verify the data - use type assertion to resolve Prisma Accelerate type issues
    const userCount = await (prisma.user.count as any)() as number
    const sessionCount = await (prisma.researchSession.count as any)() as number
    const stepCount = await (prisma.researchStep.count as any)() as number
    const sourceCount = await (prisma.researchSource.count as any)() as number

    console.log('\n📊 Database summary:')
    console.log(`   Users: ${userCount}`)
    console.log(`   Research Sessions: ${sessionCount}`)
    console.log(`   Research Steps: ${stepCount}`)
    console.log(`   Research Sources: ${sourceCount}`)

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedDatabase().catch((error) => {
  console.error('❌ Seed script failed:', error)
  process.exit(1)
})
