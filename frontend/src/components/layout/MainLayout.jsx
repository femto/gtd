import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import QuickEntryModal from '../common/QuickEntryModal';
import FeedbackButton from '../common/FeedbackButton';
import { stats as statsApi } from '../../services/api';

export default function MainLayout() {
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [stats, setStats] = useState({});

  const fetchStats = useCallback(async () => {
    try {
      const data = await statsApi.overview();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Keyboard shortcut for quick entry
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + N for quick entry
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickEntry(true);
      }
      // Escape to close
      if (e.key === 'Escape') {
        setShowQuickEntry(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickEntrySuccess = () => {
    setShowQuickEntry(false);
    fetchStats();
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      <Sidebar
        onQuickEntry={() => setShowQuickEntry(true)}
        stats={stats}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet context={{ refreshStats: fetchStats }} />
      </main>

      {showQuickEntry && (
        <QuickEntryModal
          onClose={() => setShowQuickEntry(false)}
          onSuccess={handleQuickEntrySuccess}
        />
      )}

      <FeedbackButton />
    </div>
  );
}
