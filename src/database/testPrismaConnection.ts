import { prisma } from './prisma.js'

async function testPrismaConnection() {
  try {
    console.log('🔗 Testing Prisma connection to Accelerate...')

    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)

    // Test user count (should be at least 1 from the init script)
    const userCount = await prisma.user.count()
    console.log(`📊 Users in database: ${userCount}`)

    // Test session count
    const sessionCount = await prisma.researchSession.count()
    console.log(`📊 Research sessions in database: ${sessionCount}`)

    console.log('🎉 Prisma Accelerate connection test completed successfully!')

  } catch (error) {
    console.error('❌ Prisma connection test failed:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      if ('code' in error) {
        console.error('Error code:', error.code)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testPrismaConnection().catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})
