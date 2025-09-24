import { Zap } from 'lucide-react';

interface WarpButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const WarpButton = ({ onClick, disabled = false }: WarpButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-reddit-orange hover:bg-reddit-orange/90 text-white'
      }`}
    >
      <Zap className="h-4 w-4" />
      <span>Warp</span>
    </button>
  );
};
