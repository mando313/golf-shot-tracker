import React, { useState, useEffect } from 'react';
import { COURSES } from '../data/courses';
import { GameSettings, Player, PlayMode, GameFormat } from '../types';
import { Users, MapPin, Trophy, Settings, UserPlus, ArrowRight, Flag, History as HistoryIcon, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

type SetupProps = {
  key?: string;
  initialSettings: GameSettings | null;
  onComplete: (settings: GameSettings) => void;
  isResuming?: boolean;
  onViewHistory: () => void;
  onClearData: () => void;
};

const PRESET_PLAYERS = ['Shrikant', 'Rakshit', 'Ashwin', 'Nirmith', 'Akshat', 'Akshun', 'Madhur'];

export default function Setup({ initialSettings, onComplete, isResuming, onViewHistory, onClearData }: SetupProps) {
  const [numPlayers, setNumPlayers] = useState<number>(initialSettings?.numPlayers || 2);
  const [players, setPlayers] = useState<Player[]>(initialSettings?.players || [
    { id: '1', name: 'Player 1', handicap: 0 },
    { id: '2', name: 'Player 2', handicap: 0 },
  ]);
  const [courseId, setCourseId] = useState<string>(initialSettings?.courseId || COURSES[0].id);

  const currentCourse = COURSES.find(c => c.id === courseId) || COURSES[0];
  const [selectedTee, setSelectedTee] = useState<string>(
    initialSettings?.selectedTee || currentCourse.tees[0].name
  );

  const [playMode, setPlayMode] = useState<PlayMode>(initialSettings?.playMode || 'Individual');
  const [gameFormat, setGameFormat] = useState<GameFormat>(initialSettings?.gameFormat || 'Match Play');
  const [handicapAdjusted, setHandicapAdjusted] = useState<boolean>(initialSettings?.handicapAdjusted || false);
  const [handicapReduction, setHandicapReduction] = useState<number>(initialSettings?.handicapReduction ?? 4);
  const [showConfirm, setShowConfirm] = useState(false);

  // Update selected tee if course changes and current tee is not available
  useEffect(() => {
    if (!currentCourse.tees.find(t => t.name === selectedTee)) {
      setSelectedTee(currentCourse.tees[0].name);
    }
  }, [courseId, currentCourse, selectedTee]);

  const handleNumPlayersChange = (num: number) => {
    setNumPlayers(num);
    const newPlayers = [...players];
    if (num > newPlayers.length) {
      for (let i = newPlayers.length; i < num; i++) {
        newPlayers.push({ id: (i + 1).toString(), name: `Player ${i + 1}`, handicap: 0 });
      }
    } else {
      newPlayers.splice(num);
    }
    setPlayers(newPlayers);
    if (num < 4 && playMode === 'Teams') {
      setPlayMode('Individual');
    }
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string | number) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const handleTeamChange = (index: number, targetTeam: 'A' | 'B') => {
    const newPlayers = [...players];

    // Ensure default teams are set if not already
    newPlayers.forEach((p, idx) => {
      if (!p.team) p.team = idx < 2 ? 'A' : 'B';
    });

    const currentTeam = newPlayers[index].team;
    if (currentTeam === targetTeam) return;

    // Count how many are in the target team
    const inTargetTeam = newPlayers.filter(p => p.team === targetTeam);

    // If target team already has 2 players, swap one of them to the other team
    if (inTargetTeam.length >= 2) {
      const playerToSwap = newPlayers.find((p, idx) => p.team === targetTeam && idx !== index);
      if (playerToSwap) {
        playerToSwap.team = currentTeam;
      }
    }

    newPlayers[index].team = targetTeam;
    setPlayers(newPlayers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (playMode === 'Teams') {
      const teamA = players.filter((p, idx) => p.team === 'A' || (!p.team && idx < 2)).length;
      const teamB = players.filter((p, idx) => p.team === 'B' || (!p.team && idx >= 2)).length;
      if (teamA !== 2 || teamB !== 2) {
        alert('Please assign exactly 2 players to each team.');
        return;
      }
      players.forEach((p, idx) => {
        if (!p.team) p.team = idx < 2 ? 'A' : 'B';
      });
    }

    onComplete({
      numPlayers,
      players,
      courseId,
      selectedTee,
      playMode,
      gameFormat,
      handicapAdjusted,
      handicapReduction,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pt-10 pb-6 bg-slate-900 rounded-2xl shadow-sm border border-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-semibold text-slate-100 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-emerald-500" />
          Golf Tracker Pro
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onViewHistory}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl font-medium transition-colors"
          >
            <HistoryIcon className="w-4 h-4" />
            Scores
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-950 text-red-400 hover:bg-red-900 rounded-xl font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        message="Are you sure you want to clear all data and start over?"
        onConfirm={() => {
          setShowConfirm(false);
          onClearData();
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-400" />
            Select Course & Tees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-200"
            >
              {COURSES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {currentCourse.tees.map(tee => {
                const totalYardage = currentCourse.holes.reduce((sum, hole) => sum + (hole.yardages[tee.name] || 0), 0);
                return (
                  <button
                    key={tee.name}
                    type="button"
                    onClick={() => setSelectedTee(tee.name)}
                    className={`flex-1 min-w-[100px] py-2 px-2 rounded-xl border transition-all flex flex-col items-center justify-center ${
                      selectedTee === tee.name
                        ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-900 border-transparent shadow-sm'
                        : 'border-slate-600 opacity-70 hover:opacity-100'
                    } ${tee.color}`}
                  >
                    <span className="font-bold text-sm">{tee.name}</span>
                    <span className="text-xs opacity-90 font-medium">{totalYardage} yds</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Players
          </h2>
          <div className="flex gap-4 mb-4">
            {[2, 3, 4].map(num => (
              <button
                type="button"
                key={num}
                onClick={() => handleNumPlayersChange(num)}
                className={`flex-1 py-2 px-4 rounded-xl border font-medium transition-colors ${
                  numPlayers === num
                    ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {num} Players
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {players.map((player, idx) => (
              <div key={player.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-medium text-sm mt-2.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <select
                    value={player.dropdownValue || (PRESET_PLAYERS.includes(player.name) ? player.name : 'Enter Name')}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePlayerChange(idx, 'dropdownValue', val);
                      if (val !== 'Enter Name') {
                        handlePlayerChange(idx, 'name', val);
                      } else {
                        handlePlayerChange(idx, 'name', '');
                      }
                    }}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-200"
                    required
                  >
                    <option value="" disabled>Select Player</option>
                    {PRESET_PLAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="Enter Name">Enter Name...</option>
                  </select>

                  {(player.dropdownValue === 'Enter Name' || (!player.dropdownValue && !PRESET_PLAYERS.includes(player.name))) && (
                    <input
                      type="text"
                      value={player.name.startsWith('Player ') ? '' : player.name}
                      onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-200 placeholder-slate-500"
                      placeholder="Custom Name"
                      required
                    />
                  )}
                  {handicapAdjusted && (
                    <input
                      type="number"
                      value={player.handicapInput !== undefined ? player.handicapInput : (player.handicap || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (/^\d*\.?\d{0,1}$/.test(val) && parseFloat(val) <= 24)) {
                          const newPlayers = [...players];
                          newPlayers[idx] = { ...newPlayers[idx], handicapInput: val, handicap: parseFloat(val) || 0 };
                          setPlayers(newPlayers);
                        }
                      }}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-200 placeholder-slate-500"
                      placeholder="Handicap"
                      min="0"
                      max="24"
                      step="0.1"
                      required
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            Game Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Play Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlayMode('Individual')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    playMode === 'Individual'
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  disabled={numPlayers !== 4}
                  onClick={() => setPlayMode('Teams')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    playMode === 'Teams'
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  Teams (2v2)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Format</label>
              <select
                value={gameFormat}
                onChange={(e) => setGameFormat(e.target.value as GameFormat)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-slate-200"
              >
                <option value="Match Play">Match Play</option>
                <option value="Stroke Play">Stroke Play</option>
                <option value="Skins">Skins</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={handicapAdjusted}
                onChange={(e) => setHandicapAdjusted(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-800"
              />
              <span className="text-slate-300 font-medium">Handicap Adjusted</span>
            </label>
            {handicapAdjusted && (
              <p className="text-sm text-slate-500 mt-1 ml-8">
                Enter handicaps for each player above.
              </p>
            )}
            {handicapAdjusted && (gameFormat === 'Skins' || gameFormat === 'Match Play') && (
              <div className="mt-3 ml-8 flex items-center gap-3">
                <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Handicap Reduction</label>
                <input
                  type="number"
                  value={handicapReduction}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setHandicapReduction(isNaN(val) ? 0 : Math.max(0, Math.min(18, val)));
                  }}
                  className="w-20 p-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center text-slate-200 text-sm"
                  min="0"
                  max="18"
                />
                <p className="text-xs text-slate-500">Strokes subtracted from each player's handicap for net score calculation</p>
              </div>
            )}
          </div>
        </section>

        {playMode === 'Teams' && numPlayers === 4 && (
          <section className="space-y-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-400" />
              Assign Teams
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-emerald-400">Team A</h3>
                {players.map((p, idx) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name={`team-${p.id}`}
                      checked={p.team === 'A' || (!p.team && idx < 2)}
                      onChange={() => handleTeamChange(idx, 'A')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-blue-400">Team B</h3>
                {players.map((p, idx) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name={`team-${p.id}`}
                      checked={p.team === 'B' || (!p.team && idx >= 2)}
                      onChange={() => handleTeamChange(idx, 'B')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        <button
          type="submit"
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
        >
          {isResuming ? 'Resume Round' : 'Start Round'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
