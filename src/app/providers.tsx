import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createQueryClient,
  hydrateFromStorage,
  startPersisting,
} from '@kernel/query';
import { AuthProvider } from '@kernel/auth';
import { ConfirmHost, Toaster } from '@kernel/ui';

export function Providers({ children }: { children: ReactNode }) {
  // Build the client once and immediately paint from the last cache snapshot,
  // so a reload shows last-known data instead of a cold spinner.
  const [queryClient] = useState(() => {
    const qc = createQueryClient();
    hydrateFromStorage(qc);
    return qc;
  });

  // Mirror successful queries back to storage for the next open.
  useEffect(() => startPersisting(queryClient), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
        <ConfirmHost />
      </AuthProvider>
    </QueryClientProvider>
  );
}
