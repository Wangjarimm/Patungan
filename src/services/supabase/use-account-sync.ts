import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { useAccountStore } from '@/stores/account';

import { ensureAccount } from './account';
import { supabase } from './client';

// Keeps the anonymous account and profile in step with the stored name: on launch, when the
// name changes, when the device comes back online, and when the user taps "Coba lagi".
export function useAccountSync(): void {
  const displayName = useAccountStore((state) => state.displayName);
  const syncRequest = useAccountStore((state) => state.syncRequest);

  useEffect(() => {
    const { setConnection, setUserId } = useAccountStore.getState();
    if (!supabase) {
      setConnection('disabled');
      return;
    }
    if (!displayName) return;

    const client = supabase;
    let cancelled = false;
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      setConnection('connecting');
      const result = await ensureAccount(client, displayName);
      running = false;
      if (cancelled) return;
      if (result.ok) {
        setUserId(result.userId);
        setConnection('online');
      } else {
        setConnection(result.error === 'offline' ? 'offline' : 'error', result.error);
      }
    };

    void run();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isConnected === true && state.isInternetReachable !== false;
      const { status } = useAccountStore.getState();
      if (reachable && status !== 'online' && status !== 'connecting') void run();
      if (!reachable && status === 'online') setConnection('offline', 'offline');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [displayName, syncRequest]);
}
