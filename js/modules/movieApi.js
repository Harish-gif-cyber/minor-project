/**
 * Movie API Module
 * Consumes OMDb REST API for movie data with automatic fallback to TVMaze API.
 * Demonstrates async/await, fetch API, promises, destructuring,
 * template literals, and robust error handling.
 */

import { Storage } from './storage.js';

const OMDB_BASE_URL = 'https://omdbapi.com/';
const DEFAULT_OMDB_KEY = 'trilogy';
const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

export const MovieApi = {
    /**
     * Get active OMDB API key (custom or default)
     * @returns {string}
     */
    getApiKey: () => {
        return Storage.getCustomOmdbKey() || DEFAULT_OMDB_KEY;
    },

    /**
     * Search movies by title query
     * @param {string} query 
     * @param {string} type 'movie' | 'series' | 'episode' | ''
     * @param {number} page 
     * @returns {Promise<{ results: Array<object>, totalResults: number }>}
     */
    searchMovies: async (query, type = '', page = 1) => {
        if (!query || !query.trim()) {
            throw new Error('Please enter a movie title to search.');
        }

        const trimmed = query.trim();
        const apiKey = MovieApi.getApiKey();

        let omdbUrl = `${OMDB_BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(trimmed)}&page=${page}`;
        if (type) {
            omdbUrl += `&type=${encodeURIComponent(type)}`;
        }

        try {
            const response = await fetch(omdbUrl);

            if (!response.ok) {
                throw new Error(`OMDb API responded with status ${response.status}`);
            }

            const data = await response.json();

            // OMDb returns { Response: "False", Error: "Movie not found!" } on failures
            if (data.Response === 'False') {
                const apiError = data.Error || 'No movies found matching your query.';
                
                // If it's an API key error or network restriction, try fallback
                if (apiError.toLowerCase().includes('key') || apiError.toLowerCase().includes('request limit')) {
                    console.warn('OMDb key limit reached, switching to TVMaze fallback.');
                    return await MovieApi.searchFallbackTVMaze(trimmed);
                }

                throw new Error(apiError);
            }

            // Normalize search results
            const results = (data.Search || []).map(item => {
                const { Title, Year, imdbID, Type, Poster } = item;
                return {
                    id: imdbID,
                    imdbID,
                    title: Title,
                    year: Year,
                    type: Type || 'movie',
                    poster: Poster && Poster !== 'N/A' ? Poster : null,
                    raw: item
                };
            });

            return {
                results,
                totalResults: parseInt(data.totalResults, 10) || results.length
            };
        } catch (error) {
            // Check if error is movie not found - propagate directly
            if (error.message && (
                error.message.includes('not found') || 
                error.message.includes('Too many results') ||
                error.message.includes('enter a movie title')
            )) {
                throw error;
            }

            // Attempt fallback to TVMaze on network or other OMDb API issues
            try {
                return await MovieApi.searchFallbackTVMaze(trimmed);
            } catch (fallbackError) {
                throw new Error(error.message || 'Failed to search for movies. Please check your internet connection.');
            }
        }
    },

    /**
     * Get detailed information for a specific movie by IMDb ID
     * @param {string} id 
     * @returns {Promise<object>}
     */
    getMovieDetails: async (id) => {
        if (!id) throw new Error('A movie ID is required.');

        // If ID is a TVMaze synthetic id
        if (id.startsWith('tvmaze-')) {
            return await MovieApi.getTVMazeDetails(id.replace('tvmaze-', ''));
        }

        const apiKey = MovieApi.getApiKey();
        const url = `${OMDB_BASE_URL}?apikey=${apiKey}&i=${encodeURIComponent(id)}&plot=full`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OMDb details HTTP error ${response.status}`);
            }

            const data = await response.json();

            if (data.Response === 'False') {
                throw new Error(data.Error || 'Could not load movie details.');
            }

            // Destructure detailed properties
            const {
                Title,
                Year,
                Rated,
                Released,
                Runtime,
                Genre,
                Director,
                Writer,
                Actors,
                Plot,
                Language,
                Country,
                Awards,
                Poster,
                Ratings,
                imdbRating,
                imdbVotes,
                imdbID,
                Type,
                BoxOffice
            } = data;

            return {
                id: imdbID,
                imdbID,
                title: Title,
                year: Year,
                rated: Rated && Rated !== 'N/A' ? Rated : 'Not Rated',
                released: Released && Released !== 'N/A' ? Released : 'Unknown',
                runtime: Runtime && Runtime !== 'N/A' ? Runtime : 'Unknown',
                genre: Genre && Genre !== 'N/A' ? Genre.split(', ') : [],
                director: Director && Director !== 'N/A' ? Director : 'Unknown',
                writer: Writer && Writer !== 'N/A' ? Writer : 'Unknown',
                actors: Actors && Actors !== 'N/A' ? Actors : 'Unknown',
                plot: Plot && Plot !== 'N/A' ? Plot : 'No plot synopsis available.',
                language: Language && Language !== 'N/A' ? Language : 'Unknown',
                country: Country && Country !== 'N/A' ? Country : 'Unknown',
                awards: Awards && Awards !== 'N/A' ? Awards : null,
                poster: Poster && Poster !== 'N/A' ? Poster : null,
                ratings: Ratings || [],
                imdbRating: imdbRating && imdbRating !== 'N/A' ? imdbRating : null,
                imdbVotes: imdbVotes && imdbVotes !== 'N/A' ? imdbVotes : null,
                type: Type || 'movie',
                boxOffice: BoxOffice && BoxOffice !== 'N/A' ? BoxOffice : null
            };
        } catch (error) {
            console.error('Error in getMovieDetails:', error);
            throw error;
        }
    },

    /**
     * Fallback search provider using public TVMaze API
     * @param {string} query 
     * @returns {Promise<{ results: Array<object>, totalResults: number }>}
     */
    searchFallbackTVMaze: async (query) => {
        const url = `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TVMaze fallback error: HTTP ${response.status}`);
        }
        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error(`No movies or shows found for "${query}".`);
        }

        const results = data.map(item => {
            const { show } = item;
            return {
                id: show.externals?.imdb || `tvmaze-${show.id}`,
                imdbID: show.externals?.imdb || `tvmaze-${show.id}`,
                title: show.name,
                year: show.premiered ? show.premiered.substring(0, 4) : 'N/A',
                type: show.type ? show.type.toLowerCase() : 'series',
                poster: show.image?.medium || show.image?.original || null,
                raw: show
            };
        });

        return {
            results,
            totalResults: results.length
        };
    },

    /**
     * TVMaze details lookup helper
     * @param {string} tvmazeId 
     * @returns {Promise<object>}
     */
    getTVMazeDetails: async (tvmazeId) => {
        const url = `${TVMAZE_BASE_URL}/shows/${tvmazeId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Show details unavailable.');
        const show = await response.json();

        // Strip HTML from summary
        const cleanSummary = show.summary ? show.summary.replace(/<[^>]*>?/gm, '') : 'No summary available.';

        return {
            id: `tvmaze-${show.id}`,
            imdbID: show.externals?.imdb || `tvmaze-${show.id}`,
            title: show.name,
            year: show.premiered ? show.premiered.substring(0, 4) : 'Unknown',
            rated: 'TV',
            released: show.premiered || 'Unknown',
            runtime: show.averageRuntime ? `${show.averageRuntime} min` : 'Unknown',
            genre: show.genres || [],
            director: 'Various',
            writer: 'Various',
            actors: 'Ensemble cast',
            plot: cleanSummary,
            language: show.language || 'English',
            country: show.network?.country?.name || 'International',
            awards: null,
            poster: show.image?.original || show.image?.medium || null,
            ratings: show.rating?.average ? [{ Source: 'TVMaze', Value: `${show.rating.average}/10` }] : [],
            imdbRating: show.rating?.average ? String(show.rating.average) : null,
            imdbVotes: null,
            type: 'series',
            boxOffice: null
        };
    }
};
