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
