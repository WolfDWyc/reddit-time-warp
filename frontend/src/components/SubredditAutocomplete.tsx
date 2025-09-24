import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../utils/api';

interface SubredditAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SubredditAutocomplete = ({ value, onChange, placeholder = "Subreddit" }: SubredditAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await apiClient.getSubreddits(value);
        setSuggestions(results);
        setIsOpen(true); // Always show dropdown when searching
      } catch (error) {
        console.error('Failed to fetch subreddit suggestions:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleSuggestionClick = (subredditName: string) => {
    onChange(subredditName);
    setIsOpen(false);
    setJustSelected(true);
    // Small delay to ensure dropdown closes before refocusing
    setTimeout(() => {
      inputRef.current?.focus();
      setJustSelected(false);
    }, 10);
  };

  return (
    <div className="relative flex-1">
      <div className="input-field flex items-center px-3 py-2">
        <Search className="h-4 w-4 text-gray-400 mr-2" />
        <span className="text-gray-500 dark:text-gray-400 text-sm mr-1">r/</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          autoComplete="off"
          onFocus={() => {
            if (suggestions.length > 0 && !justSelected) setIsOpen(true);
          }}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-reddit-orange mx-auto"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((subredditName) => (
              <button
                key={subredditName}
                onClick={() => handleSuggestionClick(subredditName)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  r/{subredditName}
                </div>
              </button>
            ))
          ) : value.length >= 2 ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              No subreddits found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
