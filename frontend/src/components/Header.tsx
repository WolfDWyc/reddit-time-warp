import { Clock } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

export const Header = () => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 px-2 sm:px-0">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-reddit-orange" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Reddit Time Warp</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Browse Reddit from any point in time</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:block text-sm text-gray-600 dark:text-gray-300">
              made by <span className="font-medium">yoavc</span>
            </div>
            <DarkModeToggle />

          </div>
        </div>
      </div>
    </header>
  );
};
