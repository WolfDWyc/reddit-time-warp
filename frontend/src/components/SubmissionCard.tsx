import { MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Submission } from '../types';
import { getTimestampFromDate, formatTimestamp } from '../utils/dateUtils';

interface SubmissionCardProps {
  submission: Submission;
  snapshotTimestamp: number;
}

export const SubmissionCard = ({ submission, snapshotTimestamp }: SubmissionCardProps) => {
  const createdTimestamp = getTimestampFromDate(new Date(submission.created_utc));
  const redditUrl = `https://reddit.com/r/${submission.author}/comments/${submission.id}`;
  
  // Calculate relative time from snapshot timestamp
  const getRelativeTimeFromSnapshot = (createdTimestamp: number, snapshotTimestamp: number): string => {
    const diff = snapshotTimestamp - createdTimestamp;
    
    const seconds = Math.floor(diff);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };
  
  return (
    <article className="card p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-3">
        {/* Voting arrows */}
        <div className="flex flex-col items-center space-y-1">
          <button 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowUp className="h-4 w-4 text-gray-400 hover:text-reddit-orange" />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{submission.score}</span>
          <button 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowDown className="h-4 w-4 text-gray-400 hover:text-blue-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-300 mb-2">
            <span>{formatTimestamp(createdTimestamp)}</span>
            <span className="hidden sm:inline">•</span>
            <span>{getRelativeTimeFromSnapshot(createdTimestamp, snapshotTimestamp)}</span>
 
          </div>

          <a 
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-reddit-orange transition-colors cursor-pointer"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {submission.title}
            </h3>

            {submission.selftext && (
              <div className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                <ReactMarkdown 
                  components={{
                    p: ({children}) => <span>{children}</span>,
                    strong: ({children}) => <strong>{children}</strong>,
                    em: ({children}) => <em>{children}</em>,
                    code: ({children}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">{children}</code>,
                    pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">{children}</pre>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-2 italic">{children}</blockquote>,
                    ul: ({children}) => <ul className="list-disc list-inside ml-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside ml-2">{children}</ol>,
                    li: ({children}) => <li>{children}</li>,
                    h1: ({children}) => <h1 className="text-xl font-bold">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold">{children}</h2>,
                    h3: ({children}) => <h3 className="text-base font-bold">{children}</h3>,
                    a: ({children, href}) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                  }}
                >
                  {submission.selftext}
                </ReactMarkdown>
              </div>
            )}

            {submission.media_url && (
              <div className="mb-3">
                <img
                  src={submission.media_url}
                  alt="Submission media"
                  className="max-w-full max-h-[500px] w-auto h-auto object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-300">
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span>{submission.num_comments || 0} comments</span>
              </div>
              <span>•</span>
              <span>by u/{submission.author}</span>
            </div>
          </a>
        </div>
      </div>
    </article>
  );
};
