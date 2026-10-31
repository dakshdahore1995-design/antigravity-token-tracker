import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import initialData from './data/initialData.json';
import { supabase, fetchUserAccounts, saveUserAccount, fetchWorkspaceTelemetry } from './lib/supabase';
import Header from './components/Header';
import StatsBanner from './components/StatsBanner';
import Heatmap2D from './components/Heatmap2D';
import Isometric3D from './components/Isometric3D';
import RadarAndDonut from './components/RadarAndDonut';
import AccountsHub from './components/AccountsHub';
import ActivityTimeline from './components/ActivityTimeline';
import GitHubMatrix from './components/GitHubMatrix';
import SaaSAuthModal from './components/SaaSAuthModal';
import AuthScreen from './components/AuthScreen';
import ErrorDiagnosticModal from './components/ErrorDiagnosticModal';
import DayModal from './components/DayModal';
import DataSyncModal from './components/DataSyncModal';
import ExplainerModal from './components/ExplainerModal';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

export default function App() {
  // Master User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('antigravity_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [userName, setUserName] = useState(() => {
    return currentUser?.name || localStorage.getItem('antigravity_user_name') || 'Daksh';
  });

  // Base Data State (starts empty, populated dynamically from Supabase)
  const [data, setData] = useState(() => ({
    ...initialData,
    accounts: [],
  }));

  // Accounts List State (Dynamic, unlimited accounts from Supabase)
  const [accountsList, setAccountsList] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');
  const [metricType, setMetricType] = useState('total');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');

  const [selectedDay, setSelectedDay] = useState(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isSaaSOpen, setIsSaaSOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [oauthNotice, setOauthNotice] = useState(null);
  const [globalDiagnostic, setGlobalDiagnostic] = useState(null);

  // Save currentUser whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('antigravity_current_user', JSON.stringify(currentUser));
      if (currentUser.name) setUserName(currentUser.name);
    } else {
      localStorage.removeItem('antigravity_current_user');
    }
  }, [currentUser]);

  // Load authentic live telemetry from Supabase Cloud on mount
  useEffect(() => {
    fetchWorkspaceTelemetry().then((remoteData) => {
      if (remoteData && remoteData.summary) {
        setData((prev) => ({
          ...prev,
          summary: remoteData.summary,
          calendar_days: remoteData.calendar_days,
          models: remoteData.models,
          monthly: remoteData.monthly,
          hourly_distribution: remoteData.hourly_distribution,
          conversations: remoteData.conversations,
        }));
      }
    });
  }, []);

  // Sync Accounts with Supabase whenever currentUser changes or on mount
  useEffect(() => {
    if (!currentUser?.id) {
      setAccountsList([]);
      setData((prev) => ({ ...prev, accounts: [] }));
      return;
    }

    let isMounted = true;
    fetchUserAccounts(currentUser.id).then((accounts) => {
      if (isMounted) {
        setAccountsList(accounts);
        setData((prev) => ({
          ...prev,
          accounts: accounts,
        }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Listen to Supabase Auth State changes (multi-browser session sync)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          email: session.user.email,
          email_confirmed: !!session.user.email_confirmed_at,
          auth_provider: session.user.app_metadata?.provider || 'supabase',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(session.user.email)}`,
          created_at: session.user.created_at,
        };
        setCurrentUser(u);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAccountsList([]);
        setData((prev) => ({ ...prev, accounts: [] }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Persist accounts list
  const handleAccountsChange = (updated) => {
    setAccountsList(updated);
    if (currentUser?.id) {
      const userKey = `antigravity_accounts_${currentUser.id}`;
      localStorage.setItem(userKey, JSON.stringify(updated));
    }

    // Also update data.accounts so child components stay synced
    setData((prev) => ({
      ...prev,
      accounts: updated,
    }));
  };

  // Handle Google OAuth callback on mount (Supports both master_login and connect_account)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateStr = urlParams.get('state');

    if (code && (window.location.pathname.includes('/auth/callback') || urlParams.has('code'))) {
      let parsedState = {};
      try {
        if (stateStr) parsedState = JSON.parse(stateStr);
      } catch (e) {
        console.warn('Could not parse OAuth state:', e);
      }

      const intent = parsedState.intent || 'connect_account';
      const accountId = parsedState.account_id || '1';
      const accountName = parsedState.account_name || `Google Account #${accountId}`;

      // If landed on pre-authorized Netlify callback from another origin (e.g. pages.dev):
      if (parsedState.origin && parsedState.origin !== window.location.origin && !window.location.origin.includes('localhost')) {
        window.location.href = `${parsedState.origin}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateStr)}`;
        return;
      }

      setOauthNotice({
        type: 'loading',
        message: intent === 'master_login'
          ? 'Authenticating user with Google Cloud OAuth...'
          : `Verifying Google OAuth connection for "${accountName}"...`,
      });

      fetch('/api/auth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com',
          origin: window.location.origin,
          redirect_uri: parsedState.redirect_uri || `${window.location.origin}/auth/callback`,
        }),
      })
        .then(async (res) => {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const rawText = await res.text();
            throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${rawText.slice(0, 100)}`);
          }
          return res.json();
        })
        .then((resp) => {
          if (resp.status === 'success' && resp.account) {
            if (intent === 'master_login') {
              // Master Login / Signup Successful
              const loggedUser = {
                id: resp.account.google_id || `google_${Date.now()}`,
                name: resp.account.name || 'Google Developer',
                email: resp.account.email,
                avatar: resp.account.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(resp.account.email)}`,
                created_at: resp.account.connected_at,
                auth_provider: 'google_oauth',
              };
              setCurrentUser(loggedUser);
              setUserName(loggedUser.name);

              setOauthNotice({
                type: 'success',
                message: `Signed in as ${loggedUser.email}! Welcome to Antigravity Token Matrix.`,
              });

              confetti({
                particleCount: 90,
                spread: 80,
                origin: { y: 0.4 },
                colors: ['#00ff88', '#00f0ff', '#4285F4'],
              });
            } else {
              // Connect Account Flow
              const newConnectedAccount = {
                id: parseInt(accountId, 10) || Date.now(),
                name: accountName,
                email: resp.account.email,
                avatar: resp.account.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(resp.account.email)}`,
                auth_type: 'google_oauth',
                isConnected: true,
                status: 'Verified & Active',
                quota_tokens: 10_000_000,
                total_tokens: 0,
                percent_used: 0,
                connected_at: resp.account.connected_at || new Date().toISOString(),
                errorDetails: null,
              };

              const existingList = accountsList.filter((a) => a.id.toString() !== accountId.toString());
              const updated = [...existingList, newConnectedAccount];
              handleAccountsChange(updated);
              if (currentUser?.id) {
                saveUserAccount(currentUser.id, newConnectedAccount);
              }

              setActiveTab('accounts');
              setOauthNotice({
                type: 'success',
                message: `Successfully linked ${resp.account.email} to ${accountName} with 24/7 cloud sync!`,
              });

              confetti({
                particleCount: 90,
                spread: 80,
                origin: { y: 0.4 },
                colors: ['#00ff88', '#00f0ff', '#4285F4'],
              });
            }
          } else {
            // Failure: Provide Specific Diagnostic Breakdown
            const diagData = {
              title: 'Google OAuth Verification Failed',
              service: 'Google OAuth 2.0 Token Endpoint',
              httpStatus: 400,
              errorCode: resp.error_code || 'AUTH_EXCHANGE_FAILED',
              rawMessage: resp.error || 'Unknown error occurred during OAuth code exchange.',
              diagnosis: resp.diagnosis || 'Google OAuth returned an error exchanging the authorization code.',
              fixSteps: resp.fix_steps || [
                'Ensure redirect URI is authorized in Google Cloud Console Credentials.',
                'Retry the sign-in from the application.',
              ],
              rawObject: resp.raw_google_error,
              testedAt: new Date().toLocaleTimeString(),
            };

            setGlobalDiagnostic(diagData);
            setOauthNotice({
              type: 'error',
              message: `OAuth Error [${resp.error_code || 'FAILED'}]: ${resp.error || 'Authorization failed'}`,
            });
          }
        })
        .catch((err) => {
          setGlobalDiagnostic({
            title: 'OAuth Network Exception',
            service: 'OAuth Endpoint',
            httpStatus: 0,
            errorCode: 'NETWORK_EXCEPTION',
            rawMessage: err.message,
            diagnosis: 'Network communication failure contacting the token exchange server.',
            fixSteps: ['Check your internet connection and try again.'],
          });
          setOauthNotice({
            type: 'error',
            message: `Network error verifying OAuth: ${err.message}`,
          });
        })
        .finally(() => {
          const cleanUrl = window.location.origin + window.location.pathname.replace(/\/auth\/callback\/?$/, '') + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl || '/');
          setTimeout(() => setOauthNotice(null), 8000);
        });
    }
  }, []);

  // Save username to localStorage
  useEffect(() => {
    localStorage.setItem('antigravity_user_name', userName);
  }, [userName]);

  // Load telemetry from Netlify /api/usage or fallback
  useEffect(() => {
    fetch('/api/usage')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('API not available, fallback to static');
      })
      .then((json) => {
        if (json && json.calendar_days) {
          setData(json);
        }
      })
      .catch(() => {
        fetch('/antigravity-data.json')
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json && json.calendar_days) {
              setData(json);
            }
          })
          .catch(() => {});
      });
  }, []);

  // Filter Calendar Days based on timeRange
  const filteredDays = useMemo(() => {
    if (!data || !data.calendar_days) return [];
    const allDays = data.calendar_days;

    if (timeRange === 'all') return allDays;

    const daysCount = timeRange === 'year' ? 365 : timeRange === '30d' ? 30 : 7;
    return allDays.slice(-daysCount);
  }, [data, timeRange]);

  // Compute Models List from actual data
  const modelsList = useMemo(() => {
    if (!data || !data.models) return [];
    return Object.keys(data.models);
  }, [data]);

  // Filtered Totals based on current metrics and account filter
  const { filteredTokens, filteredCost, activeDaysCount } = useMemo(() => {
    let tokens = 0;
    let cost = 0;
    let activeDays = 0;

    filteredDays.forEach((day) => {
      let dayTokens = 0;

      if (metricType === 'total') dayTokens = day.total_tokens || 0;
      else if (metricType === 'input') dayTokens = day.input_tokens || 0;
      else if (metricType === 'output') dayTokens = day.output_tokens || 0;
      else if (metricType === 'cache') dayTokens = day.cache_read_tokens || 0;
      else if (metricType === 'cost') dayTokens = day.total_tokens || 0;

      if (selectedModel !== 'all' && day.models && day.models[selectedModel]) {
        dayTokens = day.models[selectedModel].total_tokens || 0;
      }

      if (dayTokens > 0) {
        activeDays++;
        tokens += dayTokens;
        cost += (dayTokens / 1_000_000) * 1.5;
      }
    });

    return {
      filteredTokens: tokens,
      filteredCost: cost,
      activeDaysCount: activeDays,
    };
  }, [filteredDays, metricType, selectedModel]);

  const totalTokensFormatted = useMemo(() => {
    if (filteredTokens >= 1_000_000) {
      return (filteredTokens / 1_000_000).toFixed(2) + 'M';
    }
    if (filteredTokens >= 1_000) {
      return (filteredTokens / 1_000).toFixed(1) + 'k';
    }
    return filteredTokens.toString();
  }, [filteredTokens]);

  const handleSelectDay = (day) => {
    setSelectedDay(day);
  };

  const handleImportData = (newJson) => {
    if (newJson && newJson.calendar_days) {
      setData(newJson);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#00f0ff', '#ff0055', '#ffe600'],
      });
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const remoteData = await fetchWorkspaceTelemetry();
      if (remoteData && remoteData.summary) {
        setData((prev) => ({
          ...prev,
          summary: remoteData.summary,
          calendar_days: remoteData.calendar_days,
          models: remoteData.models,
          monthly: remoteData.monthly,
          hourly_distribution: remoteData.hourly_distribution,
          conversations: remoteData.conversations,
        }));
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00f0ff', '#4285F4'],
        });
      }
    } catch (e) {
      console.warn('Sync via Supabase failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    if (confirm('Sign out of Antigravity Token Matrix?')) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAccountsList([]);
      localStorage.removeItem('antigravity_current_user');
    }
  };

  // If user is NOT authenticated, display the Authentication Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#00ff88', '#00f0ff', '#4285F4'],
          });
        }}
        initialError={globalDiagnostic}
      />
    );
  }

  return (
    <div className="app-container">
      {/* 1. Header with dynamic user profile and subfilters */}
      <Header
        userName={userName}
        setUserName={setUserName}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        metricType={metricType}
        setMetricType={setMetricType}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
        modelsList={modelsList}
        accountsList={accountsList}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenSaaS={() => setIsSaaSOpen(true)}
        totalTokensFormatted={totalTokensFormatted}
        activeDaysCount={activeDaysCount}
      />

      {/* Floating OAuth Notification Banner */}
      {oauthNotice && (
        <div
          className={`oauth-status-toast ${oauthNotice.type}`}
          style={{
            position: 'sticky',
            top: '16px',
            zIndex: 9000,
            padding: '12px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(16px)',
            background:
              oauthNotice.type === 'success'
                ? 'rgba(0, 255, 136, 0.15)'
                : oauthNotice.type === 'error'
                ? 'rgba(255, 50, 50, 0.18)'
                : 'rgba(0, 240, 255, 0.15)',
            border: `1px solid ${
              oauthNotice.type === 'success'
                ? 'rgba(0, 255, 136, 0.4)'
                : oauthNotice.type === 'error'
                ? 'rgba(255, 77, 77, 0.5)'
                : 'rgba(0, 240, 255, 0.3)'
            }`,
            color:
              oauthNotice.type === 'success'
                ? '#00ff88'
                : oauthNotice.type === 'error'
                ? '#ff6b6b'
                : '#00f0ff',
          }}
        >
          {oauthNotice.type === 'loading' && <RefreshCw size={18} className="spin-anim" />}
          {oauthNotice.type === 'success' && <CheckCircle2 size={18} />}
          {oauthNotice.type === 'error' && <AlertCircle size={18} />}
          <span>{oauthNotice.message}</span>
        </div>
      )}

      {/* 2. Top Stats Banner matching layout */}
      <StatsBanner
        summary={data?.summary}
        filteredTokens={filteredTokens}
        filteredCost={filteredCost}
      />

      {/* 3. Main Dynamic Content View */}
      {activeTab === 'overview' && (
        <Heatmap2D
          calendarDays={filteredDays}
          filteredMetric={metricType}
          selectedModel={selectedModel}
          selectedAccount={selectedAccount}
          onSelectDay={handleSelectDay}
          onOpenExplainer={() => setIsExplainerOpen(true)}
          totalTokensFormatted={totalTokensFormatted}
        />
      )}

      {activeTab === 'git' && <GitHubMatrix />}

      {activeTab === 'isometric' && (
        <Isometric3D
          calendarDays={filteredDays}
          onSelectDay={handleSelectDay}
          filteredMetric={metricType}
          selectedModel={selectedModel}
        />
      )}

      {activeTab === 'analytics' && (
        <RadarAndDonut
          modelsData={data?.models}
          monthlyData={data?.monthly}
          summary={data?.summary}
        />
      )}

      {activeTab === 'accounts' && (
        <AccountsHub
          accounts={accountsList}
          onAccountsChange={handleAccountsChange}
          selectedAccountFilter={selectedAccount}
          onSelectAccountFilter={(accId) => {
            setSelectedAccount(accId);
            setActiveTab('overview');
          }}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'timeline' && (
        <ActivityTimeline
          conversations={data?.conversations || []}
          onSelectDay={handleSelectDay}
        />
      )}

      {/* 4. Secondary Views shown on Overview */}
      {activeTab === 'overview' && (
        <RadarAndDonut
          modelsData={data?.models}
          monthlyData={data?.monthly}
          summary={data?.summary}
        />
      )}

      {/* Modals */}
      {selectedDay && (
        <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}

      {isSyncModalOpen && (
        <DataSyncModal
          data={data}
          onClose={() => setIsSyncModalOpen(false)}
          onImportData={handleImportData}
          onTriggerSync={handleTriggerSync}
          isSyncing={isSyncing}
        />
      )}

      {isExplainerOpen && (
        <ExplainerModal onClose={() => setIsExplainerOpen(false)} />
      )}

      {isSaaSOpen && (
        <SaaSAuthModal onClose={() => setIsSaaSOpen(false)} />
      )}

      {globalDiagnostic && (
        <ErrorDiagnosticModal
          errorData={globalDiagnostic}
          onClose={() => setGlobalDiagnostic(null)}
          onRetry={() => {
            setGlobalDiagnostic(null);
            setActiveTab('accounts');
          }}
        />
      )}
    </div>
  );
}
