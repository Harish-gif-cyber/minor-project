
import { WeatherApi } from './modules/weatherApi.js';
import { Storage } from './modules/storage.js';
import { UI } from './modules/ui.js';

export class WeatherApp {
    constructor(containerId = 'weather-app-root') {
        this.container = document.getElementById(containerId);
        this.currentWeatherData = null;
        this.currentCityName = 'London';
        this.tempUnit = Storage.getTempUnit();
        this.isLoading = false;

        if (this.container) {
            this.init();
        }
    }

    init() {
        this.cacheDomElements();
        this.attachEventListeners();
        this.renderRecentSearches();

        
        const recent = Storage.getRecentCities();
        const initialCity = recent.length > 0 ? recent[0] : 'London';
        this.fetchWeatherForCity(initialCity);
    }

    cacheDomElements() {
        const root = this.container;
        this.form = root.querySelector('#weather-search-form');
        this.cityInput = root.querySelector('#weather-city-input');
        this.geoBtn = root.querySelector('#weather-geo-btn');
        this.unitBtn = root.querySelector('#weather-unit-toggle');
        this.recentContainer = root.querySelector('#weather-recent-tags');
        this.cardContainer = root.querySelector('#weather-card-container');
        this.forecastContainer = root.querySelector('#weather-forecast-container');
        this.loadingSpinner = root.querySelector('#weather-loading');
        this.errorContainer = root.querySelector('#weather-error');
    }

    
    attachEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.cityInput.value.trim();
                if (query) {
                    this.fetchWeatherForCity(query);
                } else {
                    UI.showToast('Please type a city name to search.', 'warning');
                }
            });
        }

        if (this.geoBtn) {
            this.geoBtn.addEventListener('click', () => this.handleGeolocation());
        }
        if (this.unitBtn) {
            this.unitBtn.addEventListener('click', () => this.toggleTempUnit());
        }

        if (this.recentContainer) {
            this.recentContainer.addEventListener('click', (e) => {
                const tag = e.target.closest('.recent-city-tag');
                if (tag && tag.dataset.city) {
                    this.cityInput.value = tag.dataset.city;
                    this.fetchWeatherForCity(tag.dataset.city);
                }
            });
        }
    }

    
    toggleTempUnit() {
        this.tempUnit = this.tempUnit === 'C' ? 'F' : 'C';
        Storage.saveTempUnit(this.tempUnit);

        if (this.unitBtn) {
            this.unitBtn.textContent = `°${this.tempUnit === 'C' ? 'F' : 'C'}`;
            this.unitBtn.setAttribute('title', `Switch to °${this.tempUnit === 'C' ? 'F' : 'C'}`);
        }

        if (this.currentWeatherData) {
            this.renderWeatherDisplay();
        }
    }

    
    handleGeolocation() {
        if (!navigator.geolocation) {
            UI.showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        this.setLoadingState(true);
        UI.showToast('Locating your position...', 'info', 2000);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const cityName = await WeatherApi.reverseGeocode(latitude, longitude);
                    await this.loadWeatherByCoords(latitude, longitude, cityName);
                } catch (error) {
                    this.showError(error.message);
                } finally {
                    this.setLoadingState(false);
                }
            },
            (error) => {
                this.setLoadingState(false);
                let message = 'Unable to retrieve location.';
                if (error.code === error.PERMISSION_DENIED) {
                    message = 'Location access denied. Please allow location permissions or type a city.';
                }
                UI.showToast(message, 'warning');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    /**
     * Fetch weather data for a given city name
     * @param {string} cityName 
     */
    async fetchWeatherForCity(cityName) {
        if (this.isLoading) return;
        this.setLoadingState(true);
        this.hideError();

        try {
            
            const location = await WeatherApi.searchCity(cityName);
            const { latitude, longitude, fullDisplayName } = location;

            await this.loadWeatherByCoords(latitude, longitude, fullDisplayName);

            Storage.saveRecentCity(location.name);
            this.renderRecentSearches();

            if (this.cityInput) {
                this.cityInput.value = location.name;
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError(error.message);
            UI.showToast(error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Load weather with coordinates and location label
     * @param {number} latitude 
     * @param {number} longitude 
     * @param {string} locationName 
     */
    async loadWeatherByCoords(latitude, longitude, locationName) {
        const weather = await WeatherApi.getWeatherByCoords(latitude, longitude);
        this.currentWeatherData = weather;
        this.currentCityName = locationName;
        this.renderWeatherDisplay();
    }

    
    renderWeatherDisplay() {
        if (!this.currentWeatherData) return;

        const { current, daily } = this.currentWeatherData;
        const condition = UI.getWeatherCondition(current.weatherCode);

        
        this.applyWeatherTheme(condition.theme);

       
        const formattedTemp = UI.formatTemp(current.temperature, this.tempUnit);
        const formattedFeelsLike = UI.formatTemp(current.feelsLike, this.tempUnit);
        const windDirection = UI.getWindDirectionText(current.windDirection);
        const currentDate = new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        
        this.cardContainer.innerHTML = `
            <div class="weather-current-card animate-fade-in">
                <div class="weather-header-info">
                    <div class="location-group">
                        <h2 class="location-title">
                            <span class="location-pin-icon">📍</span>
                            ${UI.escapeHtml(this.currentCityName)}
                        </h2>
                        <p class="current-date">${currentDate}</p>
                    </div>
                    <span class="day-night-badge ${current.isDay ? 'badge-day' : 'badge-night'}">
                        ${current.isDay ? '☀️ Day' : '🌙 Night'}
                    </span>
                </div>

                <div class="weather-primary-info">
                    <div class="temp-condition-box">
                        <span class="weather-large-icon" role="img" aria-label="${condition.description}">${condition.icon}</span>
                        <div class="temp-reading">
                            <span class="temperature-number">${formattedTemp}</span>
                            <span class="condition-name">${condition.description}</span>
                        </div>
                    </div>
                    <div class="feels-like-pill">
                        Feels like <strong>${formattedFeelsLike}</strong>
                    </div>
                </div>

                <div class="weather-details-grid">
                    <div class="metric-card">
                        <div class="metric-icon">💧</div>
                        <div class="metric-data">
                            <span class="metric-label">Humidity</span>
                            <span class="metric-value">${current.humidity}%</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill" style="width: ${Math.min(current.humidity, 100)}%"></div>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">💨</div>
                        <div class="metric-data">
                            <span class="metric-label">Wind Speed</span>
                            <span class="metric-value">${Math.round(current.windSpeed)} km/h</span>
                            <span class="metric-sub">${windDirection} (${current.windDirection}°)</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">🌧️</div>
                        <div class="metric-data">
                            <span class="metric-label">Precipitation</span>
                            <span class="metric-value">${current.precipitation} mm</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon">⏲️</div>
                        <div class="metric-data">
                            <span class="metric-label">Pressure</span>
                            <span class="metric-value">${Math.round(current.pressure || 1013)} hPa</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderForecast(daily);
    }

    /**
     * Render the 5-day forecast cards
     * @param {Array<object>} dailyList 
     */
    renderForecast(dailyList) {
        if (!this.forecastContainer || !dailyList) return;

        const days = dailyList.slice(0, 5);

        const forecastHtml = days.map((day, idx) => {
            const { weekday, formattedDate } = UI.formatForecastDate(day.date);
            const condition = UI.getWeatherCondition(day.weatherCode);
            const highTemp = UI.formatTemp(day.tempMax, this.tempUnit);
            const lowTemp = UI.formatTemp(day.tempMin, this.tempUnit);
            const isToday = idx === 0;

            return `
                <div class="forecast-day-card ${isToday ? 'forecast-card-today' : ''}">
                    <div class="forecast-day-name">${isToday ? 'Today' : weekday}</div>
                    <div class="forecast-date">${formattedDate}</div>
                    <div class="forecast-icon" title="${condition.description}">${condition.icon}</div>
                    <div class="forecast-condition">${condition.description}</div>
                    <div class="forecast-temp-range">
                        <span class="temp-high">${highTemp}</span>
                        <span class="temp-divider">/</span>
                        <span class="temp-low">${lowTemp}</span>
                    </div>
                    ${day.precipProb !== null ? `
                        <div class="forecast-precip">💧 ${day.precipProb}%</div>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.forecastContainer.innerHTML = `
            <div class="forecast-section animate-fade-in">
                <h3 class="section-title">
                    <span>📅</span> 5-Day Extended Forecast
                </h3>
                <div class="forecast-grid">
                    ${forecastHtml}
                </div>
            </div>
        `;
    }

    
    renderRecentSearches() {
        if (!this.recentContainer) return;

        const cities = Storage.getRecentCities();
        if (cities.length === 0) {
            this.recentContainer.innerHTML = '';
            return;
        }

        const tagsHtml = cities.map(city => `
            <button type="button" class="recent-city-tag" data-city="${UI.escapeHtml(city)}">
                <span>📍</span> ${UI.escapeHtml(city)}
            </button>
        `).join('');

        this.recentContainer.innerHTML = `
            <div class="recent-cities-wrapper">
                <span class="recent-label">Recent:</span>
                <div class="recent-tags-list">
                    ${tagsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Dynamic weather theme styling on root container
     * @param {string} themeClass 
     */
    applyWeatherTheme(themeClass) {
        const classesToRemove = ['theme-clear', 'theme-clouds', 'theme-rain', 'theme-snow', 'theme-fog', 'theme-thunder'];
        this.container.classList.remove(...classesToRemove);
        if (themeClass) {
            this.container.classList.add(themeClass);
        }
    }

    /**
     * Toggle loading state
     * @param {boolean} loading 
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.toggle('hidden', !loading);
        }
        if (loading) {
            this.cardContainer.classList.add('loading-fade');
            if (this.forecastContainer) this.forecastContainer.classList.add('loading-fade');
        } else {
            this.cardContainer.classList.remove('loading-fade');
            if (this.forecastContainer) this.forecastContainer.classList.remove('loading-fade');
        }
    }

    /**
     * Display error state
     * @param {string} message 
     */
    showError(message) {
        if (!this.errorContainer) return;
        this.errorContainer.innerHTML = `
            <div class="error-banner animate-shake">
                <span class="error-icon">⚠️</span>
                <div class="error-content">
                    <p class="error-heading">Unable to Load Weather</p>
                    <p class="error-text">${UI.escapeHtml(message)}</p>
                </div>
                <button type="button" class="btn-retry" id="weather-retry-btn">Try Again</button>
            </div>
        `;
        this.errorContainer.classList.remove('hidden');

        const retryBtn = this.errorContainer.querySelector('#weather-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.fetchWeatherForCity(this.currentCityName || 'London');
            });
        }
    }

    
    hideError() {
        if (this.errorContainer) {
            this.errorContainer.classList.add('hidden');
            this.errorContainer.innerHTML = '';
        }
    }
}
