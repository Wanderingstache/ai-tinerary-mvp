import React, { useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function App() {
  const [stage, setStage] = useState('trip');
  const [trip, setTrip] = useState({ trip_name: '', destination: '', start_date: '', end_date: '' });
  const [unit, setUnit] = useState({ unit_id: null, unit_name: '' });
  const [travelers, setTravelers] = useState([{ name: '', email: '' }]);
  const [intake, setIntake] = useState({
    budget: '',
    pace: 'balanced',
    interests: [],
    accessibility: '',
    dietary: '',
  });
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [unitId, setUnitId] = useState(null);
  const [error, setError] = useState(null);

  // ========================================================================
  // STAGE 1: Create Trip
  // ========================================================================

  const createTrip = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trip),
      });
      const data = await res.json();
      setTripId(data.trip.trip_id);
      setStage('unit');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========================================================================
  // STAGE 2: Create Unit
  // ========================================================================

  const createUnit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, unit_name: unit.unit_name }),
      });
      const data = await res.json();
      setUnitId(data.unit.unit_id);
      setStage('travelers');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========================================================================
  // STAGE 3: Add Travelers
  // ========================================================================

  const addTraveler = async () => {
    setLoading(true);
    try {
      for (const traveler of travelers) {
        await fetch(`${API_URL}/api/travelers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unitId, trip_id: tripId, name: traveler.name, email: traveler.email }),
        });
      }
      setStage('intake');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========================================================================
  // STAGE 4: Intake Form
  // ========================================================================

  const submitIntake = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/units/${unitId}/intake`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_answers: intake }),
      });
      setStage('generate');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========================================================================
  // STAGE 5: Generate Itinerary
  // ========================================================================

  const generateItinerary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/itineraries/${tripId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setItinerary(JSON.parse(data.itinerary.itinerary_output));
      setStage('itinerary');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="app">
      <header className="header">
        <h1>🌍 AI-Tinerary</h1>
        <p>Create your perfect itinerary</p>
      </header>

      {error && <div className="error">{error}</div>}

      {/* STAGE 1: Trip Creation */}
      {stage === 'trip' && (
        <div className="stage">
          <h2>Step 1: Plan Your Trip</h2>
          <input
            type="text"
            placeholder="Trip name (e.g., Paris Adventure)"
            value={trip.trip_name}
            onChange={(e) => setTrip({ ...trip, trip_name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Destination"
            value={trip.destination}
            onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
          />
          <input
            type="date"
            value={trip.start_date}
            onChange={(e) => setTrip({ ...trip, start_date: e.target.value })}
          />
          <input
            type="date"
            value={trip.end_date}
            onChange={(e) => setTrip({ ...trip, end_date: e.target.value })}
          />
          <button onClick={createTrip} disabled={loading}>
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      )}

      {/* STAGE 2: Unit Creation */}
      {stage === 'unit' && (
        <div className="stage">
          <h2>Step 2: Define Your Group</h2>
          <input
            type="text"
            placeholder="Group name (e.g., Smith Family)"
            value={unit.unit_name}
            onChange={(e) => setUnit({ ...unit, unit_name: e.target.value })}
          />
          <button onClick={createUnit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      )}

      {/* STAGE 3: Travelers */}
      {stage === 'travelers' && (
        <div className="stage">
          <h2>Step 3: Add Travelers</h2>
          {travelers.map((t, i) => (
            <div key={i} className="traveler-form">
              <input
                type="text"
                placeholder="Name"
                value={t.name}
                onChange={(e) => {
                  const newTravelers = [...travelers];
                  newTravelers[i].name = e.target.value;
                  setTravelers(newTravelers);
                }}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={t.email}
                onChange={(e) => {
                  const newTravelers = [...travelers];
                  newTravelers[i].email = e.target.value;
                  setTravelers(newTravelers);
                }}
              />
            </div>
          ))}
          <button onClick={() => setTravelers([...travelers, { name: '', email: '' }])}>
            + Add Another Traveler
          </button>
          <button onClick={addTraveler} disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      )}

      {/* STAGE 4: Intake Form */}
      {stage === 'intake' && (
        <div className="stage">
          <h2>Step 4: Travel Preferences</h2>
          <label>
            Budget (USD):
            <input
              type="number"
              value={intake.budget}
              onChange={(e) => setIntake({ ...intake, budget: e.target.value })}
            />
          </label>
          <label>
            Pace:
            <select value={intake.pace} onChange={(e) => setIntake({ ...intake, pace: e.target.value })}>
              <option value="slower">Slower (more time per place)</option>
              <option value="balanced">Balanced</option>
              <option value="faster">Faster (see more)</option>
            </select>
          </label>
          <label>
            Must-see attractions:
            <textarea
              placeholder="e.g., Eiffel Tower, Louvre, local cafes"
              value={intake.interests}
              onChange={(e) => setIntake({ ...intake, interests: e.target.value })}
            />
          </label>
          <label>
            Accessibility needs:
            <input
              type="text"
              placeholder="e.g., wheelchair accessible, mobility aid"
              value={intake.accessibility}
              onChange={(e) => setIntake({ ...intake, accessibility: e.target.value })}
            />
          </label>
          <label>
            Dietary restrictions:
            <input
              type="text"
              placeholder="e.g., vegetarian, gluten-free"
              value={intake.dietary}
              onChange={(e) => setIntake({ ...intake, dietary: e.target.value })}
            />
          </label>
          <button onClick={submitIntake} disabled={loading}>
            {loading ? 'Saving...' : 'Continue to Generate'}
          </button>
        </div>
      )}

      {/* STAGE 5: Generate */}
      {stage === 'generate' && !itinerary && (
        <div className="stage">
          <h2>Step 5: Generate Your Itinerary</h2>
          <p>Claude AI will now create a personalized itinerary based on your preferences.</p>
          <button onClick={generateItinerary} disabled={loading}>
            {loading ? 'Generating... (this may take 30 seconds)' : 'Generate Itinerary'}
          </button>
        </div>
      )}

      {/* ITINERARY DISPLAY */}
      {stage === 'itinerary' && itinerary && (
        <div className="stage itinerary">
          <h2>{itinerary.title}</h2>
          <p className="destination">{itinerary.destination}</p>
          {itinerary.days && itinerary.days.map((day) => (
            <div key={day.day_number} className="day">
              <h3>Day {day.day_number} - {day.date}</h3>
              {day.activities && day.activities.map((activity, i) => (
                <div key={i} className="activity">
                  <div className="time">{activity.time}</div>
                  <div className="activity-content">
                    <strong>{activity.activity || activity.activity_name}</strong>
                    <p>{activity.description}</p>
                    <small>{activity.location}</small>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={() => setStage('trip')}>Start New Trip</button>
        </div>
      )}

      <footer className="footer">
        <p>Powered by Claude AI | wanderingmustache.com</p>
      </footer>
    </div>
  );
}
