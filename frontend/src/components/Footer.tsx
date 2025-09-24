export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Made for educational purposes. Made possible using Pushshift data dumps. Updated until December 2024. 
            Currently, for storage saving purposes, only includes subreddits that have a dump less than 250MB.
          </p>
        </div>
      </div>
    </footer>
  );
};
