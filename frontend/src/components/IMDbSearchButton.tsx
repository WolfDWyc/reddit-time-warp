import { Search } from 'lucide-react';

interface IMDbSearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const IMDbSearchButton = ({ onClick, disabled = false }: IMDbSearchButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 border border-blue-500/30'
      }`}
    >
      <Search className="h-4 w-4" />
      <span className="text-sm">IMDb Warp</span>
    </button>
  );
};
