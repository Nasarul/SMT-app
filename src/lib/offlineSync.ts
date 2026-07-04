import { supabase } from './supabase';

const SYNC_QUEUE_KEY = 'smt_sync_queue';

interface SyncItem {
  id: string;
  table: string;
  data: any;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
}

/**
 * Adds an item to the offline sync queue
 */
export function addToSyncQueue(table: string, data: any, action: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT') {
  const queue = getSyncQueue();
  const newItem: SyncItem = {
    id: Math.random().toString(36).substr(2, 9),
    table,
    data,
    action,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([...queue, newItem]));
  
  // Dispatch a custom event to notify the UI
  window.dispatchEvent(new CustomEvent('offline-sync-update', { detail: queue.length + 1 }));
}

/**
 * Gets all pending items in the queue
 */
export function getSyncQueue(): SyncItem[] {
  const data = localStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Processes the queue and pushes to Supabase
 */
export async function processSyncQueue() {
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`📡 Offline Sync: Processing ${queue.length} items...`);
  
  const failedItems: SyncItem[] = [];

  for (const item of queue) {
    try {
      let result;
      if (item.action === 'INSERT') {
        result = await supabase.from(item.table).insert([item.data]);
      } else if (item.action === 'UPDATE') {
        result = await supabase.from(item.table).update(item.data).eq('id', item.data.id);
      }
      
      if (result?.error) {
        console.error(`Sync failed for ${item.table}:`, result.error);
        failedItems.push(item);
      }
    } catch (err) {
      console.error(`Sync error for ${item.table}:`, err);
      failedItems.push(item);
    }
  }

  // Update storage with only failed items
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedItems));
  window.dispatchEvent(new CustomEvent('offline-sync-update', { detail: failedItems.length }));
  
  if (failedItems.length === 0) {
    console.log('✅ Offline Sync: All items synced successfully!');
  }
}

/**
 * Hook logic for online/offline detection
 */
export function initOfflineSync() {
  window.addEventListener('online', () => {
    console.log('🌐 System is online. Starting sync...');
    processSyncQueue();
  });

  window.addEventListener('offline', () => {
    console.warn('⚠️ System is offline. Changes will be saved locally.');
  });
}
