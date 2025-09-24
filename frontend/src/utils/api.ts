import type { SubmissionsResponse, HotSubmissionsResponse } from '../types';

const API_BASE_URL = 'https://reddit-time-warp-server.fly.dev';

// Cache for subreddits list
let subredditsCache: string[] | null = null;

export const apiClient = {
  async getSubmissions(
    subreddit: string,
    timestamp: number,
    options: {
      startTime?: number;
      endTime?: number;
      sortBy?: 'new' | 'old' | 'top';
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<SubmissionsResponse> {
    const params = new URLSearchParams();
    
    if (options.startTime) params.append('start_time', options.startTime.toString());
    if (options.endTime) params.append('end_time', options.endTime.toString());
    if (options.sortBy) params.append('sort_by', options.sortBy);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.skip) params.append('skip', options.skip.toString());

    const url = `${API_BASE_URL}/subreddits/${subreddit}/${timestamp}/submissions?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getHotSubmissions(
    subreddit: string,
    timestamp: number,
    options: {
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<HotSubmissionsResponse> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.skip) params.append('skip', options.skip.toString());

    const url = `${API_BASE_URL}/subreddits/${subreddit}/${timestamp}/submissions/hot?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch hot submissions: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getSubreddits(search?: string): Promise<string[]> {
    // Return cached data if available
    if (subredditsCache) {
      if (search) {
        return subredditsCache
          .filter(name => name.toLowerCase().includes(search.toLowerCase()))
          .slice(0, 10);
      }
      return subredditsCache.slice(0, 10);
    }

    // Fetch from API only once
    const url = `${API_BASE_URL}/subreddits`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch subreddits: ${response.statusText}`);
    }
    
    const allSubreddits: string[] = await response.json();
    
    // Cache the results
    subredditsCache = allSubreddits;
    
    // Filter on frontend if search term provided
    if (search) {
      return allSubreddits
        .filter(name => name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 10);
    }
    
    return allSubreddits.slice(0, 10);
  }
};
