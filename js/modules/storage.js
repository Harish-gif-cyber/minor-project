/**
 * Storage Module
 * Manages localStorage persistence for Weather recent searches,
 * Movie watchlist, and application preferences.
 * Demonstrates ES6+ classes, destructuring, and arrow functions.
 */

const STORAGE_KEYS = {
    RECENT_CITIES: 'weather_app_recent_cities',
    TEMP_UNIT: 'weather_app_temp_unit',
    MOVIE_WATCHLIST: 'movie_app_watchlist',
    CUSTOM_OMDB_KEY: 'movie_app_custom_omdb_key'
};

export const Storage = {
    /**
     * Get recent searched cities
     * @returns {string[]} Array of city names
     */
    getRecentCities: () => {
        try {
            if (typeof localStorage === 'undefined') return ['London', 'New York', 'Tokyo', 'Paris'];
            const data = localStorage.getItem(STORAGE_KEYS.RECENT_CITIES);
            return data ? JSON.parse(data) : ['London', 'New York', 'Tokyo', 'Paris'];
        } catch (error) {
            console.error('Error reading recent cities from storage:', error);
            return ['London', 'New York', 'Tokyo', 'Paris'];
        }
    },

    /**
     * Save a new searched city to history
     * @param {string} cityName 
     */
    saveRecentCity: (cityName) => {
        if (!cityName || typeof cityName !== 'string') return;
        if (typeof localStorage === 'undefined') return;
        const trimmed = cityName.trim();
        const cities = Storage.getRecentCities().filter(c => c.toLowerCase() !== trimmed.toLowerCase());
        cities.unshift(trimmed);
        // Keep up to 6 recent cities
        const limited = cities.slice(0, 6);
        try {
            localStorage.setItem(STORAGE_KEYS.RECENT_CITIES, JSON.stringify(limited));
        } catch (error) {
            console.error('Error saving recent city:', error);
        }
    },

    /**
     * Clear all recent cities
     */
    clearRecentCities: () => {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(STORAGE_KEYS.RECENT_CITIES);
            }
        } catch (error) {
            console.error('Error clearing recent cities:', error);
        }
    },

    /**
     * Get saved temperature unit ('C' or 'F')
     * @returns {string}
     */
    getTempUnit: () => {
        if (typeof localStorage === 'undefined') return 'C';
        return localStorage.getItem(STORAGE_KEYS.TEMP_UNIT) || 'C';
    },

    /**
     * Save temperature unit preference
     * @param {string} unit 
     */
    saveTempUnit: (unit) => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.TEMP_UNIT, unit === 'F' ? 'F' : 'C');
        }
    },

    /**
     * Get saved movie watchlist
     * @returns {Array<object>}
     */
    getWatchlist: () => {
        try {
            if (typeof localStorage === 'undefined') return [];
            const data = localStorage.getItem(STORAGE_KEYS.MOVIE_WATCHLIST);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading watchlist from storage:', error);
            return [];
        }
    },

    /**
     * Add movie to watchlist
     * @param {object} movie 
     * @returns {boolean} True if added, false if already present
     */
    addToWatchlist: (movie) => {
        if (!movie || !movie.imdbID) return false;
        if (typeof localStorage === 'undefined') return false;
        const list = Storage.getWatchlist();
        const exists = list.some(item => item.imdbID === movie.imdbID);
        if (exists) return false;

        // Store essential fields using object destructuring and shorthand
        const { imdbID, Title, Year, Poster, Type, imdbRating, Genre } = movie;
        list.unshift({ imdbID, Title, Year, Poster, Type, imdbRating, Genre, addedAt: new Date().toISOString() });
        try {
            localStorage.setItem(STORAGE_KEYS.MOVIE_WATCHLIST, JSON.stringify(list));
            return true;
        } catch (error) {
            console.error('Error saving movie to watchlist:', error);
            return false;
        }
    },

    /**
     * Remove movie from watchlist
     * @param {string} imdbID 
     * @returns {boolean}
     */
    removeFromWatchlist: (imdbID) => {
        if (typeof localStorage === 'undefined') return false;
        const list = Storage.getWatchlist().filter(item => item.imdbID !== imdbID);
        try {
            localStorage.setItem(STORAGE_KEYS.MOVIE_WATCHLIST, JSON.stringify(list));
            return true;
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            return false;
        }
    },

    /**
     * Check if movie is currently in watchlist
     * @param {string} imdbID 
     * @returns {boolean}
     */
    isInWatchlist: (imdbID) => {
        const list = Storage.getWatchlist();
        return list.some(item => item.imdbID === imdbID);
    },

    /**
     * Get custom OMDB API key if saved
     * @returns {string|null}
     */
    getCustomOmdbKey: () => {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEYS.CUSTOM_OMDB_KEY) || null;
    },

    /**
     * Save custom OMDB API key
     * @param {string} key 
     */
    saveCustomOmdbKey: (key) => {
        if (typeof localStorage === 'undefined') return;
        if (!key) {
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_OMDB_KEY);
        } else {
            localStorage.setItem(STORAGE_KEYS.CUSTOM_OMDB_KEY, key.trim());
        }
    }
};
