import { ArrowUpDown, ArrowUp, ArrowDown, Clock, Flame } from 'lucide-react';

interface SortSelectorProps {
  sortBy: 'new' | 'old' | 'top' | 'hot';
  timePeriod?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  onSortChange: (sortBy: 'new' | 'old' | 'top' | 'hot') => void;
  onTimePeriodChange?: (timePeriod: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => void;
}

const sortOptions = [
  { value: 'hot', label: 'Hot', icon: Flame },
  { value: 'top', label: 'Top', icon: ArrowUpDown },
  { value: 'new', label: 'New', icon: ArrowUp },
  { value: 'old', label: 'Old', icon: ArrowDown },
];

const timePeriodOptions = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' },
];

export const SortSelector = ({ sortBy, timePeriod = 'all', onSortChange, onTimePeriodChange }: SortSelectorProps) => {
  return (
    <div className="card p-4">
      <div className="flex flex-col space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Sort by:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value as 'new' | 'old' | 'top' | 'hot')}
                  className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg border transition-colors ${
                    sortBy === option.value
                      ? 'bg-reddit-orange text-white border-reddit-orange'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {sortBy === 'top' && onTimePeriodChange && (
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Time period:</span>
            <div className="flex flex-wrap gap-1">
              {timePeriodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onTimePeriodChange(option.value as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all')}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    timePeriod === option.value
                      ? 'bg-reddit-orange text-white border-reddit-orange'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
