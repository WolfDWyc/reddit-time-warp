import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SubmissionCard } from './SubmissionCard';
import { apiClient } from '../utils/api';
import type { Submission } from '../types';

interface SubmissionListProps {
  subreddit: string;
  timestamp: number;
  sortBy: 'new' | 'old' | 'top' | 'hot';
  timePeriod?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

export const SubmissionList = ({ subreddit, timestamp, sortBy, timePeriod }: SubmissionListProps) => {
  // Convert time period to start_time and end_time for backend
  const getTimeRange = (timePeriod: string, snapshotTimestamp: number) => {
    let startTime: number;
    let endTime: number = snapshotTimestamp;

    switch (timePeriod) {
      case 'hour':
        startTime = snapshotTimestamp - 3600; // 1 hour ago
        break;
      case 'day':
        startTime = snapshotTimestamp - 86400; // 1 day ago
        break;
      case 'week':
        startTime = snapshotTimestamp - 604800; // 1 week ago
        break;
      case 'month':
        startTime = snapshotTimestamp - 2592000; // 30 days ago
        break;
      case 'year':
        startTime = snapshotTimestamp - 31536000; // 1 year ago
        break;
      case 'all':
      default:
        startTime = 0; // All time
        break;
    }

    return { startTime, endTime };
  };
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadSubmissions = async (skip = 0, append = false) => {
    if (!subreddit || !timestamp) return;

    if (skip === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      let data;
      if (sortBy === 'hot') {
        data = await apiClient.getHotSubmissions(subreddit, timestamp, {
          limit: 25,
          skip
        });
      } else {
        const options: any = {
          sortBy,
          limit: 25,
          skip
        };

        // Add time range for 'top' sort
        if (sortBy === 'top' && timePeriod && timePeriod !== 'all') {
          const { startTime, endTime } = getTimeRange(timePeriod, timestamp);
          options.startTime = startTime;
          options.endTime = endTime;
        }

        data = await apiClient.getSubmissions(subreddit, timestamp, options);
      }
      
      if (append) {
        setSubmissions(prev => [...prev, ...data.submissions]);
      } else {
        setSubmissions(data.submissions);
      }
      setHasMore(data.submissions.length === 25);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadSubmissions(submissions.length, true);
    }
  }, [loadingMore, hasMore, submissions.length]);

  useEffect(() => {
    setSubmissions([]);
    setHasMore(true);
    loadSubmissions();
  }, [subreddit, timestamp, sortBy, timePeriod]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-reddit-orange mx-auto mb-4" />
        <p className="text-gray-600">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => loadSubmissions()} className="btn-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600">No submissions found for this time period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {submissions.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} snapshotTimestamp={timestamp} />
        ))}
      </div>

      {loadingMore && (
        <div className="card p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-reddit-orange mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading more submissions...</p>
        </div>
      )}

      {!hasMore && submissions.length > 0 && (
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-600">No more submissions to load</p>
        </div>
      )}
    </div>
  );
};
