import { databaseService } from '../services/databaseService';

async function testDatabaseConnection() {
  console.log('Testing database connection...\n');

  console.log('Configuration:');
  console.log(`Host: ${process.env.PGHOST || 'localhost'}`);
  console.log(`Port: ${process.env.PGPORT || '5432'}`);
  console.log(`Database: ${process.env.PGDATABASE || 'reveries'}`);
  console.log(`User: ${process.env.PGUSER || 'postgres'}`);
  console.log(`SSL: ${process.env.PGHOST?.includes('database.azure.com') ? 'Enabled' : 'Disabled'}`);
  console.log('');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    await databaseService.initializeSchema();
    console.log('✓ Connection successful');

    // Test write operation
    console.log('\n2. Testing write operation...');
    const testSessionId = `test-${Date.now()}`;
    await databaseService.saveResearchSession(
      testSessionId,
      {
        title: 'Test Session',
        description: 'Testing database connectivity'
      }
    );
    console.log('✓ Write operation successful');

    // Test read operation
    console.log('\n3. Testing read operation...');
    const session = await databaseService.getResearchSession(testSessionId);
    console.log('✓ Read operation successful');
    console.log(`  Retrieved session: ${session.title}`);

    // Test recent sessions query
    console.log('\n4. Testing query operation...');
    const recentSessions = await databaseService.getRecentSessions(5);
    console.log(`✓ Query successful, found ${recentSessions.length} sessions`);

    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection();
}

export { testDatabaseConnection };
