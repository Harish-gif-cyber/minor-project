/**
 * UI Utilities Module
 * Provides toast notifications, weather code interpreters,
 * date formatters, and DOM helper functions.
 */

// WMO Weather interpretation codes (WW) from Open-Meteo
const WEATHER_CODE_MAP = {
    0: { description: 'Clear Sky', icon: '☀️', theme: 'theme-clear' },
    1: { description: 'Mainly Clear', icon: '🌤️', theme: 'theme-clear' },
    2: { description: 'Partly Cloudy', icon: '⛅', theme: 'theme-clouds' },
    3: { description: 'Overcast', icon: '☁️', theme: 'theme-clouds' },
    45: { description: 'Foggy', icon: '🌫️', theme: 'theme-fog' },
    48: { description: 'Depositing Rime Fog', icon: '🌫️', theme: 'theme-fog' },
    51: { description: 'Light Drizzle', icon: '🌦️', theme: 'theme-rain' },
    53: { description: 'Moderate Drizzle', icon: '🌦️', theme: 'theme-rain' },
    55: { description: 'Dense Drizzle', icon: '🌧️', theme: 'theme-rain' },
    56: { description: 'Freezing Drizzle', icon: '🌧️❄️', theme: 'theme-snow' },
    57: { description: 'Dense Freezing Drizzle', icon: '🌧️❄️', theme: 'theme-snow' },
    61: { description: 'Slight Rain', icon: '🌦️', theme: 'theme-rain' },
    63: { description: 'Moderate Rain', icon: '🌧️', theme: 'theme-rain' },
    65: { description: 'Heavy Rain', icon: '⛈️', theme: 'theme-rain' },
    66: { description: 'Light Freezing Rain', icon: '🌧️❄️', theme: 'theme-snow' },
    67: { description: 'Heavy Freezing Rain', icon: '🌧️❄️', theme: 'theme-snow' },
    71: { description: 'Slight Snow Fall', icon: '🌨️', theme: 'theme-snow' },
    73: { description: 'Moderate Snow Fall', icon: '❄️', theme: 'theme-snow' },
    75: { description: 'Heavy Snow Fall', icon: '❄️❄️', theme: 'theme-snow' },
    77: { description: 'Snow Grains', icon: '🌨️', theme: 'theme-snow' },
    80: { description: 'Slight Rain Showers', icon: '🌦️', theme: 'theme-rain' },
    81: { description: 'Moderate Rain Showers', icon: '🌧️', theme: 'theme-rain' },
    82: { description: 'Violent Rain Showers', icon: '⛈️', theme: 'theme-thunder' },
    85: { description: 'Slight Snow Showers', icon: '🌨️', theme: 'theme-snow' },
    86: { description: 'Heavy Snow Showers', icon: '❄️🌨️', theme: 'theme-snow' },
    95: { description: 'Thunderstorm', icon: '⛈️⚡', theme: 'theme-thunder' },
    96: { description: 'Thunderstorm with Hail', icon: '⛈️🌩️', theme: 'theme-thunder' },
    99: { description: 'Severe Thunderstorm with Hail', icon: '⛈️🌪️', theme: 'theme-thunder' }
};

export const UI = {
    /**
     * Interpret Open-Meteo weather code
     * @param {number} code 
     * @returns {{ description: string, icon: string, theme: string }}
     */
    getWeatherCondition: (code) => {
        return WEATHER_CODE_MAP[code] || {
            description: 'Moderate Weather',
            icon: '🌤️',
            theme: 'theme-clear'
        };
    },

    /**
     * Convert Celsius to Fahrenheit
     * @param {number} celsius 
     * @returns {number}
     */
    celsiusToFahrenheit: (celsius) => {
        return Math.round((celsius * 9 / 5) + 32);
    },

    /**
     * Format temperature based on selected unit
     * @param {number} celsius 
     * @param {string} unit 'C' | 'F'
     * @returns {string} e.g. "24°C" or "75°F"
     */
    formatTemp: (celsius, unit = 'C') => {
        if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
        const rounded = Math.round(celsius);
        if (unit === 'F') {
            return `${UI.celsiusToFahrenheit(rounded)}°F`;
        }
        return `${rounded}°C`;
    },

    /**
     * Convert wind direction degrees to compass heading
     * @param {number} deg 
     * @returns {string} e.g. "NE", "SSW"
     */
    getWindDirectionText: (deg) => {
        if (deg === undefined || deg === null) return 'N/A';
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round((deg % 360) / 22.5) % 16;
        return directions[index];
    },

    /**
     * Format a date string (YYYY-MM-DD) into weekday and short date
     * @param {string} dateString 
     * @returns {{ weekday: string, formattedDate: string }}
     */
    formatForecastDate: (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
        const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return { weekday, formattedDate };
    },

    /**
     * Display a floating toast notification
     * @param {string} message 
     * @param {'success'|'error'|'info'|'warning'} type 
     * @param {number} durationMs 
     */
    showToast: (message, type = 'info', durationMs = 3500) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type} animate-fade-in`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${UI.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        const removeToast = () => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        container.appendChild(toast);

        setTimeout(removeToast, durationMs);
    },

    /**
     * Escape special HTML characters to prevent XSS
     * @param {string} str 
     * @returns {string}
     */
    escapeHtml: (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Safely format rating value
     * @param {string|number} rating 
     * @returns {string}
     */
    formatRating: (rating) => {
        if (!rating || rating === 'N/A') return 'N/A';
        return `${rating}/10`;
    }
};
