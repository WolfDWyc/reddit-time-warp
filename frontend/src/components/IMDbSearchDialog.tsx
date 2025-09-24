import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Calendar, Clock, Star, Play, Zap } from 'lucide-react';
import type { IMDbTitle, IMDbEpisode, IMDbSearchResponse, IMDbEpisodesResponse } from '../types';

interface IMDbSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSearchTerm: string;
  onWarpToEpisode: (timestamp: number) => void;
}

export const IMDbSearchDialog = ({ 
  isOpen, 
  onClose, 
  defaultSearchTerm, 
  onWarpToEpisode 
}: IMDbSearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [searchResults, setSearchResults] = useState<IMDbTitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<IMDbTitle | null>(null);
  const [episodes, setEpisodes] = useState<IMDbEpisode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'episodes' | 'warp'>('search');

  const searchTitles = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      console.log('Searching for:', query);
      const response = await fetch(`https://api.imdbapi.dev/search/titles?query=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log('Search response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search API error:', response.status, errorText);
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data: IMDbSearchResponse = await response.json();
      console.log('Search results:', data);
      setSearchResults(data.titles || []);
    } catch (error) {
      console.error('Error searching titles:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Reset state when dialog opens/closes and auto-search with default term
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(defaultSearchTerm);
      setSearchResults([]);
      setSelectedTitle(null);
      setEpisodes([]);
      setViewMode('search');
      
      // Auto-search with the default term when dialog opens
      if (defaultSearchTerm.trim()) {
        searchTitles(defaultSearchTerm);
      }
    }
  }, [isOpen, defaultSearchTerm, searchTitles]);

  // Debug view mode changes
  useEffect(() => {
    console.log('View mode changed to:', viewMode);
  }, [viewMode]);

  const loadEpisodes = async (titleId: string): Promise<void> => {
    setIsLoadingEpisodes(true);
    try {
      console.log('Loading episodes for title:', titleId);
      const response = await fetch(`https://api.imdbapi.dev/titles/${titleId}/episodes`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log('Episodes response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Episodes API error:', response.status, errorText);
        throw new Error(`Failed to load episodes: ${response.status}`);
      }
      
      const data: IMDbEpisodesResponse = await response.json();
      console.log('Episodes data:', data);
      setEpisodes(data.episodes || []);
    } catch (error) {
      console.error('Error loading episodes:', error);
      // Show a more user-friendly error message
      setEpisodes([]);
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchTitles(searchTerm);
  };

  const handleBrowse = (title: IMDbTitle) => {
    console.log('Browse title:', title);
    console.log('Title type:', title.type);
    console.log('Title type lowercase:', title.type?.toLowerCase());
    setSelectedTitle(title);
    
    // Check if it's a TV series type that should have episodes
    const isTVSeries = title.type === 'TV_SERIES' || 
                      title.type === 'TV_MINI_SERIES' || 
                      title.type === 'tvSeries' || 
                      title.type === 'tvMiniSeries' ||
                      title.type?.toLowerCase().includes('series');
    
    console.log('Is TV series:', isTVSeries);
    console.log('Setting view mode to:', isTVSeries ? 'episodes' : 'warp');
    
    if (isTVSeries) {
      setViewMode('episodes');
      loadEpisodes(title.id);
    } else {
      // For movies or other titles, go directly to warp mode
      setViewMode('warp');
      setEpisodes([]);
    }
  };

  const handleWarpToEpisode = (episode: IMDbEpisode) => {
    console.log('handleWarpToEpisode called with:', episode);
    if (episode.releaseDate) {
      // Calculate timestamp 24 hours after episode release
      const releaseDate = new Date(
        episode.releaseDate.year,
        (episode.releaseDate.month || 1) - 1,
        episode.releaseDate.day || 1
      );
      const warpTime = new Date(releaseDate.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      const timestamp = Math.floor(warpTime.getTime() / 1000);
      
      console.log('Episode release date:', releaseDate);
      console.log('Warp time (24h later):', warpTime);
      console.log('Calculated timestamp:', timestamp);
      console.log('Calling onWarpToEpisode with timestamp:', timestamp);
      
      onWarpToEpisode(timestamp);
      onClose();
    } else {
      console.log('No release date for episode:', episode);
    }
  };

  const handleWarpToTitle = (title: IMDbTitle) => {
    console.log('handleWarpToTitle called with:', title);
    if (title.startYear) {
      // Calculate timestamp 24 hours after title release
      const releaseDate = new Date(title.startYear, 0, 1); // January 1st of the release year
      const warpTime = new Date(releaseDate.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      const timestamp = Math.floor(warpTime.getTime() / 1000);
      
      console.log('Title start year:', title.startYear);
      console.log('Release date (Jan 1st):', releaseDate);
      console.log('Warp time (24h later):', warpTime);
      console.log('Calculated timestamp:', timestamp);
      console.log('Calling onWarpToEpisode with timestamp:', timestamp);
      
      onWarpToEpisode(timestamp);
      onClose();
    } else {
      console.log('No start year for title:', title);
    }
  };

  const formatRuntime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (date?: { year: number; month?: number; day?: number }): string => {
    if (!date) return 'N/A';
    const month = date.month ? String(date.month).padStart(2, '0') : '01';
    const day = date.day ? String(date.day).padStart(2, '0') : '01';
    return `${date.year}-${month}-${day}`;
  };

  const formatTitleType = (type: string): string => {
    // Convert camelCase and snake_case to proper title case
    return type
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .toLowerCase() // Convert to lowercase
      .split(' ') // Split into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' '); // Join with spaces
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            IMDb Search
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Search Form */}
          {viewMode === 'search' && (
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for movies or TV shows..."
                  className="input-field pl-10 w-full"
                />
              </div>
            </form>
          )}

          {/* Search Results */}
          {isSearching && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && viewMode === 'search' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Search Results
              </h3>
              <div className="space-y-3">
                {searchResults.map((title) => (
                  <div
                    key={title.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start space-x-4">
                      {title.primaryImage && (
                        <img
                          src={title.primaryImage.url}
                          alt={title.primaryTitle}
                          className="w-20 h-32 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {title.primaryTitle}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTitleType(title.type)} • {title.startYear}
                          {title.endYear && title.endYear !== title.startYear && ` - ${title.endYear}`}
                        </p>
                        {title.rating && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {title.rating.aggregateRating.toFixed(1)} ({title.rating.voteCount.toLocaleString()} votes)
                            </span>
                          </div>
                        )}
                        {title.plot && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {title.plot}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        {(() => {
                          const isTVSeries = title.type === 'TV_SERIES' || 
                                            title.type === 'TV_MINI_SERIES' || 
                                            title.type === 'tvSeries' || 
                                            title.type === 'tvMiniSeries' ||
                                            title.type?.toLowerCase().includes('series');
                          
                          if (isTVSeries) {
                            return (
                              <button
                                onClick={() => handleBrowse(title)}
                                className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                              >
                                <Play className="h-3 w-3" />
                                <span>Browse</span>
                              </button>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => handleBrowse(title)}
                                className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                              >
                                <Zap className="h-3 w-3" />
                                <span>Warp Here</span>
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Episodes */}
          {viewMode === 'episodes' && selectedTitle && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Episodes - {selectedTitle.primaryTitle}
                </h3>
                <button
                  onClick={() => setViewMode('search')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Back to Search
                </button>
              </div>
              
              {isLoadingEpisodes ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Loading episodes...</p>
                </div>
              ) : episodes.length > 0 ? (
                <div className="space-y-3">
                  {episodes.map((episode) => (
                    <div
                      key={episode.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start space-x-4">
                        {episode.primaryImage && (
                          <img
                            src={episode.primaryImage.url}
                            alt={episode.title}
                            className="w-24 h-18 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              S{episode.season}E{episode.episodeNumber}: {episode.title}
                            </h4>
                            <button
                              onClick={() => handleWarpToEpisode(episode)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors flex-shrink-0 ml-4"
                            >
                              <Zap className="h-3 w-3" />
                              <span>Warp Here</span>
                            </button>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {episode.releaseDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(episode.releaseDate)}</span>
                              </div>
                            )}
                            {episode.runtimeSeconds && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatRuntime(episode.runtimeSeconds)}</span>
                              </div>
                            )}
                            {episode.rating && (
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span>{episode.rating.aggregateRating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          {episode.plot && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {episode.plot}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">No episodes found for this title.</p>
                </div>
              )}
            </div>
          )}

          {/* Warp Mode for Movies/Non-TV Series */}
          {viewMode === 'warp' && selectedTitle && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Warp to {selectedTitle.primaryTitle}
                </h3>
                <button
                  onClick={() => setViewMode('search')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Back to Search
                </button>
              </div>
              
              <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-4">
                  {selectedTitle.primaryImage && (
                    <img
                      src={selectedTitle.primaryImage.url}
                      alt={selectedTitle.primaryTitle}
                      className="w-24 h-36 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white text-lg">
                      {selectedTitle.primaryTitle}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTitleType(selectedTitle.type)} • {selectedTitle.startYear}
                      {selectedTitle.endYear && selectedTitle.endYear !== selectedTitle.startYear && ` - ${selectedTitle.endYear}`}
                    </p>
                    {selectedTitle.rating && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTitle.rating.aggregateRating.toFixed(1)} ({selectedTitle.rating.voteCount.toLocaleString()} votes)
                        </span>
                      </div>
                    )}
                    {selectedTitle.plot && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {selectedTitle.plot}
                      </p>
                    )}
                    <div className="mt-4">
                      <button
                        onClick={() => handleWarpToTitle(selectedTitle)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        <span>Warp Here</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Results */}
          {viewMode === 'search' && !isSearching && searchResults.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No results found for "{searchTerm}"</p>
            </div>
          )}

          {/* Initial State */}
          {viewMode === 'search' && !isSearching && searchResults.length === 0 && !searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Enter a search term to find movies and TV shows</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
