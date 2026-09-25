-- AI-Tinerary MVP Schema
-- Simplified: One intake per unit, no multi-unit voting or splits
-- PostgreSQL 15+

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================

CREATE TABLE trips (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- UNITS TABLE (Groups)
-- ============================================================================

CREATE TABLE units (
  unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  unit_name VARCHAR(255) NOT NULL,
  
  -- ONE intake per unit (stored as JSON)
  intake_answers JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_trip_id (trip_id)
);

-- ============================================================================
-- TRAVELERS TABLE (Just names/emails, reference only)
-- ============================================================================

CREATE TABLE travelers (
  traveler_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(unit_id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_unit_id (unit_id),
  INDEX idx_trip_id (trip_id)
);

-- ============================================================================
-- ITINERARIES TABLE (Versioned)
-- ============================================================================

CREATE TABLE itineraries (
  itinerary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  generation_timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Full itinerary output from Claude
  itinerary_output JSONB NOT NULL,
  
  -- Version tracking
  is_current BOOLEAN DEFAULT true,
  expiration_date DATE NOT NULL,
  deleted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(trip_id, version_number),
  INDEX idx_trip_id (trip_id),
  INDEX idx_is_current (is_current),
  INDEX idx_expiration_date (expiration_date)
);

-- ============================================================================
-- ACCESS TOKENS TABLE (Email only, no passcodes for MVP)
-- ============================================================================

CREATE TABLE trip_access_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  
  token_value TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  first_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  is_valid BOOLEAN DEFAULT true,
  
  INDEX idx_trip_id (trip_id),
  INDEX idx_token_value (token_value),
  INDEX idx_expires_at (expires_at)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-delete expired itineraries (run daily via cron)
CREATE OR REPLACE FUNCTION auto_delete_expired_itineraries()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  deleted_count INT;
BEGIN
  UPDATE itineraries
  SET deleted_at = NOW()
  WHERE deleted_at IS NULL
    AND expiration_date <= CURRENT_DATE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get current itinerary for a trip
CREATE OR REPLACE FUNCTION get_current_itinerary(trip_uuid UUID)
RETURNS SETOF itineraries AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM itineraries
  WHERE trip_id = trip_uuid
    AND is_current = true
    AND deleted_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
