import { useState, useMemo } from 'react';
import { useUploadAndAnalyze } from '@workspace/api-client-react';

// Wrapper hook to abstract the generated mutation and provide table sorting
export function useAnalysis() {
  const mutation = useUploadAndAnalyze();
  return mutation;
}

type SortDirection = 'asc' | 'desc';

export function useSortableData<T>(items: T[] = [], initialSortKey: keyof T | null = null) {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;

    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [items, sortKey, sortDirection]);

  const requestSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  return { items: sortedItems, requestSort, sortKey, sortDirection };
}
