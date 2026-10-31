import { createClient } from '@supabase/supabase-js';

// Default Supabase configuration from environment / credentials
export const DEFAULT_SUPABASE_URL = 'https://isfythqwvdpksiyegzub.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnl0aHF3dmRwa3NpeWVnenViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzM5OTMsImV4cCI6MjEwODM0OTk5M30.QLzG4x-rMPSubPfJnLc8lb1WfphSNtGioKRFN1U-0ao';

// Get active configuration (supports custom overrides stored in browser)
export function getSupabaseConfig() {
  const customUrl = localStorage.getItem('antigravity_supabase_url');
  const customAnon = localStorage.getItem('antigravity_supabase_anon_key');
  return {
    url: customUrl && customUrl.trim() ? customUrl.trim() : DEFAULT_SUPABASE_URL,
    anonKey: customAnon && customAnon.trim() ? customAnon.trim() : DEFAULT_SUPABASE_ANON_KEY,
  };
}

const config = getSupabaseConfig();

// Initialize client with automatic session persistence
export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Real-time Health Check
export async function checkSupabaseHealth() {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('user_accounts').select('id').limit(1);
    const latency = Date.now() - start;
    if (error && error.code !== 'PGRST116') {
      // Table might not exist yet or permission issue
      return {
        online: true,
        healthy: false,
        latency_ms: latency,
        message: error.message || 'Database connecting...',
        code: error.code,
      };
    }
    return {
      online: true,
      healthy: true,
      latency_ms: latency,
      message: 'Supabase Cloud PostgreSQL Active',
    };
  } catch (err) {
    return {
      online: false,
      healthy: false,
      latency_ms: Date.now() - start,
      message: err.message || 'Network error reaching Supabase',
    };
  }
}

// Fetch all linked accounts for a specific authenticated user
export async function fetchUserAccounts(userId) {
  if (!userId) return [];

  // Local storage fallback cache key
  const cacheKey = `antigravity_supabase_cache_${userId}`;

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchUserAccounts warning:', error.message);
      // Fallback to local storage cache if table is provisioning
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }

    if (data) {
      // Normalize data fields for React state
      const mapped = data.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        account_name: row.account_name,
        name: row.account_name,
        provider: row.provider,
        email: row.email,
        quota_tokens: Number(row.quota_tokens) || 10000000,
        total_tokens: Number(row.total_tokens) || 0,
        percent_used: Number(row.percent_used) || 0,
        status: row.status || 'Active',
        isConnected: true,
        latency_ms: row.latency_ms || 0,
        available_models: Array.isArray(row.available_models) ? row.available_models : [],
        created_at: row.created_at,
        last_sync: row.last_sync,
      }));

      // Cache locally for offline resilience
      localStorage.setItem(cacheKey, JSON.stringify(mapped));
      return mapped;
    }

    return [];
  } catch (err) {
    console.error('fetchUserAccounts exception:', err);
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
}

// Save or Update an account row in Supabase
export async function saveUserAccount(userId, account) {
  if (!userId || !account) return { success: false, error: 'Missing userId or account' };

  const cacheKey = `antigravity_supabase_cache_${userId}`;
  const rowId = account.id ? String(account.id) : `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payload = {
    id: rowId,
    user_id: String(userId),
    account_name: account.account_name || account.name || `Account #${rowId}`,
    provider: account.provider || 'gemini_apikey',
    email: account.email || null,
    quota_tokens: Number(account.quota_tokens) || 10000000,
    total_tokens: Number(account.total_tokens) || 0,
    percent_used: Number(account.percent_used) || 0,
    status: account.status || 'Active',
    api_key: account.api_key || null,
    latency_ms: Number(account.latency_ms) || 0,
    available_models: account.available_models || [],
    last_sync: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('saveUserAccount remote warning:', error.message);
      // Persist locally as fallback
      const cached = localStorage.getItem(cacheKey);
      const list = cached ? JSON.parse(cached) : [];
      const updated = [payload, ...list.filter((a) => a.id !== rowId)];
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      return { success: true, localOnly: true, data: payload, warning: error.message };
    }

    return { success: true, data: data?.[0] || payload };
  } catch (err) {
    console.error('saveUserAccount exception:', err);
    return { success: false, error: err.message };
  }
}

// Delete an account row from Supabase
export async function deleteUserAccount(userId, accountId) {
  if (!userId || !accountId) return { success: false };

  const cacheKey = `antigravity_supabase_cache_${userId}`;

  try {
    const { error } = await supabase
      .from('user_accounts')
      .delete()
      .eq('id', String(accountId))
      .eq('user_id', String(userId));

    // Also update local cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const list = JSON.parse(cached);
      const filtered = list.filter((a) => String(a.id) !== String(accountId));
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    }

    if (error) {
      console.warn('deleteUserAccount warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteUserAccount exception:', err);
    return { success: false, error: err.message };
  }
}

// Fetch the authentic live workspace telemetry from Supabase
export async function fetchWorkspaceTelemetry() {
  try {
    const { data, error } = await supabase
      .from('workspace_telemetry')
      .select('*')
      .eq('id', 'primary_workspace')
      .maybeSingle();

    if (error) {
      console.warn('fetchWorkspaceTelemetry warning:', error.message);
      return null;
    }

    if (data && data.summary) {
      return {
        metadata: data.metadata || {},
        summary: data.summary,
        calendar_days: data.calendar_days || [],
        models: data.models || {},
        monthly: data.monthly || {},
        hourly_distribution: data.hourly_distribution || {},
        conversations: data.conversations || [],
        updated_at: data.updated_at,
      };
    }
    return null;
  } catch (err) {
    console.error('fetchWorkspaceTelemetry exception:', err);
    return null;
  }
}

