

import { MovieApi } from './modules/movieApi.js';
import { Storage } from './modules/storage.js';
import { UI } from './modules/ui.js';

export class MovieApp {
    constructor(containerId = 'movie-app-root') {
        this.container = document.getElementById(containerId);
        this.currentQuery = 'Avengers';
        this.currentType = '';
        this.currentPage = 1;
        this.totalResults = 0;
        this.isLoading = false;
        this.activeFilter = 'all';
        this.activeView = 'search'; 

        if (this.container) {
            this.init();
        }
    }

    
    init() {
        this.cacheDomElements();
        this.attachEventListeners();
        this.updateWatchlistBadge();

        this.executeSearch('Avengers', '', 1);
    }

    cacheDomElements() {
        const root = this.container;
        this.form = root.querySelector('#movie-search-form');
        this.input = root.querySelector('#movie-search-input');
        this.typeSelect = root.querySelector('#movie-type-filter');
        this.gridContainer = root.querySelector('#movie-grid-container');
        this.loadingSpinner = root.querySelector('#movie-loading');
        this.errorContainer = root.querySelector('#movie-error');
        this.resultsCountEl = root.querySelector('#movie-results-count');
        this.loadMoreBtn = root.querySelector('#movie-load-more');
        this.modalEl = root.querySelector('#movie-detail-modal');
        this.watchlistBtn = root.querySelector('#movie-view-watchlist-btn');
        this.watchlistBadge = root.querySelector('#watchlist-badge-count');
        this.apiKeyModalBtn = root.querySelector('#movie-api-key-btn');
    }

    
    attachEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.input.value.trim();
                const type = this.typeSelect ? this.typeSelect.value : '';
                if (!query) {
                    UI.showToast('Please type a movie title to search.', 'warning');
                    return;
                }
                this.activeView = 'search';
                this.currentQuery = query;
                this.currentType = type;
                this.currentPage = 1;
                this.executeSearch(this.currentQuery, this.currentType, 1);
            });
        }

        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', () => {
                if (this.activeView === 'search' && this.currentQuery) {
                    this.currentType = this.typeSelect.value;
                    this.currentPage = 1;
                    this.executeSearch(this.currentQuery, this.currentType, 1);
                }
            });
        }

        if (this.watchlistBtn) {
            this.watchlistBtn.addEventListener('click', () => {
                this.toggleWatchlistView();
            });
        }

        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                this.loadNextPage();
            });
        }

        if (this.gridContainer) {
            this.gridContainer.addEventListener('click', (e) => {
                const bookmarkBtn = e.target.closest('.btn-bookmark');
                if (bookmarkBtn) {
                    e.stopPropagation();
                    const movieCard = bookmarkBtn.closest('.movie-card');
                    this.handleWatchlistToggle(movieCard, bookmarkBtn);
                    return;
                }

                const card = e.target.closest('.movie-card');
                if (card && card.dataset.id) {
                    this.openMovieDetails(card.dataset.id);
                }
            });
        }

        if (this.apiKeyModalBtn) {
            this.apiKeyModalBtn.addEventListener('click', () => {
                this.promptApiKeyConfig();
            });
        }
    }

    /**
     
     * @param {string} query 
     * @param {string} type 
     * @param {number} page 
     * @param {boolean} append 
     */
    async executeSearch(query, type = '', page = 1, append = false) {
        if (this.isLoading) return;
        this.setLoadingState(true);
        this.hideError();

        if (!append) {
            this.renderSkeletonGrid();
        }

        try {
            const data = await MovieApi.searchMovies(query, type, page);
            const { results, totalResults } = data;

            this.totalResults = totalResults;

            if (results.length === 0) {
                this.showError(`No movies found for "${query}". Try another title.`);
                this.gridContainer.innerHTML = '';
                this.updateResultsCount(0);
                this.updateLoadMoreVisibility();
                return;
            }

            this.updateResultsCount(totalResults);
            this.renderMovieCards(results, append);
            this.updateLoadMoreVisibility();
        } catch (error) {
            console.error('Movie search error:', error);
            this.showError(error.message);
            if (!append) {
                this.gridContainer.innerHTML = '';
                this.updateResultsCount(0);
            }
            this.updateLoadMoreVisibility();
        } finally {
            this.setLoadingState(false);
        }
    }

    
    async loadNextPage() {
        if (this.isLoading) return;
        this.currentPage += 1;
        await this.executeSearch(this.currentQuery, this.currentType, this.currentPage, true);
    }

    /**
     * Render movie cards into the grid
     * @param {Array<object>} movies 
     * @param {boolean} append 
     */
    renderMovieCards(movies, append = false) {
        if (!this.gridContainer) return;

        const cardsHtml = movies.map(movie => {
            const { id, title, year, type, poster } = movie;
            const inWatchlist = Storage.isInWatchlist(id);
            const posterSrc = poster || 'https://via.placeholder.com/300x450/1e293b/94a3b8?text=No+Poster';

            return `
                <div class="movie-card animate-card-fade" 
                     data-id="${UI.escapeHtml(id)}" 
                     data-title="${UI.escapeHtml(title)}"
                     data-year="${UI.escapeHtml(year)}"
                     data-type="${UI.escapeHtml(type)}"
                     data-poster="${UI.escapeHtml(poster || '')}">
                    <div class="movie-poster-wrapper">
                        <img src="${UI.escapeHtml(posterSrc)}" 
                             alt="${UI.escapeHtml(title)} poster" 
                             class="movie-poster-img"
                             loading="lazy"
                             onerror="this.src='https://via.placeholder.com/300x450/1e293b/94a3b8?text=No+Poster';" />
                        <span class="movie-type-badge">${UI.escapeHtml(type)}</span>
                        <button type="button" 
                                class="btn-bookmark ${inWatchlist ? 'active' : ''}" 
                                aria-label="${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}"
                                title="${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                            <span class="bookmark-icon">${inWatchlist ? '★' : '☆'}</span>
                        </button>
                    </div>
                    <div class="movie-card-info">
                        <h4 class="movie-card-title" title="${UI.escapeHtml(title)}">${UI.escapeHtml(title)}</h4>
                        <div class="movie-card-meta">
                            <span class="movie-card-year">📅 ${UI.escapeHtml(year)}</span>
                            <span class="movie-card-details-cta">View Details &rarr;</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (append) {
            this.gridContainer.insertAdjacentHTML('beforeend', cardsHtml);
        } else {
            this.gridContainer.innerHTML = cardsHtml;
        }
    }

    renderSkeletonGrid() {
        if (!this.gridContainer) return;
        const skeletons = Array(8).fill(0).map(() => `
            <div class="movie-card skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="movie-card-info">
                    <div class="skeleton-line line-title"></div>
                    <div class="skeleton-line line-subtitle"></div>
                </div>
            </div>
        `).join('');
        this.gridContainer.innerHTML = skeletons;
    }

    /**
     * Open modal dialog with comprehensive movie details
     * @param {string} id 
     */
    async openMovieDetails(id) {
        if (!this.modalEl) return;

        
        this.modalEl.classList.remove('hidden');
        this.modalEl.classList.add('modal-open');
        const modalContent = this.modalEl.querySelector('.modal-body');
        modalContent.innerHTML = `
            <div class="modal-loading-spinner">
                <div class="spinner"></div>
                <p>Loading full movie details...</p>
            </div>
        `;

        try {
            const details = await MovieApi.getMovieDetails(id);
            const inWatchlist = Storage.isInWatchlist(details.id);

            const genresHtml = details.genre.map(g => `
                <span class="genre-tag">${UI.escapeHtml(g)}</span>
            `).join('');

            const ratingsHtml = details.ratings.map(r => `
                <div class="rating-item">
                    <span class="rating-source">${UI.escapeHtml(r.Source)}:</span>
                    <span class="rating-val">${UI.escapeHtml(r.Value)}</span>
                </div>
            `).join('');

            const posterSrc = details.poster || 'https://via.placeholder.com/300x450/1e293b/94a3b8?text=No+Poster';

            modalContent.innerHTML = `
                <div class="movie-modal-grid animate-fade-in">
                    <div class="modal-poster-col">
                        <img src="${UI.escapeHtml(posterSrc)}" 
                             alt="${UI.escapeHtml(details.title)}" 
                             class="modal-poster-img"
                             onerror="this.src='https://via.placeholder.com/300x450/1e293b/94a3b8?text=No+Poster';" />
                        <button type="button" 
                                class="btn-modal-watchlist ${inWatchlist ? 'active' : ''}" 
                                id="modal-watchlist-btn">
                            ${inWatchlist ? '★ Remove from Watchlist' : '☆ Add to Watchlist'}
                        </button>
                    </div>
                    <div class="modal-details-col">
                        <h2 class="modal-movie-title">${UI.escapeHtml(details.title)}</h2>
                        
                        <div class="modal-badge-row">
                            <span class="modal-pill pill-year">${UI.escapeHtml(details.year)}</span>
                            <span class="modal-pill pill-rated">${UI.escapeHtml(details.rated)}</span>
                            <span class="modal-pill pill-runtime">⏱️ ${UI.escapeHtml(details.runtime)}</span>
                            ${details.imdbRating ? `
                                <span class="modal-pill pill-imdb">⭐ IMDb ${UI.escapeHtml(details.imdbRating)}/10</span>
                            ` : ''}
                        </div>

                        <div class="modal-genres">
                            ${genresHtml}
                        </div>

                        <div class="modal-section">
                            <h4 class="modal-section-heading">Plot Synopsis</h4>
                            <p class="modal-plot">${UI.escapeHtml(details.plot)}</p>
                        </div>

                        <div class="modal-info-list">
                            <div class="info-row">
                                <span class="info-label">Director:</span>
                                <span class="info-val">${UI.escapeHtml(details.director)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Writer:</span>
                                <span class="info-val">${UI.escapeHtml(details.writer)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Cast:</span>
                                <span class="info-val">${UI.escapeHtml(details.actors)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Language:</span>
                                <span class="info-val">${UI.escapeHtml(details.language)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Released:</span>
                                <span class="info-val">${UI.escapeHtml(details.released)}</span>
                            </div>
                            ${details.boxOffice ? `
                                <div class="info-row">
                                    <span class="info-label">Box Office:</span>
                                    <span class="info-val">${UI.escapeHtml(details.boxOffice)}</span>
                                </div>
                            ` : ''}
                            ${details.awards ? `
                                <div class="info-row">
                                    <span class="info-label">Awards:</span>
                                    <span class="info-val">🏆 ${UI.escapeHtml(details.awards)}</span>
                                </div>
                            ` : ''}
                        </div>

                        ${ratingsHtml ? `
                            <div class="modal-ratings-box">
                                <h4 class="modal-section-heading">Ratings</h4>
                                <div class="ratings-items-row">${ratingsHtml}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // Modal watchlist button handler
            const modalWatchlistBtn = modalContent.querySelector('#modal-watchlist-btn');
            if (modalWatchlistBtn) {
                modalWatchlistBtn.addEventListener('click', () => {
                    const isNowIn = Storage.isInWatchlist(details.id);
                    if (isNowIn) {
                        Storage.removeFromWatchlist(details.id);
                        modalWatchlistBtn.textContent = '☆ Add to Watchlist';
                        modalWatchlistBtn.classList.remove('active');
                        UI.showToast(`Removed "${details.title}" from Watchlist.`, 'info');
                    } else {
                        Storage.addToWatchlist(details);
                        modalWatchlistBtn.textContent = '★ Remove from Watchlist';
                        modalWatchlistBtn.classList.add('active');
                        UI.showToast(`Added "${details.title}" to Watchlist!`, 'success');
                    }
                    this.updateWatchlistBadge();
                    this.syncGridBookmarkIcons(details.id);
                });
            }

            const closeBtn = this.modalEl.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => this.closeModal();
            }

            this.modalEl.onclick = (e) => {
                if (e.target === this.modalEl) {
                    this.closeModal();
                }
            };
        } catch (error) {
            modalContent.innerHTML = `
                <div class="error-banner">
                    <p class="error-heading">Error Loading Details</p>
                    <p class="error-text">${UI.escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    
    closeModal() {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('modal-open');
        this.modalEl.classList.add('hidden');
    }

    /**
     * Toggle bookmark state for a card in the grid
     * @param {HTMLElement} cardEl 
     * @param {HTMLElement} btnEl 
     */
    handleWatchlistToggle(cardEl, btnEl) {
        const id = cardEl.dataset.id;
        const title = cardEl.dataset.title;
        const year = cardEl.dataset.year;
        const type = cardEl.dataset.type;
        const poster = cardEl.dataset.poster;

        const isCurrentlySaved = Storage.isInWatchlist(id);

        if (isCurrentlySaved) {
            Storage.removeFromWatchlist(id);
            btnEl.classList.remove('active');
            btnEl.querySelector('.bookmark-icon').textContent = '☆';
            btnEl.setAttribute('title', 'Add to Watchlist');
            UI.showToast(`Removed "${title}" from Watchlist.`, 'info');

            if (this.activeView === 'watchlist') {
                cardEl.classList.add('toast-fade-out');
                setTimeout(() => cardEl.remove(), 250);
            }
        } else {
            Storage.addToWatchlist({ imdbID: id, Title: title, Year: year, Type: type, Poster: poster });
            btnEl.classList.add('active');
            btnEl.querySelector('.bookmark-icon').textContent = '★';
            btnEl.setAttribute('title', 'Remove from Watchlist');
            UI.showToast(`Added "${title}" to Watchlist!`, 'success');
        }

        this.updateWatchlistBadge();
    }

    /**
     * Synchronize card bookmark icons if modal state changed
     * @param {string} id 
     */
    syncGridBookmarkIcons(id) {
        if (!this.gridContainer) return;
        const card = this.gridContainer.querySelector(`.movie-card[data-id="${id}"]`);
        if (card) {
            const btn = card.querySelector('.btn-bookmark');
            const inList = Storage.isInWatchlist(id);
            if (btn) {
                btn.classList.toggle('active', inList);
                btn.querySelector('.bookmark-icon').textContent = inList ? '★' : '☆';
            }
        }
    }

    
    toggleWatchlistView() {
        if (this.activeView === 'watchlist') {
            
            this.activeView = 'search';
            if (this.watchlistBtn) {
                this.watchlistBtn.classList.remove('active-watchlist-tab');
                this.watchlistBtn.innerHTML = `<span>★</span> Watchlist <span class="badge-count" id="watchlist-badge-count">${Storage.getWatchlist().length}</span>`;
            }
            this.executeSearch(this.currentQuery, this.currentType, 1);
        } else {
            // Switch to Watchlist view
            this.activeView = 'watchlist';
            if (this.watchlistBtn) {
                this.watchlistBtn.classList.add('active-watchlist-tab');
                this.watchlistBtn.innerHTML = `<span>🔍</span> Back to Search`;
            }
            this.renderWatchlistView();
        }
    }

    renderWatchlistView() {
        this.hideError();
        const watchlist = Storage.getWatchlist();

        if (watchlist.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="watchlist-empty-state animate-fade-in">
                    <span class="empty-icon">🎬</span>
                    <h3>Your Watchlist is Empty</h3>
                    <p>Search for movies and tap the star icon (★) to save them here for later!</p>
                </div>
            `;
            this.updateResultsCount(0);
            this.updateLoadMoreVisibility();
            return;
        }

        const normalized = watchlist.map(item => ({
            id: item.imdbID,
            title: item.Title,
            year: item.Year,
            type: item.Type || 'movie',
            poster: item.Poster
        }));

        this.updateResultsCount(watchlist.length);
        this.renderMovieCards(normalized, false);
        this.updateLoadMoreVisibility();
    }

    updateWatchlistBadge() {
        const count = Storage.getWatchlist().length;
        const badge = this.container.querySelector('#watchlist-badge-count');
        if (badge) {
            badge.textContent = count;
        }
    }

    /**
     * Update results count heading
     * @param {number} count 
     */
    updateResultsCount(count) {
        if (!this.resultsCountEl) return;
        if (this.activeView === 'watchlist') {
            this.resultsCountEl.textContent = `Watchlist (${count} saved)`;
        } else {
            this.resultsCountEl.textContent = `Found ${count} result${count === 1 ? '' : 's'}`;
        }
    }

    updateLoadMoreVisibility() {
        if (!this.loadMoreBtn) return;
        const hasMore = this.activeView === 'search' && (this.currentPage * 10 < this.totalResults);
        this.loadMoreBtn.classList.toggle('hidden', !hasMore);
    }

    /**
     * Set loading state
     * @param {boolean} loading 
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.toggle('hidden', !loading);
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
                <span class="error-icon">🎬</span>
                <div class="error-content">
                    <p class="error-heading">Movie Search Notice</p>
                    <p class="error-text">${UI.escapeHtml(message)}</p>
                </div>
            </div>
        `;
        this.errorContainer.classList.remove('hidden');
    }

    
    hideError() {
        if (this.errorContainer) {
            this.errorContainer.classList.add('hidden');
            this.errorContainer.innerHTML = '';
        }
    }

    
    promptApiKeyConfig() {
        const currentKey = Storage.getCustomOmdbKey() || '';
        const userKey = window.prompt(
            'Enter your custom OMDb API Key (leave empty to use default system key):\n\nGet a free key at https://www.omdbapi.com/apikey.aspx',
            currentKey
        );

        if (userKey !== null) {
            Storage.saveCustomOmdbKey(userKey);
            UI.showToast(userKey ? 'Custom API key saved!' : 'Reset to default API key.', 'success');
            this.executeSearch(this.currentQuery, this.currentType, 1);
        }
    }
}
