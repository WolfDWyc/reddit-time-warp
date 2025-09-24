import React, { useState } from 'react';
import { SubredditAutocomplete } from './SubredditAutocomplete';

interface SubredditSelectorProps {
  subreddit: string;
  onSubredditChange: (subreddit: string) => void;
}

export const SubredditSelector = ({ subreddit }: SubredditSelectorProps) => {
  const [inputValue, setInputValue] = useState(subreddit);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Don't trigger onSubredditChange until Warp is clicked
  };

  // Update input value when subreddit prop changes (from Warp button)
  React.useEffect(() => {
    setInputValue(subreddit);
  }, [subreddit]);

  return (
    <div className="flex items-center space-x-3">
      <SubredditAutocomplete
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Invincible"
      />
    </div>
  );
};
