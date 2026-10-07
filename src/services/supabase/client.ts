import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

export type PatunganClient = SupabaseClient<Database>;

// Public values: the URL and the publishable key are meant to ship in the app.
// Row Level Security on every table is what protects the data.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

// Null when the build has no Supabase settings; the app then keeps working offline.
export const supabase: PatunganClient | null =
  url && key
    ? createClient<Database>(url, key, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Refresh the session only while the app is in the foreground, as Supabase recommends for
// React Native. The web keeps refreshing on its own.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
