// AI-Tinerary MVP Backend
// Simplified: One intake per unit

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// DATABASE
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✓ Database connected:', res.rows[0]);
  }
});

app.locals.db = pool;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ROUTES
// ============================================================================

// TRIPS
app.post('/api/trips', async (req, res) => {
  const { trip_name, destination, start_date, end_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO trips (trip_name, destination, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [trip_name, destination, start_date, end_date]
    );
    res.status(201).json({ trip: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trips/:trip_id', async (req, res) => {
  try {
    const tripResult = await pool.query('SELECT * FROM trips WHERE trip_id = $1 AND deleted_at IS NULL', [req.params.trip_id]);
    if (tripResult.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    
    const unitsResult = await pool.query('SELECT * FROM units WHERE trip_id = $1', [req.params.trip_id]);
    const travelersResult = await pool.query('SELECT * FROM travelers WHERE trip_id = $1', [req.params.trip_id]);
    
    res.json({ trip: tripResult.rows[0], units: unitsResult.rows, travelers: travelersResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trips/:trip_id', async (req, res) => {
  try {
    await pool.query('UPDATE trips SET deleted_at = NOW() WHERE trip_id = $1', [req.params.trip_id]);
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNITS (Groups)
app.post('/api/units', async (req, res) => {
  const { trip_id, unit_name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO units (trip_id, unit_name) VALUES ($1, $2) RETURNING *',
      [trip_id, unit_name]
    );
    res.status(201).json({ unit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/units/:unit_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units WHERE unit_id = $1', [req.params.unit_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json({ unit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INTAKE (One per unit)
app.put('/api/units/:unit_id/intake', async (req, res) => {
  const { intake_answers } = req.body;
  try {
    const result = await pool.query(
      'UPDATE units SET intake_answers = $1, updated_at = NOW() WHERE unit_id = $2 RETURNING *',
      [JSON.stringify(intake_answers), req.params.unit_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unit not found' });
    res.json({ unit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TRAVELERS (Names only)
app.post('/api/travelers', async (req, res) => {
  const { unit_id, trip_id, name, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO travelers (unit_id, trip_id, name, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [unit_id, trip_id, name, email]
    );
    res.status(201).json({ traveler: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/travelers/:unit_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM travelers WHERE unit_id = $1', [req.params.unit_id]);
    res.json({ travelers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ITINERARIES (Claude generation)
app.post('/api/itineraries/:trip_id/generate', async (req, res) => {
  try {
    // Get trip info
    const tripResult = await pool.query('SELECT * FROM trips WHERE trip_id = $1', [req.params.trip_id]);
    if (tripResult.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripResult.rows[0];

    // Get unit with intake
    const unitResult = await pool.query('SELECT * FROM units WHERE trip_id = $1 LIMIT 1', [req.params.trip_id]);
    if (unitResult.rows.length === 0) return res.status(404).json({ error: 'No unit found' });
    const unit = unitResult.rows[0];

    // Build prompt for Claude
    const prompt = `
You are an expert travel itinerary planner. Create a detailed, day-by-day itinerary.

TRIP:
- Destination: ${trip.destination}
- Duration: ${trip.start_date} to ${trip.end_date}

TRAVELER PREFERENCES:
${unit.intake_answers ? JSON.stringify(unit.intake_answers, null, 2) : 'No preferences'}

Return ONLY valid JSON (no markdown, no extra text):
{
  "title": "Itinerary Title",
  "destination": "${trip.destination}",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00-12:00",
          "activity": "Activity Name",
          "description": "Description",
          "location": "Location"
        }
      ]
    }
  ]
}`;

    // Call Claude
    const response = await require('axios').post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    });

    let itineraryText = response.data.content[0].text;
    // Remove markdown if present
    itineraryText = itineraryText.replace(/```json\n?|\n?```/g, '').trim();
    const itinerary = JSON.parse(itineraryText);

    // Get next version
    const versionResult = await pool.query(
      'SELECT MAX(version_number) as max_version FROM itineraries WHERE trip_id = $1',
      [req.params.trip_id]
    );
    const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

    // Mark old version as not current
    await pool.query('UPDATE itineraries SET is_current = false WHERE trip_id = $1 AND is_current = true', [req.params.trip_id]);

    // Save new itinerary
    const itineraryResult = await pool.query(
      'INSERT INTO itineraries (trip_id, version_number, itinerary_output, is_current, expiration_date) VALUES ($1, $2, $3, true, $4) RETURNING *',
      [req.params.trip_id, nextVersion, JSON.stringify(itinerary), trip.end_date]
    );

    res.status(201).json({ itinerary: itineraryResult.rows[0] });
  } catch (err) {
    console.error('Error generating itinerary:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/itineraries/trip/:trip_id/current', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM itineraries WHERE trip_id = $1 AND is_current = true AND deleted_at IS NULL LIMIT 1',
      [req.params.trip_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No itinerary found' });
    res.json({ itinerary: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACCESS TOKENS (Email only)
app.post('/api/access-tokens/:trip_id/email', async (req, res) => {
  try {
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.query(
      'INSERT INTO trip_access_tokens (trip_id, token_value, expires_at) VALUES ($1, $2, $3)',
      [req.params.trip_id, token, expiresAt]
    );

    const accessLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/trips/${req.params.trip_id}?token=${token}`;
    res.json({ access_link: accessLink, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║       AI-Tinerary MVP Backend                             ║
║       Port: ${PORT}                                           ║
║       Status: Running                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});
