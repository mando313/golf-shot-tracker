import React, { useState, useRef } from 'react';
import { GameSettings, Scores, Hole, Course } from '../types';
import { ChevronLeft, ChevronRight, Trophy, Table2, Minus, Plus } from 'lucide-react';

type HoleCardProps = {
  settings: GameSettings;
  course: Course;
  scores: Scores;
  handicapAdjusted: boolean;
  readOnly?: boolean;
  onScoreChange: (holeNum: number, playerId: string, value: string) => void;
  getNetScore: (gross: number, playerId: string, hole: Hole) => number;
  standings: any;
  teamNames: { A: string; B: string };
  onShowFullScorecard: () => void;
};

export default function HoleCard({
  settings,
  course,
  scores,
  handicapAdjusted,
  readOnly,
  onScoreChange,
  getNetScore,
  standings,
  teamNames,
  onShowFullScorecard,
}: HoleCardProps) {
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const hole = course.holes[currentHoleIndex];
  const totalHoles = course.holes.length;

  const goToHole = (index: number) => {
    if (index >= 0 && index < totalHoles) {
      setCurrentHoleIndex(index);
    }
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipe = 50;
    if (diff > minSwipe) goToHole(currentHoleIndex + 1);
    if (diff < -minSwipe) goToHole(currentHoleIndex - 1);
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Score adjustment helpers
  const adjustScore = (playerId: string, delta: number) => {
    const current = scores[hole.number]?.[playerId] || 0;
    const next = current + delta;
    if (next >= 0 && next <= 20) {
      onScoreChange(hole.number, playerId, next === 0 ? '' : String(next));
    }
  };

  // Calculate over/under par for a player through current hole
  const getOverUnderPar = (playerId: string) => {
    let totalScore = 0;
    let totalPar = 0;
    let holesPlayed = 0;
    for (let i = 0; i <= currentHoleIndex; i++) {
      const h = course.holes[i];
      const gross = scores[h.number]?.[playerId] || 0;
      if (gross > 0) {
        const net = handicapAdjusted ? getNetScore(gross, playerId, h) : gross;
        totalScore += net;
        totalPar += h.par;
        holesPlayed++;
      }
    }
    if (holesPlayed === 0) return null;
    return { diff: totalScore - totalPar, totalScore, totalPar, holesPlayed };
  };

  // Determine hole winner
  const getHoleWinner = (holeNum: number) => {
    const holeData = course.holes.find(h => h.number === holeNum);
    if (!holeData) return null;
    const holeScores = scores[holeNum] || {};
    const entered = settings.players.filter(p => (holeScores[p.id] || 0) > 0);
    if (entered.length < 2) return null;

    const netScores: { id: string; name: string; net: number }[] = entered.map(p => ({
      id: p.id,
      name: p.name,
      net: handicapAdjusted ? getNetScore(holeScores[p.id], p.id, holeData) : holeScores[p.id],
    }));

    const minNet = Math.min(...netScores.map(s => s.net));
    const winners = netScores.filter(s => s.net === minNet);
    if (winners.length === 1) return { winner: winners[0].name, isTie: false };
    return { winner: null, isTie: true };
  };

  const holeWinner = getHoleWinner(hole.number);

  // Format over/under string
  const formatOverUnder = (diff: number) => {
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const overUnderColor = (diff: number) => {
    if (diff < 0) return 'text-red-400';
    if (diff === 0) return 'text-emerald-400';
    return 'text-blue-400';
  };

  const overUnderBg = (diff: number) => {
    if (diff < 0) return 'bg-red-950 border-red-800';
    if (diff === 0) return 'bg-emerald-950 border-emerald-800';
    return 'bg-blue-950 border-blue-800';
  };

  // Score label relative to par for a single hole
  const getScoreLabel = (gross: number, par: number) => {
    if (gross === 0) return null;
    const net = gross; // We show label based on actual strokes
    const diff = net - par;
    if (diff <= -2) return { label: 'Eagle', color: 'text-amber-400' };
    if (diff === -1) return { label: 'Birdie', color: 'text-red-400' };
    if (diff === 0) return { label: 'Par', color: 'text-emerald-400' };
    if (diff === 1) return { label: 'Bogey', color: 'text-blue-400' };
    if (diff === 2) return { label: 'Dbl Bogey', color: 'text-blue-300' };
    return { label: `+${diff}`, color: 'text-slate-400' };
  };

  return (
    <div className="md:hidden">
      {/* Hole navigation dots */}
      <div className="flex items-center justify-center gap-1 mb-3 flex-wrap px-2">
        {course.holes.map((h, i) => {
          const hasScore = settings.players.some(p => (scores[h.number]?.[p.id] || 0) > 0);
          return (
            <button
              key={h.number}
              onClick={() => setCurrentHoleIndex(i)}
              className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                i === currentHoleIndex
                  ? 'bg-emerald-600 text-white scale-110 shadow-md'
                  : hasScore
                  ? 'bg-emerald-900 text-emerald-400 border border-emerald-700'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {h.number}
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 overflow-hidden"
      >
        {/* Hole header */}
        <div className="bg-slate-950 text-white p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => goToHole(currentHoleIndex - 1)}
              disabled={currentHoleIndex === 0}
              className="p-2 rounded-xl bg-white/10 disabled:opacity-30 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">
                {currentHoleIndex < 9 ? 'Front 9' : 'Back 9'}
              </div>
              <div className="text-3xl font-bold">Hole {hole.number}</div>
              <div className="flex items-center justify-center gap-4 mt-1 text-sm text-slate-400">
                <span>Par {hole.par}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span>{hole.yardages[settings.selectedTee] || '-'} yds</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span>HCP {hole.handicap}</span>
              </div>
            </div>
            <button
              onClick={() => goToHole(currentHoleIndex + 1)}
              disabled={currentHoleIndex === totalHoles - 1}
              className="p-2 rounded-xl bg-white/10 disabled:opacity-30 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hole winner banner */}
        {holeWinner && (
          <div className={`px-4 py-2 text-center text-sm font-semibold ${
            holeWinner.isTie
              ? 'bg-slate-800 text-slate-400'
              : 'bg-amber-950 text-amber-300 border-b border-amber-800'
          }`}>
            {holeWinner.isTie ? (
              'Hole Tied'
            ) : (
              <span className="flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {holeWinner.winner} wins this hole
              </span>
            )}
          </div>
        )}

        {/* Player scores */}
        <div className="divide-y divide-slate-800">
          {settings.players.map(p => {
            const gross = scores[hole.number]?.[p.id] || 0;
            const net = gross > 0 && handicapAdjusted ? getNetScore(gross, p.id, hole) : null;
            const overUnder = getOverUnderPar(p.id);
            const scoreLabel = gross > 0 ? getScoreLabel(gross, hole.par) : null;
            const strokesReceived = handicapAdjusted ? (100 - getNetScore(100, p.id, hole)) : 0;

            return (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  {/* Player name + over/under */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 text-lg truncate">{p.name}</span>
                      {settings.playMode === 'Teams' && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          p.team === 'A' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                        }`}>
                          {p.team === 'A' ? 'A' : 'B'}
                        </span>
                      )}
                      {strokesReceived > 0 && (
                        <span className="text-xs font-medium text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                          Gets {strokesReceived} stroke{strokesReceived > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {overUnder ? (
                        <span className={`text-sm font-bold ${overUnderColor(overUnder.diff)}`}>
                          {formatOverUnder(overUnder.diff)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">No scores yet</span>
                      )}
                      {overUnder && (
                        <span className="text-xs text-slate-500">
                          ({overUnder.totalScore} thru {overUnder.holesPlayed})
                        </span>
                      )}
                      {scoreLabel && (
                        <span className={`text-xs font-semibold ${scoreLabel.color}`}>
                          {scoreLabel.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score input */}
                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <button
                        onClick={() => adjustScore(p.id, -1)}
                        className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center active:bg-slate-700 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="20"
                        value={gross || ''}
                        onChange={(e) => onScoreChange(hole.number, p.id, e.target.value)}
                        disabled={readOnly}
                        className={`w-16 h-14 text-2xl font-bold text-center bg-slate-800 border-2 border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-100 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                      />
                      {handicapAdjusted && net !== null && net !== gross && (
                        <span className="text-xs font-semibold text-emerald-400 mt-0.5">
                          Net: {net}
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => adjustScore(p.id, 1)}
                        className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center active:bg-slate-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall standings summary */}
        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Standings</div>
          <div className="flex flex-wrap gap-3">
            {settings.players.map(p => {
              const overUnder = getOverUnderPar(p.id);
              const totalGross = course.holes.reduce((s, h) => s + (scores[h.number]?.[p.id] || 0), 0);
              return (
                <div
                  key={p.id}
                  className={`flex-1 min-w-[80px] p-2.5 rounded-xl border text-center ${
                    overUnder ? overUnderBg(overUnder.diff) : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className="text-xs text-slate-400 font-medium truncate">{p.name}</div>
                  <div className="text-lg font-bold text-slate-100">{totalGross || '-'}</div>
                  {overUnder && (
                    <div className={`text-xs font-bold ${overUnderColor(overUnder.diff)}`}>
                      {formatOverUnder(overUnder.diff)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Game format specific standings */}
          {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && (
            <div className="mt-3 text-center text-sm font-semibold text-slate-300">
              {standings.matchPlay.A > standings.matchPlay.B
                ? `${teamNames.A} Up ${standings.matchPlay.A - standings.matchPlay.B}`
                : standings.matchPlay.B > standings.matchPlay.A
                ? `${teamNames.B} Up ${standings.matchPlay.B - standings.matchPlay.A}`
                : 'All Square'}
            </div>
          )}

          {settings.gameFormat === 'Match Play' && settings.playMode !== 'Teams' && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {settings.players.map(p => (
                <span key={p.id} className="text-xs font-medium text-slate-400">
                  {p.name}: {standings.matchPlay.playerWins[p.id]} won
                </span>
              ))}
            </div>
          )}

          {settings.gameFormat === 'Skins' && standings.skins.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {standings.skins.map((skin: any, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-amber-950 border border-amber-800 rounded-lg text-amber-300 text-xs font-medium">
                  #{skin.hole}: {skin.winner}{skin.carryOver > 0 ? ` (+${skin.carryOver})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View full scorecard button */}
      <button
        onClick={onShowFullScorecard}
        className="w-full mt-4 py-3 flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm"
      >
        <Table2 className="w-4 h-4" />
        View Full Scorecard
      </button>
    </div>
  );
}
