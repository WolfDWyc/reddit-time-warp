export interface Submission {
  id: string;
  title: string;
  author: string;
  selftext: string | null;
  created_utc: string;
  score: number;
  ups: number | null;
  downs: number | null;
  num_comments: number | null;
  media_url: string | null;
}

export interface SubmissionFilters {
  start_time?: string | null;
  end_time?: string | null;
  sort_by: 'new' | 'old' | 'top';
}

export interface SubmissionsResponse {
  subreddit: string;
  snapshot_datetime: string;
  filters?: SubmissionFilters | null;
  submissions: Submission[];
  count: number;
  limit: number;
  skip: number;
}

export interface HotSubmissionsResponse {
  subreddit: string;
  snapshot_datetime: string;
  submissions: Submission[];
  count: number;
  limit: number;
  skip: number;
}

export interface Subreddit {
  name: string;
  display_name: string;
  subscribers: number;
  description: string | null;
}

export interface TimeWarpState {
  subreddit: string;
  timestamp: number;
  sortBy: 'new' | 'old' | 'top' | 'hot';
  limit: number;
  skip: number;
  timePeriod?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

// IMDb API Types
export interface IMDbTitle {
  id: string;
  type: string;
  isAdult: boolean;
  primaryTitle: string;
  originalTitle: string;
  primaryImage?: {
    url: string;
    width: number;
    height: number;
    type: string;
  };
  startYear?: number;
  endYear?: number;
  runtimeSeconds?: number;
  genres: string[];
  rating?: {
    aggregateRating: number;
    voteCount: number;
  };
  metacritic?: {
    url: string;
    score: number;
    reviewCount: number;
  };
  plot?: string;
  directors: IMDbName[];
  writers: IMDbName[];
  stars: IMDbName[];
  originCountries: {
    code: string;
    name: string;
  }[];
  spokenLanguages: {
    code: string;
    name: string;
  }[];
  interests: {
    id: string;
    name: string;
    primaryImage?: {
      url: string;
      width: number;
      height: number;
      type: string;
    };
    description?: string;
    isSubgenre: boolean;
    similarInterests: any[];
  }[];
}

export interface IMDbName {
  id: string;
  displayName: string;
  alternativeNames: string[];
  primaryImage?: {
    url: string;
    width: number;
    height: number;
    type: string;
  };
  primaryProfessions: string[];
  biography?: string;
  heightCm?: number;
  birthName?: string;
  birthDate?: {
    year: number;
    month?: number;
    day?: number;
  };
  birthLocation?: string;
  deathDate?: {
    year: number;
    month?: number;
    day?: number;
  };
  deathLocation?: string;
  deathReason?: string;
  meterRanking?: {
    currentRank: number;
    changeDirection: string;
    difference: number;
  };
}

export interface IMDbEpisode {
  id: string;
  title: string;
  primaryImage?: {
    url: string;
    width: number;
    height: number;
    type: string;
  };
  season: string;
  episodeNumber: number;
  runtimeSeconds?: number;
  plot?: string;
  rating?: {
    aggregateRating: number;
    voteCount: number;
  };
  releaseDate?: {
    year: number;
    month?: number;
    day?: number;
  };
}

export interface IMDbSearchResponse {
  titles: IMDbTitle[];
}

export interface IMDbEpisodesResponse {
  episodes: IMDbEpisode[];
  totalCount: number;
  nextPageToken?: string;
}
