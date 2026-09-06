import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A day: the persisted snapshot can only hold what is still in
        // memory, and five minutes meant it never held more than the last
        // few screens - the "24 hours" on the persister was fiction.
        gcTime: 24 * 60 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
