import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useState, useRef, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  url: string;
  params?: Record<string, any>;
  enableBackground?: boolean;
  retryOnMount?: boolean;
  prefetch?: boolean;
}

interface OptimizedMutationOptions<T, V> extends Omit<UseMutationOptions<T, Error, V>, 'mutationFn'> {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidateQueries?: string[];
  optimisticUpdate?: (oldData: any, variables: V) => any;
}

interface CacheStrategy {
  staleTime: number;
  cacheTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
}

const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  realtime: {
    staleTime: 0,
    cacheTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true
  },
  frequent: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false
  },
  stable: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false
  },
  static: {
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false
  }
};

/**
 * Optimized query hook with intelligent caching and performance features
 */
export function useOptimizedQuery<T = any>(
  queryKey: string | (string | number)[],
  options: OptimizedQueryOptions<T>,
  cacheStrategy: keyof typeof CACHE_STRATEGIES = 'frequent'
) {
  const strategy = CACHE_STRATEGIES[cacheStrategy];
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create stable query key
  const stableQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  
  // Add params to query key for cache invalidation
  if (options.params) {
    stableQueryKey.push(JSON.stringify(options.params));
  }

  const queryResult = useQuery({
    queryKey: stableQueryKey,
    queryFn: async ({ signal }) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await apiRequest(options.url, {
          method: 'GET',
          params: options.params,
          signal: signal || abortControllerRef.current.signal
        });
        return response;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request cancelled:', stableQueryKey);
        }
        throw error;
      }
    },
    ...strategy,
    ...options,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Optimized query error:', error);
      options.onError?.(error);
    }
  });

  // Prefetch related queries
  useEffect(() => {
    if (options.prefetch && queryResult.isSuccess) {
      // Example: prefetch related data
      // This would be customized based on your API structure
    }
  }, [options.prefetch, queryResult.isSuccess, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...queryResult,
    // Additional helpers
    invalidate: () => queryClient.invalidateQueries({ queryKey: stableQueryKey }),
    prefetch: (newParams?: Record<string, any>) => {
      const prefetchKey = newParams 
        ? [...stableQueryKey.slice(0, -1), JSON.stringify(newParams)]
        : stableQueryKey;
      
      return queryClient.prefetchQuery({
        queryKey: prefetchKey,
        queryFn: () => apiRequest(options.url, { 
          method: 'GET', 
          params: newParams || options.params 
        }),
        ...strategy
      });
    }
  };
}

/**
 * Optimized mutation hook with automatic cache updates
 */
export function useOptimizedMutation<TData = any, TVariables = any>(
  options: OptimizedMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      return apiRequest(options.url, {
        method: options.method || 'POST',
        data: variables
      });
    },
    onMutate: async (variables) => {
      // Optimistic update
      if (options.optimisticUpdate && options.invalidateQueries) {
        const previousData = new Map();
        
        for (const queryKey of options.invalidateQueries) {
          const oldData = queryClient.getQueryData([queryKey]);
          previousData.set(queryKey, oldData);
          
          if (oldData) {
            const optimisticData = options.optimisticUpdate(oldData, variables);
            queryClient.setQueryData([queryKey], optimisticData);
          }
        }
        
        return { previousData };
      }
      
      return options.onMutate?.(variables);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData && options.invalidateQueries) {
        for (const queryKey of options.invalidateQueries) {
          const previousValue = context.previousData.get(queryKey);
          if (previousValue !== undefined) {
            queryClient.setQueryData([queryKey], previousValue);
          }
        }
      }
      
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      if (options.invalidateQueries) {
        for (const queryKey of options.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      }
      
      options.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      options.onSettled?.(data, error, variables, context);
    }
  });
}

/**
 * Hook for infinite queries with virtual scrolling optimization
 */
export function useOptimizedInfiniteQuery<T = any>(
  queryKey: string | (string | number)[],
  options: OptimizedQueryOptions<T> & {
    pageParam?: string;
    pageSize?: number;
  },
  cacheStrategy: keyof typeof CACHE_STRATEGIES = 'frequent'
) {
  const strategy = CACHE_STRATEGIES[cacheStrategy];
  const stableQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  return useQuery({
    queryKey: [...stableQueryKey, 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        ...options.params,
        page: pageParam,
        limit: options.pageSize || 20
      };
      
      return apiRequest(options.url, {
        method: 'GET',
        params
      });
    },
    ...strategy,
    ...options,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.meta?.hasNextPage) {
        return lastPage.meta.currentPage + 1;
      }
      return undefined;
    },
    getPreviousPageParam: (firstPage: any) => {
      if (firstPage?.meta?.hasPreviousPage) {
        return firstPage.meta.currentPage - 1;
      }
      return undefined;
    }
  });
}

/**
 * Smart cache management hook
 */
export function useCacheManager() {
  const queryClient = useQueryClient();

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      queryClient.removeQueries({
        predicate: (query) => 
          query.queryKey.some(key => 
            typeof key === 'string' && key.includes(pattern)
          )
      });
    } else {
      queryClient.clear();
    }
  }, [queryClient]);

  const getCacheSize = useCallback(() => {
    const cache = queryClient.getQueryCache();
    return cache.getAll().length;
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      total: queries.length,
      fresh: queries.filter(q => q.state.dataUpdateCount > 0 && !q.isStale()).length,
      stale: queries.filter(q => q.isStale()).length,
      fetching: queries.filter(q => q.state.isFetching).length,
      error: queries.filter(q => q.state.status === 'error').length
    };
  }, [queryClient]);

  const preloadCriticalData = useCallback(async (endpoints: string[]) => {
    const promises = endpoints.map(endpoint => 
      queryClient.prefetchQuery({
        queryKey: [endpoint],
        queryFn: () => apiRequest(endpoint),
        staleTime: CACHE_STRATEGIES.frequent.staleTime
      })
    );
    
    await Promise.allSettled(promises);
  }, [queryClient]);

  return {
    clearCache,
    getCacheSize,
    getCacheStats,
    preloadCriticalData
  };
}

/**
 * Background sync hook for offline support
 */
export function useBackgroundSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingMutations, setPendingMutations] = useState<any[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Resume queries when back online
      queryClient.resumePausedMutations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  const queueMutation = useCallback((mutation: any) => {
    if (!isOnline) {
      setPendingMutations(prev => [...prev, mutation]);
      return false; // Indicate that mutation was queued
    }
    return true; // Indicate that mutation can proceed
  }, [isOnline]);

  return {
    isOnline,
    pendingMutations,
    queueMutation
  };
}