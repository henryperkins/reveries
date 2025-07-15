import { databaseService } from '../services/databaseService';

async function initializeDatabase() {
  console.log('Initializing database schema...\n');

  try {
    await databaseService.initializeSchema();
    console.log('✅ Database schema initialized successfully!');

    // Optional: Insert sample data
    if (process.argv.includes('--sample-data')) {
      console.log('\nInserting sample data...');

      await databaseService.saveResearchSession(
        'sample-session-1',
        'AI Ethics Research',
        'Exploring ethical implications of artificial intelligence'
      );

      await databaseService.saveResearchSession(
        'sample-session-2',
        'Climate Change Solutions',
        'Researching innovative approaches to combat climate change'
      );

      console.log('✅ Sample data inserted successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };
