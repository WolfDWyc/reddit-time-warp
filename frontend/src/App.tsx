import { useState } from 'react';
import { Header } from './components/Header';
import { SubredditSelector } from './components/SubredditSelector';
import { TimeSelector } from './components/TimeSelector';
import { IMDbSearchButton } from './components/IMDbSearchButton';
import { IMDbSearchDialog } from './components/IMDbSearchDialog';
import { SortSelector } from './components/SortSelector';
import { SubmissionList } from './components/SubmissionList';
import { WarpButton } from './components/WarpButton';
import { Footer } from './components/Footer';
import type { TimeWarpState } from './types';

const initialState: TimeWarpState = {
  subreddit: 'Invincible',
  timestamp: 1617036992,
  sortBy: 'hot',
  limit: 25,
  skip: 0,
};

export const App = () => {
  const [state, setState] = useState<TimeWarpState>(initialState);
  const [hasWarped, setHasWarped] = useState(false);
  const [isIMDbDialogOpen, setIsIMDbDialogOpen] = useState(false);

  const handleSortChange = (sortBy: 'new' | 'old' | 'top' | 'hot') => {
    setState(prev => ({ ...prev, sortBy }));
  };

  const handleTimePeriodChange = (timePeriod: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => {
    setState(prev => ({ ...prev, timePeriod }));
  };

  const handleWarp = () => {
    // Get current values from the input fields and apply to state
    const subredditInput = document.querySelector('input[placeholder="Invincible"]') as HTMLInputElement;
    const timeInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    
    const cleanSubreddit = subredditInput?.value.trim().replace(/^r\//, '') || 'Invincible';
    const timestamp = timeInput?.value ? Math.floor(new Date(timeInput.value).getTime() / 1000) : 1604275200;
    
    setState(prev => ({
      ...prev,
      subreddit: cleanSubreddit,
      timestamp: timestamp,
    }));
    setHasWarped(true);
  };

  const handleIMDbWarp = (timestamp: number) => {
    console.log('handleIMDbWarp called with timestamp:', timestamp);
    console.log('Current state before update:', state);
    
    // Get current subreddit value
    const subredditInput = document.querySelector('input[placeholder="Invincible"]') as HTMLInputElement;
    const cleanSubreddit = subredditInput?.value.trim().replace(/^r\//, '') || 'Invincible';
    
    console.log('Subreddit input value:', subredditInput?.value);
    console.log('Clean subreddit:', cleanSubreddit);
    
    const newState = {
      ...state,
      subreddit: cleanSubreddit,
      timestamp: timestamp,
    };
    
    console.log('New state:', newState);
    
    setState(newState);
    setHasWarped(true);
    
    console.log('State updated and hasWarped set to true');
  };

  return (
    <div className="min-h-screen bg-reddit-light dark:bg-black flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Compact Controls */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <SubredditSelector
              subreddit="Invincible"
              onSubredditChange={() => {}}
            />
            
            <TimeSelector
              timestamp={1617036992}
              onTimestampChange={() => {}}
            />
            
            <IMDbSearchButton 
              onClick={() => setIsIMDbDialogOpen(true)}
            />
            
            <WarpButton onClick={handleWarp} />
          </div>
        </div>

        {/* Submissions */}
        {hasWarped ? (
          <>
            {/* Sort Controls - only show after warping */}
            <div className="mb-6">
              <SortSelector
                sortBy={state.sortBy}
                timePeriod={state.timePeriod}
                onSortChange={handleSortChange}
                onTimePeriodChange={handleTimePeriodChange}
              />
            </div>
            
            <SubmissionList
              subreddit={state.subreddit}
              timestamp={state.timestamp}
              sortBy={state.sortBy}
              timePeriod={state.timePeriod}
            />
          </>
        ) : (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Ready to Time Warp?
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Choose a subreddit and a point in time, then click Warp!
            </p>
          </div>
        )}
      </main>
      
      <Footer />

      {/* IMDb Search Dialog */}
      <IMDbSearchDialog
        isOpen={isIMDbDialogOpen}
        onClose={() => setIsIMDbDialogOpen(false)}
        defaultSearchTerm={state.subreddit}
        onWarpToEpisode={handleIMDbWarp}
      />
    </div>
  );
};