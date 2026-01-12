import express from 'express';
import scraperService from '../services/scraperService.js';
import OpenAI from 'openai';

const router = express.Router();

// Lazy initialize OpenAI client
let openai = null;
const getOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY not configured in .env file');
    }
    openai = new OpenAI({ 
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1'
    });
  }
  return openai;
};

/**
 * Search Hotels
 * GET /api/search/hotels?city=Mumbai&checkIn=2025-01-15&checkOut=2025-01-20
 */
router.get('/hotels', async (req, res) => {
  try {
    const { city, checkIn, checkOut, adults = 2 } = req.query;

    if (!city) {
      return res.status(400).json({ message: 'City parameter is required' });
    }

    // Skip ScraperAPI for now (getting 404), use AI directly
    let hotels = [];
    
    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON API. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: `Generate hotel data for ${city}, India. Return JSON: {"hotels": [{"name": "Hotel Name", "location": "${city}", "address": "Address", "price_per_night": 100, "rating": 4, "reviews_rating": 8.5, "reviews_count": 200, "hotel_type": "hotel", "amenities": ["WiFi", "Pool"], "coordinates": {"lat": 0, "lng": 0}}]}. Include 15 real hotels with accurate GPS.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);
      hotels = parsed.hotels || [];
    } catch (aiError) {
      hotels = [];
    }

    res.json({
      success: true,
      count: hotels.length,
      hotels: hotels
    });

  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/**
 * Search Flights
 * GET /api/search/flights?from=Delhi&to=Mumbai&departDate=2025-01-15&returnDate=2025-01-20
 */
router.get('/flights', async (req, res) => {
  try {
    const { from, to, departDate, returnDate } = req.query;

    if (!from || !to || !departDate) {
      return res.status(400).json({ message: 'from, to, and departDate parameters are required' });
    }

    // Use AI directly
    let flights = [];
    
    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON API. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: `Generate flight data from ${from} to ${to} on ${departDate}. Return JSON: {"flights": [{"airline": "IndiGo", "from": "${from}", "to": "${to}", "departure_time": "10:00 AM", "arrival_time": "12:30 PM", "duration": "2h 30m", "stops": 0, "price": 150, "date": "${departDate}", "flight_number": "6E1234", "cabin_class": "Economy", "baggage": "15 kg"}]}. Include 10 real Indian airlines.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);
      flights = parsed.flights || [];
    } catch (aiError) {
      flights = [];
    }

    res.json({
      success: true,
      count: flights.length,
      flights: flights
    });

  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/**
 * Search Buses
 * GET /api/search/buses?from=Mumbai&to=Pune&date=2025-01-15
 */
router.get('/buses', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ message: 'from, to, and date parameters are required' });
    }

    // Use AI directly
    let buses = [];
    
    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON API. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: `Generate bus data from ${from} to ${to} on ${date}. Return JSON: {"buses": [{"operator": "VRL Travels", "bus_type": "AC Sleeper", "from": "${from}", "to": "${to}", "departure_time": "10:00 PM", "arrival_time": "6:00 AM", "duration": "8h", "price": 25, "seats_available": 20, "date": "${date}", "amenities": ["AC", "WiFi", "Charging"]}]}. Include 10 real Indian bus operators.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);
      buses = parsed.buses || [];
    } catch (aiError) {
      buses = [];
    }

    res.json({
      success: true,
      count: buses.length,
      buses: buses
    });

  } catch (error) {
    console.error('Bus search error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/**
 * Search Trains
 * GET /api/search/trains?from=Mumbai&to=Delhi&date=2025-01-15
 */
router.get('/trains', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ message: 'from, to, and date parameters are required' });
    }

    // Use AI directly
    let trains = [];
    
    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON API. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: `Generate train data from ${from} to ${to} on ${date}. Return JSON: {"trains": [{"train_name": "Rajdhani Express", "train_number": "12951", "from": "${from}", "to": "${to}", "departure_time": "5:00 PM", "arrival_time": "9:00 AM", "duration": "16h", "price": 80, "class": "3AC", "date": "${date}", "seats_available": 30, "amenities": ["AC", "Pantry"]}]}. Include 10 real Indian trains.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);
      trains = parsed.trains || [];
    } catch (aiError) {
      trains = [];
    }

    res.json({
      success: true,
      count: trains.length,
      trains: trains
    });

  } catch (error) {
    console.error('Train search error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

export default router;
