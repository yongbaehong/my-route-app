import { SQLiteDatabase } from "expo-sqlite";

export const initializeDatabase = async (db: SQLiteDatabase) => {
  // Create the stops table if it doesn't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stops (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      nickname TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      is_important INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      display_order INTEGER NOT NULL,
      is_start INTEGER DEFAULT 0
    );
  `);

  // Try to add is_start column if it doesn't exist (for existing databases)
  try {
    await db.execAsync(`
      ALTER TABLE stops ADD COLUMN is_start INTEGER DEFAULT 0;
    `);
  } catch (error) {
    // Column likely already exists, ignore error
    console.log("is_start column may already exist or other schema error");
  }
};

// For future migrations, add functions here
// export const migrateDatabase = async (db: SQLiteDatabase) => {
//   // Example: add a new column
//   // await db.execAsync(`ALTER TABLE stops ADD COLUMN new_column TEXT;`);
// };
