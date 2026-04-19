import React, { useState, useEffect, useRef } from 'react';
import Setup from './components/Setup';
import Scorecard from './components/Scorecard';
import History from './components/History';
import { GameSettings, SavedGame } from './types';

// Back up the raw value of `golf_history` whenever we can't parse it, so
// a corrupted entry is never silently lost — it can be recovered later.
function loadSavedGames(): SavedGame[] {
  try {
    const saved = localStorage.getItem('golf_history');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const raw = localStorage.getItem('golf_history');
      if (raw) localStorage.setItem('golf_history_backup_' + Date.now(), raw);
    } catch { /* ignore */ }
    return [];
  }
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings | null>(() => {
    try {
      const saved = localStorage.getItem('golf_settings');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [currentView, setCurrentView] = useState<'setup' | 'scorecard' | 'history'>(() => {
    try {
      const saved = localStorage.getItem('golf_view');
      return (saved === 'scorecard' || saved === 'history') ? saved : 'setup';
    } catch { return 'setup'; }
  });

  const [savedGames, setSavedGames] = useState<SavedGame[]>(loadSavedGames);
  // Skip the first history-write effect so we never overwrite whatever was
  // already in localStorage on mount (e.g. with [] after a parse failure).
  const historyHydrated = useRef(false);

  const [viewingGame, setViewingGame] = useState<SavedGame | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (settings) {
      localStorage.setItem('golf_settings', JSON.stringify(settings));
    } else {
      localStorage.removeItem('golf_settings');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('golf_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (!historyHydrated.current) {
      historyHydrated.current = true;
      return;
    }
    localStorage.setItem('golf_history', JSON.stringify(savedGames));
  }, [savedGames]);

  const handleCompleteSetup = (newSettings: GameSettings) => {
    setSettings(newSettings);
    setCurrentView('scorecard');
  };

  const handleClearData = () => {
    setSettings(null);
    setCurrentView('setup');
    setResetKey(prev => prev + 1);
    localStorage.removeItem('golf_settings');
    localStorage.removeItem('golf_scores');
    localStorage.removeItem('golf_view');
  };

  const handleSaveScore = (game: SavedGame) => {
    setSavedGames(prev => [game, ...prev]);
    handleClearData();
    setCurrentView('history');
  };

  return (
    <div className="bg-slate-950 font-sans text-slate-100 safe-top safe-bottom px-2 pt-2 pb-4" style={{ minHeight: '100dvh' }}>
      {currentView === 'setup' ? (
        <Setup 
          key={`setup-${resetKey}-${settings ? 'resuming' : 'new'}`}
          initialSettings={settings} 
          onComplete={handleCompleteSetup} 
          isResuming={!!settings}
          onViewHistory={() => setCurrentView('history')}
          onClearData={handleClearData}
        />
      ) : currentView === 'scorecard' ? (
        viewingGame ? (
          <Scorecard 
            key={viewingGame.id}
            settings={viewingGame.settings} 
            initialScores={viewingGame.scores}
            readOnly={true}
            onBack={() => {
              setViewingGame(null);
              setCurrentView('history');
            }} 
          />
        ) : (
          <Scorecard 
            settings={settings!} 
            onBack={() => setCurrentView('setup')} 
            onClearData={handleClearData}
            onSaveScore={handleSaveScore}
          />
        )
      ) : (
        <History 
          savedGames={savedGames} 
          onBack={() => setCurrentView(settings ? 'scorecard' : 'setup')} 
          onDelete={(ids) => setSavedGames(prev => prev.filter(g => !ids.includes(g.id)))}
          onViewGame={(game) => {
            setViewingGame(game);
            setCurrentView('scorecard');
          }}
        />
      )}
    </div>
  );
}
