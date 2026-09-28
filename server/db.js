// Database: one PostgreSQL connection pool + automatic table setup on startup.
import pg from 'pg';

const { Pool } = pg;
// Return DATE columns as plain 'YYYY-MM-DD' text (avoids time-zone shifts).
pg.types.setTypeParser(1082, (v) => v);

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL is not set. Add it in Railway → Variables.');
  return pool.query(text, params);
}

// Tables are created automatically if they don't exist yet.
// trips:     one row per trip. Intake answers, traveler cards, AI research,
//            and the finished itinerary are stored as JSON.
// ai_calls:  one row per Claude call, with tokens, searches and cost.
export async function initDb() {
  if (!pool) {
    console.warn('⚠️  No DATABASE_URL. The site will load but trips cannot be saved.');
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS trips (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      destination TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      day_count INT,
      stage TEXT NOT NULL DEFAULT 'basics',
      basics JSONB NOT NULL DEFAULT '{}'::jsonb,
      group_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      travelers JSONB NOT NULL DEFAULT '[]'::jsonb,
      review JSONB NOT NULL DEFAULT '{}'::jsonb,
      research JSONB NOT NULL DEFAULT '{}'::jsonb,
      itinerary JSONB,
      itinerary_versions INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ai_calls (
      id SERIAL PRIMARY KEY,
      trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      step TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INT NOT NULL DEFAULT 0,
      output_tokens INT NOT NULL DEFAULT 0,
      web_searches INT NOT NULL DEFAULT 0,
      cost_usd NUMERIC(10,5) NOT NULL DEFAULT 0,
      duration_ms INT,
      ok BOOLEAN NOT NULL DEFAULT true,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS ai_calls_trip_idx ON ai_calls(trip_id);
  `);
  console.log('✅ Database ready');
}

// Trip Memory rule: itineraries (and the research behind them) are deleted
// once the trip's end date has passed. Intake answers are kept.
export async function purgeFinishedTrips() {
  if (!pool) return;
  const r = await query(`
    UPDATE trips SET itinerary = NULL, research = '{}'::jsonb, updated_at = now()
    WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE AND itinerary IS NOT NULL
  `);
  if (r.rowCount) console.log(`🧹 Cleared itineraries for ${r.rowCount} finished trip(s)`);
}
