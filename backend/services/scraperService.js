import axios from 'axios';
import * as cheerio from 'cheerio';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const SCRAPER_API_URL = 'http://api.scraperapi.com';

/**
 * ScraperAPI Service - Fetches real-time data from web
 */
class ScraperService {
  
  /**
   * Make a ScraperAPI request
   */
  async scrape(url) {
    try {
      const response = await axios.get(SCRAPER_API_URL, {
        params: {
          api_key: SCRAPER_API_KEY,
          url: url,
          render: 'true' // Render JavaScript for dynamic content
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('ScraperAPI Error:', error.message);
      throw error;
    }
  }

  /**
   * Search Hotels - Google Hotels
   */
  async searchHotels({ city, checkIn, checkOut, adults = 2 }) {
    try {
      const url = `https://www.google.com/travel/hotels/${encodeURIComponent(city)}?q=hotels%20in%20${encodeURIComponent(city)}&g2lb=2502548%2C2503771%2C2503781%2C4258168%2C4270442%2C4306835%2C4317915%2C4371334%2C4401769%2C4419364%2C4482438%2C4486153%2C4270859%2C4284970%2C4291517&hl=en-IN&gl=in&cs=1&ssta=1&ts=CAESABogCgIaABIaEhQKBwjmDxABGBsSBwjmDxABGBwYATICEAAqCQoFOgNJTlIaAA&adults=${adults}`;
      
      const html = await this.scrape(url);
      const $ = cheerio.load(html);
      const hotels = [];

      // Parse Google Hotels results
      $('.yrHgLb').each((i, elem) => {
        try {
          const name = $(elem).find('.BgYkof').text().trim();
          const priceText = $(elem).find('.prxS3d').text().trim();
          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
          const ratingText = $(elem).find('.KFi5wf').text().trim();
          const rating = parseFloat(ratingText) || 0;
          const reviewsText = $(elem).find('.bICNze').text().trim();
          const reviewsCount = parseInt(reviewsText.replace(/[^0-9]/g, '')) || 0;
          const imageUrl = $(elem).find('img').attr('src');
          
          if (name && price > 0) {
            hotels.push({
              name,
              location: city,
              address: city,
              price_per_night: price,
              rating: Math.min(5, Math.ceil(rating / 2)), // Convert to 5-star scale
              reviews_rating: rating,
              reviews_count: reviewsCount,
              hotel_type: 'hotel',
              images: imageUrl ? [imageUrl] : [],
              amenities: ['WiFi', 'Air Conditioning', 'Room Service'],
              coordinates: {
                lat: 0, // Will be enriched by AI
                lng: 0
              }
            });
          }
        } catch (err) {
          console.error('Hotel parse error:', err.message);
        }
      });

      console.log(`✅ Found ${hotels.length} hotels in ${city}`);
      return hotels;
    } catch (error) {
      console.error('Hotel search error:', error.message);
      return [];
    }
  }

  /**
   * Search Flights - Google Flights
   */
  async searchFlights({ from, to, departDate, returnDate = null }) {
    try {
      const oneWay = !returnDate;
      const url = oneWay 
        ? `https://www.google.com/travel/flights?q=flights%20from%20${encodeURIComponent(from)}%20to%20${encodeURIComponent(to)}%20on%20${departDate}`
        : `https://www.google.com/travel/flights?q=flights%20from%20${encodeURIComponent(from)}%20to%20${encodeURIComponent(to)}%20on%20${departDate}%20returning%20${returnDate}`;
      
      const html = await this.scrape(url);
      const $ = cheerio.load(html);
      const flights = [];

      // Parse Google Flights results
      $('.pIav2d').each((i, elem) => {
        try {
          const airline = $(elem).find('.sSHqwe').text().trim();
          const priceText = $(elem).find('.YMlIz').text().trim();
          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
          const duration = $(elem).find('.Ak5kof').text().trim();
          const stops = $(elem).find('.BbR8Ec').text().trim();
          
          if (airline && price > 0) {
            flights.push({
              airline,
              from,
              to,
              departure_time: '10:00 AM', // Placeholder
              arrival_time: '12:00 PM', // Placeholder
              duration,
              stops: stops.includes('Nonstop') ? 0 : stops.includes('1 stop') ? 1 : 2,
              price,
              date: departDate,
              flight_number: `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`,
              cabin_class: 'Economy',
              baggage: '15 kg',
              type: oneWay ? 'one-way' : 'round-trip'
            });
          }
        } catch (err) {
          console.error('Flight parse error:', err.message);
        }
      });

      console.log(`✅ Found ${flights.length} flights from ${from} to ${to}`);
      return flights;
    } catch (error) {
      console.error('Flight search error:', error.message);
      return [];
    }
  }

  /**
   * Search Buses - RedBus (India)
   */
  async searchBuses({ from, to, date }) {
    try {
      const url = `https://www.redbus.in/bus-tickets/${encodeURIComponent(from)}-to-${encodeURIComponent(to)}?fromCityName=${encodeURIComponent(from)}&toCityName=${encodeURIComponent(to)}&onward=${date}`;
      
      const html = await this.scrape(url);
      const $ = cheerio.load(html);
      const buses = [];

      // Parse RedBus results
      $('.travels').each((i, elem) => {
        try {
          const operator = $(elem).text().trim();
          const busType = $(elem).closest('.bus-item').find('.bus-type').text().trim();
          const departTime = $(elem).closest('.bus-item').find('.dp-time').text().trim();
          const arrivalTime = $(elem).closest('.bus-item').find('.bp-time').text().trim();
          const duration = $(elem).closest('.bus-item').find('.dur').text().trim();
          const priceText = $(elem).closest('.bus-item').find('.fare').text().trim();
          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
          const seatsAvailable = $(elem).closest('.bus-item').find('.seat-left').text().trim();
          
          if (operator && price > 0) {
            buses.push({
              operator,
              bus_type: busType || 'AC Sleeper',
              from,
              to,
              departure_time: departTime || '10:00 PM',
              arrival_time: arrivalTime || '6:00 AM',
              duration: duration || '8h',
              price,
              seats_available: parseInt(seatsAvailable) || 20,
              date,
              amenities: ['AC', 'WiFi', 'Charging Point', 'Water Bottle']
            });
          }
        } catch (err) {
          console.error('Bus parse error:', err.message);
        }
      });

      console.log(`✅ Found ${buses.length} buses from ${from} to ${to}`);
      return buses;
    } catch (error) {
      console.error('Bus search error:', error.message);
      return [];
    }
  }

  /**
   * Search Trains - IRCTC/MakeMyTrip (India)
   */
  async searchTrains({ from, to, date }) {
    try {
      // Using MakeMyTrip as it's more scraper-friendly than IRCTC
      const url = `https://www.makemytrip.com/railways/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
      
      const html = await this.scrape(url);
      const $ = cheerio.load(html);
      const trains = [];

      // Parse train results
      $('.train-list-item').each((i, elem) => {
        try {
          const trainName = $(elem).find('.train-name').text().trim();
          const trainNumber = $(elem).find('.train-number').text().trim();
          const departTime = $(elem).find('.depart-time').text().trim();
          const arrivalTime = $(elem).find('.arrival-time').text().trim();
          const duration = $(elem).find('.duration').text().trim();
          const priceText = $(elem).find('.price').text().trim();
          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
          const trainClass = $(elem).find('.class').text().trim();
          
          if (trainName && price > 0) {
            trains.push({
              train_name: trainName,
              train_number: trainNumber || `${Math.floor(Math.random() * 90000 + 10000)}`,
              from,
              to,
              departure_time: departTime || '10:00 AM',
              arrival_time: arrivalTime || '6:00 PM',
              duration: duration || '8h',
              price,
              class: trainClass || '3AC',
              date,
              seats_available: Math.floor(Math.random() * 50 + 10),
              amenities: ['AC', 'Charging Point', 'Pantry']
            });
          }
        } catch (err) {
          console.error('Train parse error:', err.message);
        }
      });

      console.log(`✅ Found ${trains.length} trains from ${from} to ${to}`);
      return trains;
    } catch (error) {
      console.error('Train search error:', error.message);
      return [];
    }
  }

  /**
   * Generate mock data when scraping fails
   */
  generateMockHotels(city, count = 10) {
    const hotelNames = ['Grand', 'Royal', 'Plaza', 'Luxury', 'Comfort', 'Imperial', 'Heritage', 'Elite', 'Premium', 'Majestic'];
    const amenities = ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Airport Shuttle', 'Parking', 'AC'];
    
    return Array.from({ length: count }, (_, i) => ({
      name: `${hotelNames[i % hotelNames.length]} ${city} Hotel`,
      location: city,
      address: `${i + 1} Main Street, ${city}`,
      price_per_night: Math.floor(Math.random() * 300 + 50),
      rating: Math.floor(Math.random() * 2 + 3),
      reviews_rating: (Math.random() * 2 + 3).toFixed(1),
      reviews_count: Math.floor(Math.random() * 1000 + 100),
      hotel_type: ['hotel', 'resort', 'boutique'][i % 3],
      amenities: amenities.slice(0, Math.floor(Math.random() * 5 + 3)),
      images: [`https://images.unsplash.com/photo-${1560000000 + i}?w=800`],
      coordinates: { lat: 0, lng: 0 }
    }));
  }
}

export default new ScraperService();
