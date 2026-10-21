import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import initialData from './data/initialData.json';
import Header from './components/Header';
import StatsBanner from './components/StatsBanner';
import Heatmap2D from './components/Heatmap2D';
import Isometric3D from './components/Isometric3D';
import RadarAndDonut from './components/RadarAndDonut';
import AccountsHub from './components/AccountsHub';
import ActivityTimeline from './components/ActivityTimeline';
import GitHubMatrix from './components/GitHubMatrix';
import SaaSAuthModal from './components/SaaSAuthModal';
import DayModal from './components/DayModal';
import DataSyncModal from './components/DataSyncModal';
import ExplainerModal from './components/ExplainerModal';
import './App.css';

export default function App() {
  const [data, setData] = useState(initialData);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('antigravity_user_name') || 'Daksh';
  });

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

  // Save username to localStorage
  useEffect(() => {
    localStorage.setItem('antigravity_user_name', userName);
  }, [userName]);

  // Try to load newest from Netlify Function /api/usage (cloud 24/7) or /antigravity-data.json
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
          .catch(() => {
            // Embedded initialData already active
          });
      });
  }, []);

  // Filter calendar days based on timeRange
  const filteredDays = useMemo(() => {
    if (!data?.calendar_days) return [];
    const all = data.calendar_days;
    if (timeRange === '7d') {
      return all.slice(-7);
    }
    if (timeRange === '30d') {
      return all.slice(-30);
    }
    if (timeRange === 'year') {
      return all.slice(-365);
    }
    return all;
  }, [data, timeRange]);

  // Calculate dynamic filtered totals based on model, account, and metric
  const { filteredTokens, filteredCost, activeDaysCount, totalTokensFormatted } = useMemo(() => {
    if (!filteredDays.length) {
      return { filteredTokens: 0, filteredCost: 0, activeDaysCount: 0, totalTokensFormatted: '0' };
    }

    let tSum = 0;
    let cSum = 0;
    let aDays = 0;

    filteredDays.forEach((d) => {
      let dayTokens = 0;
      let dayCost = 0;

      if (selectedModel !== 'all') {
        const m = d.models?.[selectedModel];
        if (m) {
          if (metricType === 'input') dayTokens = m.in;
          else if (metricType === 'output') dayTokens = m.out;
          else if (metricType === 'cache') dayTokens = m.cache;
          else if (metricType === 'cost') dayTokens = m.cost;
          else dayTokens = m.total;
          dayCost = m.cost;
        }
      } else if (selectedAccount !== 'all') {
        const a = d.accounts?.[selectedAccount];
        if (a) {
          if (metricType === 'input') dayTokens = a.in;
          else if (metricType === 'output') dayTokens = a.out;
          else if (metricType === 'cost') dayTokens = a.cost;
          else dayTokens = a.total;
          dayCost = a.cost;
        }
      } else {
        if (metricType === 'input') dayTokens = d.input_tokens;
        else if (metricType === 'output') dayTokens = d.output_tokens;
        else if (metricType === 'cache') dayTokens = d.cached_tokens;
        else if (metricType === 'cost') dayTokens = d.cost_usd;
        else dayTokens = d.total_tokens;
        dayCost = d.cost_usd;
      }

      tSum += dayTokens;
      cSum += dayCost;
      if (dayTokens >= 50) aDays++;
    });

    // Format string (e.g. 25.8M)
    let formatted = '0';
    if (tSum >= 1_000_000_000) formatted = (tSum / 1_000_000_000).toFixed(2) + 'B';
    else if (tSum >= 1_000_000) formatted = (tSum / 1_000_000).toFixed(1) + 'M';
    else if (tSum >= 1_000) formatted = (tSum / 1_000).toFixed(0) + 'K';
    else formatted = tSum.toLocaleString();

    return {
      filteredTokens: tSum,
      filteredCost: cSum,
      activeDaysCount: aDays,
      totalTokensFormatted: formatted,
    };
  }, [filteredDays, selectedModel, selectedAccount, metricType]);

  // Extract models list
  const modelsList = useMemo(() => {
    return Object.keys(data?.models || {});
  }, [data]);

  // Handle day select
  const handleSelectDay = (day) => {
    setSelectedDay(day);
    // Celebrate if level >= 4
    if (day.level >= 4) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00ff88', '#39d353', '#00f0ff'],
      });
    }
  };

  // Trigger sync
  const handleTriggerSync = () => {
    setIsSyncing(true);
    // Reload data after a simulated delay or fetch
    setTimeout(() => {
      fetch('/antigravity-data.json?t=' + Date.now())
        .then((r) => r.json())
        .then((json) => {
          setData(json);
          setIsSyncing(false);
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.5 },
            colors: ['#00ff88', '#ffffff'],
          });
        })
        .catch(() => {
          setIsSyncing(false);
        });
    }, 1200);
  };

  const handleImportData = (newJson) => {
    setData(newJson);
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="app-container">
      {/* 1. Header Navigation & Filter Bar */}
      <Header
        userName={userName}
        setUserName={setUserName}
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
        accountsList={data?.accounts || []}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenSaaS={() => setIsSaaSOpen(true)}
        totalTokensFormatted={totalTokensFormatted}
        activeDaysCount={activeDaysCount}
      />

      {/* 2. Top Stats Banner matching Image 1 layout */}
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

      {activeTab === 'git' && (
        <GitHubMatrix />
      )}

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
          accounts={data?.accounts || []}
          onSelectAccountFilter={(accId) => {
            setSelectedAccount(accId);
            setActiveTab('overview');
          }}
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
        <DayModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
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
        <ExplainerModal
          onClose={() => setIsExplainerOpen(false)}
        />
      )}

      {isSaaSOpen && (
        <SaaSAuthModal
          onClose={() => setIsSaaSOpen(false)}
        />
      )}
    </div>
  );
}
