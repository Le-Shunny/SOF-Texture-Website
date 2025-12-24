import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SubscriptionOptions<T extends { [key: string]: any } = any> {
  table: string;
  filter?: string; // e.g., 'texture_id=eq.123'
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends { [key: string]: any } = any>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onError,
  enabled = true,
}: SubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const baseRetryDelay = 1000; // 1 second
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceDelay = 100; // 100ms debounce for rapid events

  const debouncedInsert = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      onInsert?.(payload);
    }, debounceDelay);
  }, [onInsert]);

  const debouncedUpdate = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      onUpdate?.(payload);
    }, debounceDelay);
  }, [onUpdate]);

  const debouncedDelete = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      onDelete?.(payload);
    }, debounceDelay);
  }, [onDelete]);

  const subscribe = () => {
    if (!enabled) return;

    try {
      let channel = supabase.channel(`realtime-${table}-${filter || 'all'}-${Date.now()}`);
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`Realtime event on ${table}:`, payload.eventType, payload.new, payload.old);

          switch (payload.eventType) {
            case 'INSERT':
              debouncedInsert(payload);
              break;
            case 'UPDATE':
              debouncedUpdate(payload);
              break;
            case 'DELETE':
              debouncedDelete(payload);
              break;
          }

          // Reset retry count on successful event
          retryCountRef.current = 0;
        }
      );

      channel.subscribe((status) => {
        console.log(`Subscription status for ${table}:`, status);

        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          handleError(new Error(`Subscription ${status.toLowerCase()}`));
        }
      });

      channelRef.current = channel;
    } catch (error) {
      handleError(error as Error);
    }
  };

  const handleError = (error: Error) => {
    console.error(`Realtime subscription error for ${table}:`, error);
    onError?.(error);

    if (retryCountRef.current < maxRetries) {
      const delay = baseRetryDelay * Math.pow(2, retryCountRef.current);
      retryCountRef.current += 1;

      retryTimeoutRef.current = setTimeout(() => {
        console.log(`Retrying subscription for ${table}, attempt ${retryCountRef.current}`);
        unsubscribe();
        subscribe();
      }, delay);
    } else {
      console.error(`Max retries reached for ${table} subscription`);
    }
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    console.log(`Subscribing to ${table} with filter ${filter}`);
    subscribe();

    return () => {
      console.log(`Unsubscribing from ${table}`);
      unsubscribe();
    };
  }, [table, filter, enabled]);

  // Re-subscribe if options change
  useEffect(() => {
    console.log(`Re-subscribing to ${table} due to callback changes`);
    unsubscribe();
    subscribe();
  }, [onInsert, onUpdate, onDelete, onError]);

  return { unsubscribe };
}