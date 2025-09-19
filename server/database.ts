import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../shared/schema';

// Create SQLite database connection
const sqlite = new Database('./database.sqlite');
export const db = drizzle(sqlite, { schema });

// Run migrations
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Initialize database
export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing SQLite database...');
    await runMigrations();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

