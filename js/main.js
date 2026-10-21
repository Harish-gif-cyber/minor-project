
import { WeatherApp } from './weatherApp.js';
import { MovieApp } from './movieApp.js';

document.addEventListener('DOMContentLoaded', () => {
    const weatherRoot = document.getElementById('weather-app-root');
    const movieRoot = document.getElementById('movie-app-root');
    const navTabs = document.querySelectorAll('.nav-tab-btn');

    let weatherInstance = null;
    let movieInstance = null;

    if (weatherRoot) {
        weatherInstance = new WeatherApp('weather-app-root');
    }

    if (movieRoot) {
        movieInstance = new MovieApp('movie-app-root');
    }

    if (weatherRoot && movieRoot && navTabs.length > 0) {
        const switchTab = (targetApp) => {
            navTabs.forEach(btn => {
                const isActive = btn.dataset.tab === targetApp;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            if (targetApp === 'weather') {
                weatherRoot.classList.remove('hidden-view');
                movieRoot.classList.add('hidden-view');
                window.location.hash = 'weather';
            } else if (targetApp === 'movies') {
                weatherRoot.classList.add('hidden-view');
                movieRoot.classList.remove('hidden-view');
                window.location.hash = 'movies';
            }
        };

        navTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                switchTab(target);
            });
        });

        const initialHash = window.location.hash.replace('#', '').toLowerCase();
        if (initialHash === 'movies') {
            switchTab('movies');
        } else {
            switchTab('weather');
        }

      
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '').toLowerCase();
            if (hash === 'movies' || hash === 'weather') {
                switchTab(hash);
            }
        });
    }

    console.log('Weather & Movie Apps successfully initialized.');
});
