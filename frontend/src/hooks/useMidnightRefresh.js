import { useEffect } from 'react';

// Watches for midnight and refetches data when the date changes
export default function useMidnightRefresh(currentDate, refetchers = []) {
  useEffect(() => {
    // When currentDate changes (which happens at midnight via useToday),
    // refetch all data sources to get the new day's data
    refetchers.forEach(refetch => {
      if (typeof refetch === 'function') {
        refetch();
      }
    });
  }, [currentDate, refetchers]);
}
