import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GameSettings, Scores, Hole, SavedGame } from '../types';
import { COURSES } from '../data/courses';
import { ArrowLeft, Trophy, Trash2, Smartphone } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import HoleCard from './HoleCard';

type ScorecardProps = {
  key?: string;
  settings: GameSettings;
  onBack: () => void;
  onClearData?: () => void;
  onSaveScore?: (game: SavedGame) => void;
  initialScores?: Scores;
  readOnly?: boolean;
};

export default function Scorecard({ settings, onBack, onClearData, onSaveScore, initialScores, readOnly }: ScorecardProps) {
  const [scores, setScores] = useState<Scores>(() => {
    if (initialScores) return initialScores;
    try {
      const saved = localStorage.getItem('golf_scores');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const course = COURSES.find(c => c.id === settings.courseId)!;
  const [showConfirm, setShowConfirm] = useState(false);
  const [handicapAdjusted, setHandicapAdjusted] = useState(settings.handicapAdjusted);
  const [showFullScorecard, setShowFullScorecard] = useState(false);

  useEffect(() => {
    if (!readOnly) {
      localStorage.setItem('golf_scores', JSON.stringify(scores));
    }
  }, [scores, readOnly]);

  const handleScoreChange = (holeNum: number, playerId: string, value: string) => {
    const num = parseInt(value);
    setScores(prev => ({
      ...prev,
      [holeNum]: {
        ...prev[holeNum],
        [playerId]: isNaN(num) ? 0 : num
      }
    }));
  };

  const getNetScore = useCallback((gross: number, playerId: string, hole: Hole) => {
    if (!handicapAdjusted || gross === 0) return gross;
    const player = settings.players.find(p => p.id === playerId)!;

    let strokesReceived = 0;
    if (settings.gameFormat === 'Skins' || settings.gameFormat === 'Match Play') {
      let h = player.handicap - (settings.handicapReduction ?? 4);
      while (h > 0) {
        if (hole.handicap <= h) strokesReceived++;
        h -= 18;
      }
    } else if (settings.gameFormat === 'Stroke Play') {
      const minHandicap = Math.min(...settings.players.map(p => p.handicap));
      const courseHandicap = player.handicap - minHandicap;
      strokesReceived = Math.floor(courseHandicap / 18) + (hole.handicap <= courseHandicap % 18 ? 1 : 0);
    }
    return gross - strokesReceived;
  }, [settings, handicapAdjusted]);

  const standings = useMemo(() => {
    const results = {
      playerTotals: {} as Record<string, number>,
      teamTotals: { A: 0, B: 0 },
      skins: [] as { hole: number, winner: string, carryOver: number }[],
      skinsHoleResults: {} as Record<number, { winner?: string, skinsWon?: number, isTie?: boolean, carryOver?: number, worth: number }>,
      matchPlay: { A: 0, B: 0, playerWins: {} as Record<string, number>, holeWinners: {} as Record<number, 'A' | 'B' | 'Tie'> }
    };

    settings.players.forEach(p => {
      results.playerTotals[p.id] = 0;
      results.matchPlay.playerWins[p.id] = 0;
    });

    let carryOver = 0;

    course.holes.forEach(hole => {
      const holeScores = scores[hole.number] || {};
      const enteredPlayers = Object.keys(holeScores).filter(id => holeScores[id] > 0);

      const worth = carryOver + 1;
      results.skinsHoleResults[hole.number] = { worth };

      if (enteredPlayers.length === 0) return;

      const netScores = {} as Record<string, number>;
      enteredPlayers.forEach(id => {
        netScores[id] = getNetScore(holeScores[id], id, hole);
        results.playerTotals[id] += netScores[id];
      });

      let teamANet = Infinity;
      let teamBNet = Infinity;
      if (settings.playMode === 'Teams') {
        settings.players.forEach(p => {
          if (netScores[p.id]) {
            if (p.team === 'A') teamANet = Math.min(teamANet, netScores[p.id]);
            if (p.team === 'B') teamBNet = Math.min(teamBNet, netScores[p.id]);
          }
        });
        if (teamANet !== Infinity) results.teamTotals.A += teamANet;
        if (teamBNet !== Infinity) results.teamTotals.B += teamBNet;
      }

      if (settings.gameFormat === 'Skins') {
        if (settings.playMode === 'Teams' && teamANet !== Infinity && teamBNet !== Infinity) {
          if (teamANet < teamBNet) {
            results.skins.push({ hole: hole.number, winner: 'Team A', carryOver });
            results.skinsHoleResults[hole.number] = { worth, winner: 'Team A', skinsWon: worth };
            carryOver = 0;
          } else if (teamBNet < teamANet) {
            results.skins.push({ hole: hole.number, winner: 'Team B', carryOver });
            results.skinsHoleResults[hole.number] = { worth, winner: 'Team B', skinsWon: worth };
            carryOver = 0;
          } else {
            results.skinsHoleResults[hole.number] = { worth, isTie: true, carryOver: worth };
            carryOver++;
          }
        } else if (settings.playMode === 'Individual' && enteredPlayers.length === settings.players.length) {
          let minScore = Infinity;
          let minCount = 0;
          let winnerId = '';

          Object.entries(netScores).forEach(([id, score]) => {
            if (score < minScore) {
              minScore = score;
              minCount = 1;
              winnerId = id;
            } else if (score === minScore) {
              minCount++;
            }
          });

          if (minCount === 1) {
            const winnerName = settings.players.find(p => p.id === winnerId)?.name || '';
            results.skins.push({ hole: hole.number, winner: winnerName, carryOver });
            results.skinsHoleResults[hole.number] = { worth, winner: winnerName, skinsWon: worth };
            carryOver = 0;
          } else {
            results.skinsHoleResults[hole.number] = { worth, isTie: true, carryOver: worth };
            carryOver++;
          }
        }
      } else if (settings.gameFormat === 'Match Play') {
        if (settings.playMode === 'Teams' && teamANet !== Infinity && teamBNet !== Infinity) {
          if (teamANet < teamBNet) {
            results.matchPlay.A++;
            results.matchPlay.holeWinners[hole.number] = 'A';
          } else if (teamBNet < teamANet) {
            results.matchPlay.B++;
            results.matchPlay.holeWinners[hole.number] = 'B';
          } else {
            results.matchPlay.holeWinners[hole.number] = 'Tie';
          }
        } else if (settings.playMode === 'Individual' && enteredPlayers.length === settings.players.length) {
          let minScore = Infinity;
          let minCount = 0;
          let winnerId = '';
          Object.entries(netScores).forEach(([id, score]) => {
            if (score < minScore) {
              minScore = score;
              minCount = 1;
              winnerId = id;
            } else if (score === minScore) {
              minCount++;
            }
          });
          if (minCount === 1) {
            results.matchPlay.playerWins[winnerId]++;
          }
        }
      }
    });

    return results;
  }, [scores, settings, course, getNetScore]);

  const teamNames = useMemo(() => {
    if (settings.playMode !== 'Teams') return { A: 'Team A', B: 'Team B' };

    const getFirstName = (fullName: string) => fullName.split(' ')[0];

    const teamAPlayers = settings.players.filter(p => p.team === 'A').map(p => getFirstName(p.name));
    const teamBPlayers = settings.players.filter(p => p.team === 'B').map(p => getFirstName(p.name));

    return {
      A: teamAPlayers.length > 0 ? teamAPlayers.join(' / ') : 'Team A',
      B: teamBPlayers.length > 0 ? teamBPlayers.join(' / ') : 'Team B'
    };
  }, [settings.players, settings.playMode]);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          {readOnly ? 'Back to History' : 'Back to Setup'}
        </button>
        <div className="flex flex-col items-end gap-2">
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-500" />
            {course.name}
          </h1>
          <span className="text-sm text-slate-400 font-medium">{settings.selectedTee} Tees</span>
          <button
            onClick={() => setHandicapAdjusted(!handicapAdjusted)}
            className="flex items-center gap-2 mt-1"
          >
            <span className={`text-xs font-semibold uppercase tracking-wide ${handicapAdjusted ? 'text-emerald-400' : 'text-slate-500'}`}>
              HCP Adjusted
            </span>
            <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${handicapAdjusted ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${handicapAdjusted ? 'left-[21px]' : 'left-[3px]'}`} />
            </div>
          </button>
        </div>
      </div>

      {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-6 flex flex-col items-center justify-center text-center border border-slate-700">
          <div className="text-sm text-slate-400 font-medium uppercase tracking-widest mb-2">Current Match Status</div>
          <div className="text-4xl font-bold">
            {standings.matchPlay.A > standings.matchPlay.B
              ? `${teamNames.A} Up ${standings.matchPlay.A - standings.matchPlay.B}`
              : standings.matchPlay.B > standings.matchPlay.A
              ? `${teamNames.B} Up ${standings.matchPlay.B - standings.matchPlay.A}`
              : 'All Square'}
          </div>
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-700 mb-6">
        <h2 className="text-lg font-medium text-slate-200 mb-4">Current Standings - {settings.gameFormat}</h2>

        {settings.gameFormat === 'Stroke Play' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {settings.playMode === 'Teams' ? (
              <>
                <div className="p-4 bg-emerald-950 rounded-xl border border-emerald-800">
                  <div className="text-sm text-emerald-400 font-medium mb-1">{teamNames.A}</div>
                  <div className="text-2xl font-bold text-emerald-200">{standings.teamTotals.A || '-'}</div>
                </div>
                <div className="p-4 bg-blue-950 rounded-xl border border-blue-800">
                  <div className="text-sm text-blue-400 font-medium mb-1">{teamNames.B}</div>
                  <div className="text-2xl font-bold text-blue-200">{standings.teamTotals.B || '-'}</div>
                </div>
              </>
            ) : (
              settings.players.map(p => (
                <div key={p.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="text-sm text-slate-400 font-medium mb-1">{p.name}</div>
                  <div className="text-2xl font-bold text-slate-100">{standings.playerTotals[p.id] || '-'}</div>
                </div>
              ))
            )}
          </div>
        )}

        {settings.gameFormat === 'Match Play' && settings.playMode !== 'Teams' && (
          <div className="flex items-center gap-4">
            {settings.players.map(p => (
              <div key={p.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex-1">
                <div className="text-sm text-slate-400 font-medium mb-1">{p.name}</div>
                <div className="text-2xl font-bold text-slate-100">{standings.matchPlay.playerWins[p.id]} holes won</div>
              </div>
            ))}
          </div>
        )}

        {settings.gameFormat === 'Skins' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {standings.skins.length === 0 ? (
                <div className="text-slate-500 italic">No skins won yet.</div>
              ) : (
                standings.skins.map((skin, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-amber-950 border border-amber-800 rounded-lg text-amber-300 text-sm font-medium flex items-center gap-2">
                    Hole {skin.hole}: {skin.winner}
                    {skin.carryOver > 0 && <span className="bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded text-xs">+{skin.carryOver}</span>}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-4 border-t border-slate-700 pt-4">
              {settings.playMode === 'Teams' ? (
                <>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400">{teamNames.A} Skins</div>
                    <div className="text-xl font-semibold text-slate-200">
                      {standings.skins.filter(s => s.winner === 'Team A').reduce((acc, s) => acc + 1 + s.carryOver, 0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400">{teamNames.B} Skins</div>
                    <div className="text-xl font-semibold text-slate-200">
                      {standings.skins.filter(s => s.winner === 'Team B').reduce((acc, s) => acc + 1 + s.carryOver, 0)}
                    </div>
                  </div>
                </>
              ) : (
                settings.players.map(p => (
                  <div key={p.id} className="flex-1">
                    <div className="text-sm text-slate-400">{p.name}</div>
                    <div className="text-xl font-semibold text-slate-200">
                      {standings.skins.filter(s => s.winner === p.name).reduce((acc, s) => acc + 1 + s.carryOver, 0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile card view */}
      {!showFullScorecard && (
        <HoleCard
          settings={settings}
          course={course}
          scores={scores}
          handicapAdjusted={handicapAdjusted}
          readOnly={readOnly}
          onScoreChange={handleScoreChange}
          getNetScore={getNetScore}
          standings={standings}
          teamNames={teamNames}
          onShowFullScorecard={() => setShowFullScorecard(true)}
        />
      )}

      {/* Full scorecard table - always visible on desktop, toggleable on mobile */}
      <div className={showFullScorecard ? '' : 'hidden md:block'}>
        {showFullScorecard && (
          <button
            onClick={() => setShowFullScorecard(false)}
            className="md:hidden w-full mb-4 py-3 flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Smartphone className="w-4 h-4" />
            Back to Hole View
          </button>
        )}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">Hole</th>
              <th className="px-4 py-3 font-medium text-slate-400">Yds</th>
              <th className="px-4 py-3 font-medium text-slate-400">Par</th>
              <th className="px-4 py-3 font-medium text-slate-400">HCP</th>
              {settings.players.map(p => (
                <th key={p.id} className="px-4 py-3 font-medium text-slate-100">
                  <div className="flex flex-col">
                    <span>{p.name}</span>
                    {settings.playMode === 'Teams' && (
                      <span className={p.team === 'A' ? 'text-emerald-400 text-xs' : 'text-blue-400 text-xs'}>
                        {p.team === 'A' ? teamNames.A : teamNames.B}
                      </span>
                    )}
                    {handicapAdjusted && (
                      <span className="text-xs text-slate-500 font-normal">HCP: {p.handicap}</span>
                    )}
                  </div>
                </th>
              ))}
              {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && (
                <th className="px-4 py-3 font-medium text-slate-400">Result</th>
              )}
              {settings.gameFormat === 'Skins' && (
                <th className="px-4 py-3 font-medium text-slate-400">Skins</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {course.holes.map(hole => (
              <tr key={hole.number} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-100">{hole.number}</td>
                <td className="px-4 py-3 text-slate-400">{hole.yardages[settings.selectedTee] || '-'}</td>
                <td className="px-4 py-3 text-slate-400">{hole.par}</td>
                <td className="px-4 py-3 text-slate-400">{hole.handicap}</td>
                {settings.players.map(p => {
                  const gross = scores[hole.number]?.[p.id] || '';
                  const net = gross ? getNetScore(Number(gross), p.id, hole) : null;
                  return (
                    <td key={p.id} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={gross}
                          onChange={(e) => handleScoreChange(hole.number, p.id, e.target.value)}
                          disabled={readOnly}
                          className={`w-16 p-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center text-slate-200 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                        {handicapAdjusted && net !== null && net !== Number(gross) && (
                          <span className="text-xs font-medium text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                            {net}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && (
                  <td className="px-4 py-3 font-medium">
                    {standings.matchPlay.holeWinners[hole.number] === 'A' ? (
                      <span className="text-emerald-400 bg-emerald-950 px-2 py-1 rounded text-xs">{teamNames.A}</span>
                    ) : standings.matchPlay.holeWinners[hole.number] === 'B' ? (
                      <span className="text-blue-400 bg-blue-950 px-2 py-1 rounded text-xs">{teamNames.B}</span>
                    ) : standings.matchPlay.holeWinners[hole.number] === 'Tie' ? (
                      <span className="text-slate-400 bg-slate-800 px-2 py-1 rounded text-xs">Halved</span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                )}
                {settings.gameFormat === 'Skins' && (
                  <td className="px-4 py-3 font-medium">
                    {(() => {
                      const res = standings.skinsHoleResults[hole.number];
                      if (!res) return <span className="text-slate-500 text-xs">Worth {standings.skinsHoleResults[hole.number]?.worth || 1}</span>;

                      if (res.isTie) {
                        return <span className="text-amber-400 bg-amber-950 px-2 py-1 rounded text-xs">Carried Over ({res.carryOver})</span>;
                      }

                      if (res.winner) {
                        return (
                          <span className="text-emerald-400 bg-emerald-950 px-2 py-1 rounded text-xs">
                            {res.winner} won {res.skinsWon}
                          </span>
                        );
                      }

                      return <span className="text-slate-500 text-xs">Worth {res.worth}</span>;
                    })()}
                  </td>
                )}
              </tr>
            ))}
            {/* Front 9 Total */}
            <tr className="bg-slate-800 border-t-2 border-slate-600">
              <td className="px-4 py-2 font-bold text-slate-300" colSpan={2}>Front 9</td>
              <td className="px-4 py-2 font-bold text-slate-400">{course.holes.slice(0, 9).reduce((s, h) => s + h.par, 0)}</td>
              <td className="px-4 py-2"></td>
              {settings.players.map(p => {
                const grossFront = course.holes.slice(0, 9).reduce((s, h) => s + (scores[h.number]?.[p.id] || 0), 0);
                const netFront = course.holes.slice(0, 9).reduce((s, h) => {
                  const g = scores[h.number]?.[p.id] || 0;
                  return s + (g ? getNetScore(g, p.id, h) : 0);
                }, 0);
                return (
                  <td key={p.id} className="px-4 py-2 font-bold text-slate-200">
                    {grossFront || '-'}
                    {handicapAdjusted && netFront !== grossFront && grossFront > 0 && (
                      <span className="text-xs font-semibold text-emerald-400 ml-1">({netFront})</span>
                    )}
                  </td>
                );
              })}
              {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && <td className="px-4 py-2"></td>}
              {settings.gameFormat === 'Skins' && <td className="px-4 py-2"></td>}
            </tr>
            {/* Back 9 Total */}
            <tr className="bg-slate-800">
              <td className="px-4 py-2 font-bold text-slate-300" colSpan={2}>Back 9</td>
              <td className="px-4 py-2 font-bold text-slate-400">{course.holes.slice(9, 18).reduce((s, h) => s + h.par, 0)}</td>
              <td className="px-4 py-2"></td>
              {settings.players.map(p => {
                const grossBack = course.holes.slice(9, 18).reduce((s, h) => s + (scores[h.number]?.[p.id] || 0), 0);
                const netBack = course.holes.slice(9, 18).reduce((s, h) => {
                  const g = scores[h.number]?.[p.id] || 0;
                  return s + (g ? getNetScore(g, p.id, h) : 0);
                }, 0);
                return (
                  <td key={p.id} className="px-4 py-2 font-bold text-slate-200">
                    {grossBack || '-'}
                    {handicapAdjusted && netBack !== grossBack && grossBack > 0 && (
                      <span className="text-xs font-semibold text-emerald-400 ml-1">({netBack})</span>
                    )}
                  </td>
                );
              })}
              {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && <td className="px-4 py-2"></td>}
              {settings.gameFormat === 'Skins' && <td className="px-4 py-2"></td>}
            </tr>
            {/* Grand Total */}
            <tr className="bg-emerald-950 border-t-2 border-emerald-800">
              <td className="px-4 py-3 font-bold text-emerald-300 text-base" colSpan={2}>Total</td>
              <td className="px-4 py-3 font-bold text-emerald-400 text-base">{course.holes.reduce((s, h) => s + h.par, 0)}</td>
              <td className="px-4 py-3"></td>
              {settings.players.map(p => {
                const grossTotal = course.holes.reduce((s, h) => s + (scores[h.number]?.[p.id] || 0), 0);
                const netTotal = course.holes.reduce((s, h) => {
                  const g = scores[h.number]?.[p.id] || 0;
                  return s + (g ? getNetScore(g, p.id, h) : 0);
                }, 0);
                return (
                  <td key={p.id} className="px-4 py-3 font-bold text-emerald-200 text-base">
                    {grossTotal || '-'}
                    {handicapAdjusted && netTotal !== grossTotal && grossTotal > 0 && (
                      <span className="text-sm font-bold text-emerald-400 ml-1">({netTotal})</span>
                    )}
                  </td>
                );
              })}
              {settings.gameFormat === 'Match Play' && settings.playMode === 'Teams' && <td className="px-4 py-3"></td>}
              {settings.gameFormat === 'Skins' && <td className="px-4 py-3"></td>}
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={() => {
              const now = new Date();
              let winnerSummary = '';
              if (settings.gameFormat === 'Match Play') {
                if (settings.playMode === 'Teams') {
                  if (standings.matchPlay.A > standings.matchPlay.B) {
                    winnerSummary = `${teamNames.A} won by ${standings.matchPlay.A - standings.matchPlay.B}`;
                  } else if (standings.matchPlay.B > standings.matchPlay.A) {
                    winnerSummary = `${teamNames.B} won by ${standings.matchPlay.B - standings.matchPlay.A}`;
                  } else {
                    winnerSummary = 'Tied';
                  }
                } else {
                  let maxWins = -1;
                  let winners: string[] = [];
                  Object.entries(standings.matchPlay.playerWins).forEach(([id, winsValue]) => {
                    const wins = winsValue as number;
                    if (wins > maxWins) {
                      maxWins = wins;
                      winners = [settings.players.find(p => p.id === id)?.name || ''];
                    } else if (wins === maxWins) {
                      winners.push(settings.players.find(p => p.id === id)?.name || '');
                    }
                  });
                  if (winners.length === 1) {
                    winnerSummary = `${winners[0]} won (${maxWins} holes)`;
                  } else {
                    winnerSummary = `Tied (${maxWins} holes)`;
                  }
                }
              } else if (settings.gameFormat === 'Stroke Play') {
                if (settings.playMode === 'Teams') {
                  if (standings.teamTotals.A < standings.teamTotals.B) {
                    winnerSummary = `${teamNames.A} won (${standings.teamTotals.A})`;
                  } else if (standings.teamTotals.B < standings.teamTotals.A) {
                    winnerSummary = `${teamNames.B} won (${standings.teamTotals.B})`;
                  } else {
                    winnerSummary = `Tied (${standings.teamTotals.A})`;
                  }
                } else {
                  let minScore = Infinity;
                  let winners: string[] = [];
                  Object.entries(standings.playerTotals).forEach(([id, scoreValue]) => {
                    const score = scoreValue as number;
                    if (score < minScore) {
                      minScore = score;
                      winners = [settings.players.find(p => p.id === id)?.name || ''];
                    } else if (score === minScore) {
                      winners.push(settings.players.find(p => p.id === id)?.name || '');
                    }
                  });
                  if (winners.length === 1) {
                    winnerSummary = `${winners[0]} won (${minScore})`;
                  } else {
                    winnerSummary = `Tied (${minScore})`;
                  }
                }
              } else if (settings.gameFormat === 'Skins') {
                const skinsWon: Record<string, number> = {};
                standings.skins.forEach(skin => {
                  skinsWon[skin.winner] = (skinsWon[skin.winner] || 0) + skin.carryOver + 1;
                });
                let maxSkins = -1;
                let winners: string[] = [];
                Object.entries(skinsWon).forEach(([winner, skinsValue]) => {
                  const skins = skinsValue as number;
                  if (skins > maxSkins) {
                    maxSkins = skins;
                    winners = [winner];
                  } else if (skins === maxSkins) {
                    winners.push(winner);
                  }
                });
                if (winners.length === 1) {
                  winnerSummary = `${winners[0]} won (${maxSkins} skins)`;
                } else if (winners.length > 1) {
                  winnerSummary = `Tied (${maxSkins} skins)`;
                } else {
                  winnerSummary = 'No skins won';
                }
              }

              onSaveScore?.({
                id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                date: now.toLocaleDateString(),
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                settings: { ...settings, handicapAdjusted },
                scores,
                courseName: course.name,
                winnerSummary
              });
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium transition-colors"
          >
            <Trophy className="w-5 h-5" />
            Save Scores
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-950 text-red-400 hover:bg-red-900 rounded-xl font-medium transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Clear Data
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        message="Are you sure you want to clear all data and start over?"
        onConfirm={() => {
          setShowConfirm(false);
          onClearData?.();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
