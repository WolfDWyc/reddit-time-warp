import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface TimeSelectorProps {
  timestamp: number;
  onTimestampChange: (timestamp: number) => void;
}

export const TimeSelector = ({ timestamp }: TimeSelectorProps) => {
  const [dateInput, setDateInput] = useState(() => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInput(e.target.value);
    // Don't trigger onTimestampChange until Warp is clicked
  };

  // Update input value when timestamp prop changes (from Warp button)
  React.useEffect(() => {
    const date = new Date(timestamp * 1000);
    setDateInput(date.toISOString().slice(0, 16));
  }, [timestamp]);

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="datetime-local"
          value={dateInput}
          onChange={handleDateChange}
          className="input-field pl-10 py-2"
        />
      </div>
    </div>
  );
};
