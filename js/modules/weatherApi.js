/**
 * Weather API Module
 * Consumes Open-Meteo Geocoding and Forecast REST APIs.
 * Demonstrates async/await, fetch API, promises, destructuring,
 * template literals, and comprehensive error handling.
 */

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1';
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1';

export const WeatherApi = {
    /**
     * Search coordinates and metadata for a city name
     * @param {string} cityName 
     * @returns {Promise<object>} Top matching location object
     */
    searchCity: async (cityName) => {
        if (!cityName || !cityName.trim()) {
            throw new Error('Please enter a city name to search.');
        }

        const trimmedCity = cityName.trim();
        const url = `${GEOCODING_BASE_URL}/search?name=${encodeURIComponent(trimmedCity)}&count=5&language=en&format=json`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Geocoding service error: HTTP ${response.status}`);
            }

            const data = await response.json();

            // Check if results exist
            if (!data.results || data.results.length === 0) {
                throw new Error(`No weather data found for "${trimmedCity}". Please check spelling.`);
            }

            // Return best match with destructuring
            const [bestMatch] = data.results;
            const { name, latitude, longitude, country, admin1, country_code } = bestMatch;

            return {
                name,
                latitude,
                longitude,
                country: country || country_code || '',
                region: admin1 || '',
                fullDisplayName: [name, admin1, country].filter(Boolean).join(', ')
            };
        } catch (error) {
            // Re-throw with clear message if network failed
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to weather service. Please check your internet connection.');
            }
            throw error;
        }
    },

    /**
     * Fetch weather forecast using coordinates
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {Promise<object>}
     */
    getWeatherByCoords: async (latitude, longitude) => {
        if (latitude === undefined || longitude === undefined) {
            throw new Error('Valid latitude and longitude coordinates are required.');
        }

        const currentParams = [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
            'surface_pressure'
        ].join(',');

        const dailyParams = [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_probability_max'
        ].join(',');

        const url = `${FORECAST_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentParams}&daily=${dailyParams}&timezone=auto`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather service responded with error status ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.current) {
                throw new Error('Incomplete weather data received from API.');
            }

            // Process and structure the returned data using destructuring
            const { current, daily, current_units, daily_units, timezone } = data;

            return {
                current: {
                    time: current.time,
                    temperature: current.temperature_2m,
                    feelsLike: current.apparent_temperature,
                    humidity: current.relative_humidity_2m,
                    windSpeed: current.wind_speed_10m,
                    windDirection: current.wind_direction_10m,
                    weatherCode: current.weather_code,
                    isDay: Boolean(current.is_day),
                    precipitation: current.precipitation ?? 0,
                    pressure: current.surface_pressure
                },
                daily: daily.time.map((dateStr, index) => ({
                    date: dateStr,
                    weatherCode: daily.weather_code[index],
                    tempMax: daily.temperature_2m_max[index],
                    tempMin: daily.temperature_2m_min[index],
                    precipProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[index] : null
                })),
                units: {
                    temperature: current_units?.temperature_2m || '°C',
                    windSpeed: current_units?.wind_speed_10m || 'km/h',
                    humidity: current_units?.relative_humidity_2m || '%'
                },
                timezone
            };
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to fetch forecast data.');
            }
            throw error;
        }
    },

    /**
     * Reverse geocode coordinates to find city name
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {Promise<string>}
     */
    reverseGeocode: async (latitude, longitude) => {
        try {
            // Using OpenStreetMap Nominatim with proper headers
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                const address = data.address || {};
                const city = address.city || address.town || address.village || address.county || 'Current Location';
                const country = address.country || '';
                return country ? `${city}, ${country}` : city;
            }
        } catch (e) {
            console.warn('Reverse geocoding failed, falling back to coordinates label', e);
        }
        return `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
    }
};
