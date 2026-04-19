import React, { useState, useCallback } from 'react';
import { SavedGame, Hole } from '../types';
import { COURSES } from '../data/courses';
import { ArrowLeft, Calendar, Clock, MapPin, Trophy, Trash2, Eye, Share2 } from 'lucide-react';

type HistoryProps = {
  savedGames: SavedGame[];
  onBack: () => void;
  onDelete: (ids: string[]) => void;
  onViewGame: (game: SavedGame) => void;
};

function getNetScoreForShare(gross: number, playerId: string, hole: Hole, game: SavedGame): number {
  if (!game.settings.handicapAdjusted || gross === 0) return gross;
  const player = game.settings.players.find(p => p.id === playerId)!;
  let strokesReceived = 0;
  if (game.settings.gameFormat === 'Skins' || game.settings.gameFormat === 'Match Play') {
    let h = player.handicap - 4;
    while (h > 0) {
      if (hole.handicap <= h) strokesReceived++;
      h -= 18;
    }
  } else if (game.settings.gameFormat === 'Stroke Play') {
    const minHandicap = Math.min(...game.settings.players.map(p => p.handicap));
    const courseHandicap = player.handicap - minHandicap;
    strokesReceived = Math.floor(courseHandicap / 18) + (hole.handicap <= courseHandicap % 18 ? 1 : 0);
  }
  return gross - strokesReceived;
}

export default function History({ savedGames, onBack, onDelete, onViewGame }: HistoryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharingId, setSharingId] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} saved score(s)?`)) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(newSet => {
        newSet.clear();
        return new Set(newSet);
      });
    }
  };

  const handleShareScores = useCallback(async (game: SavedGame) => {
    setSharingId(game.id);
    try {
      const course = COURSES.find(c => c.id === game.settings.courseId);
      if (!course) { setSharingId(null); return; }

      const players = game.settings.players;
      const holes = course.holes;
      const hcp = game.settings.handicapAdjusted;

      // Pre-compute per-player totals and whether any net differs from gross
      const playerStats = players.map(p => {
        let frontGross = 0, frontNet = 0, backGross = 0, backNet = 0;
        const cells: { gross: number; net: number }[] = [];
        for (let i = 0; i < 18; i++) {
          const hole = holes[i];
          const gross = game.scores[hole.number]?.[p.id] || 0;
          const net = gross ? getNetScoreForShare(gross, p.id, hole, game) : 0;
          cells.push({ gross, net });
          if (i < 9) { frontGross += gross; frontNet += net; }
          else { backGross += gross; backNet += net; }
        }
        return { player: p, cells, frontGross, frontNet, backGross, backNet };
      });
      const anyNetDiffers = hcp && playerStats.some(s =>
        s.frontGross !== s.frontNet || s.backGross !== s.backNet
      );
      const showNet = hcp && anyNetDiffers;

      // Layout constants
      const scale = 2;
      const colW = 38;
      const nameW = 104;
      const extraCols = 3; // OUT, IN, TOT
      const dataCols = 18 + extraCols;
      const padX = 16;
      const W = nameW + dataCols * colW + padX * 2;
      const headerRowH = 26;
      const playerRowH = showNet ? 40 : 28;
      const headerH = game.winnerSummary ? 82 : 62;
      const footerH = 30;
      const H = headerH + headerRowH * 2 + playerRowH * players.length + footerH;

      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(1, '#022c22');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(0, 0, W, H, 12);
      } else {
        const r = 12;
        ctx.moveTo(r, 0);
        ctx.lineTo(W - r, 0);
        ctx.arcTo(W, 0, W, r, r);
        ctx.lineTo(W, H - r);
        ctx.arcTo(W, H, W - r, H, r);
        ctx.lineTo(r, H);
        ctx.arcTo(0, H, 0, H - r, r);
        ctx.lineTo(0, r);
        ctx.arcTo(0, 0, r, 0, r);
        ctx.closePath();
      }
      ctx.fill();

      // Header
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('\u26f3  ' + game.courseName, padX, 26);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(game.date + '  \u2022  ' + game.time + '  \u2022  ' + game.settings.gameFormat + '  \u2022  ' + game.settings.selectedTee + ' Tees', padX, 44);
      if (showNet) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('GROSS / NET', W - padX, 44);
        ctx.textAlign = 'left';
      } else if (hcp) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('HCP ADJUSTED', W - padX, 44);
        ctx.textAlign = 'left';
      }
      if (game.winnerSummary) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText('\uD83C\uDFC6 ' + game.winnerSummary, padX, 64);
      }

      const tableY = headerH;
      const tableX = padX;

      const drawText = (text: string, x: number, y: number, opts: {
        color?: string, bold?: boolean, fontSize?: number, align?: CanvasTextAlign
      } = {}) => {
        ctx.fillStyle = opts.color || '#e5e7eb';
        ctx.font = (opts.bold ? 'bold' : '500') + ' ' + (opts.fontSize || 10) + 'px system-ui, -apple-system, sans-serif';
        ctx.textAlign = opts.align || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
      };

      const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
      };

      // Row 1: Hole numbers
      const row0Y = tableY;
      fillRect(tableX, row0Y, nameW + dataCols * colW, headerRowH, '#0f362b');
      for (let i = 0; i < 9; i++) {
        drawText(String(i + 1), tableX + nameW + i * colW + colW / 2, row0Y + headerRowH / 2, { color: '#34d399', bold: true });
      }
      fillRect(tableX + nameW + 9 * colW, row0Y, colW, headerRowH, '#134e3a');
      drawText('OUT', tableX + nameW + 9 * colW + colW / 2, row0Y + headerRowH / 2, { color: '#ffffff', bold: true, fontSize: 9 });
      for (let i = 0; i < 9; i++) {
        drawText(String(i + 10), tableX + nameW + (10 + i) * colW + colW / 2, row0Y + headerRowH / 2, { color: '#fbbf24', bold: true });
      }
      fillRect(tableX + nameW + 19 * colW, row0Y, colW, headerRowH, '#134e3a');
      drawText('IN', tableX + nameW + 19 * colW + colW / 2, row0Y + headerRowH / 2, { color: '#ffffff', bold: true, fontSize: 9 });
      fillRect(tableX + nameW + 20 * colW, row0Y, colW, headerRowH, '#134e3a');
      drawText('TOT', tableX + nameW + 20 * colW + colW / 2, row0Y + headerRowH / 2, { color: '#ffffff', bold: true, fontSize: 9 });

      // Row 2: Par
      const row1Y = tableY + headerRowH;
      fillRect(tableX, row1Y, nameW, headerRowH, '#0d2f24');
      drawText('Par', tableX + 6, row1Y + headerRowH / 2, { color: '#9ca3af', bold: true, align: 'left' });
      const parFront = holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
      const parBack = holes.slice(9).reduce((s, h) => s + h.par, 0);
      for (let i = 0; i < 18; i++) {
        const colIdx = i < 9 ? i : i + 1;
        fillRect(tableX + nameW + colIdx * colW, row1Y, colW, headerRowH, '#0d2f24');
        drawText(String(holes[i].par), tableX + nameW + colIdx * colW + colW / 2, row1Y + headerRowH / 2, { color: '#9ca3af' });
      }
      fillRect(tableX + nameW + 9 * colW, row1Y, colW, headerRowH, '#103a2e');
      drawText(String(parFront), tableX + nameW + 9 * colW + colW / 2, row1Y + headerRowH / 2, { color: '#d1d5db', bold: true });
      fillRect(tableX + nameW + 19 * colW, row1Y, colW, headerRowH, '#103a2e');
      drawText(String(parBack), tableX + nameW + 19 * colW + colW / 2, row1Y + headerRowH / 2, { color: '#d1d5db', bold: true });
      fillRect(tableX + nameW + 20 * colW, row1Y, colW, headerRowH, '#103a2e');
      drawText(String(parFront + parBack), tableX + nameW + 20 * colW + colW / 2, row1Y + headerRowH / 2, { color: '#d1d5db', bold: true });

      // Player rows
      const playerColors = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];
      const scoreColor = (gross: number, par: number) => {
        const diff = gross - par;
        if (diff <= -2) return '#eab308';
        if (diff === -1) return '#ef4444';
        if (diff === 0) return '#34d399';
        if (diff === 1) return '#a78bfa';
        return '#f472b6';
      };

      playerStats.forEach((s, pi) => {
        const p = s.player;
        const rowY = tableY + headerRowH * 2 + pi * playerRowH;
        const bg = pi % 2 === 0 ? '#0a2a1f' : '#0d2f24';
        const totBg = '#103a2e';
        const pColor = playerColors[pi % playerColors.length];

        fillRect(tableX, rowY, nameW, playerRowH, bg);
        const nameText = p.name.length > 12 ? p.name.slice(0, 12) : p.name;
        if (hcp) {
          drawText(nameText, tableX + 6, rowY + playerRowH / 2 - 6, { color: pColor, bold: true, align: 'left', fontSize: 11 });
          drawText('HCP ' + p.handicap, tableX + 6, rowY + playerRowH / 2 + 8, { color: '#6b7280', bold: false, align: 'left', fontSize: 9 });
        } else {
          drawText(nameText, tableX + 6, rowY + playerRowH / 2, { color: pColor, bold: true, align: 'left', fontSize: 11 });
        }

        for (let i = 0; i < 18; i++) {
          const hole = holes[i];
          const { gross, net } = s.cells[i];
          const colIdx = i < 9 ? i : i + 1;
          const cx = tableX + nameW + colIdx * colW;
          fillRect(cx, rowY, colW, playerRowH, bg);

          if (gross > 0) {
            const gColor = scoreColor(gross, hole.par);
            if (showNet) {
              drawText(String(gross), cx + colW / 2, rowY + playerRowH / 2 - 8, { color: gColor, bold: true, fontSize: 12 });
              const netColor = net !== gross ? '#34d399' : '#6b7280';
              drawText(String(net), cx + colW / 2, rowY + playerRowH / 2 + 10, { color: netColor, bold: true, fontSize: 10 });
            } else {
              drawText(String(gross), cx + colW / 2, rowY + playerRowH / 2, { color: gColor, bold: true, fontSize: 12 });
            }
          } else {
            drawText('\u2013', cx + colW / 2, rowY + playerRowH / 2, { color: '#6b7280', bold: true, fontSize: 12 });
          }
        }

        const drawTotal = (colIdx: number, gross: number, net: number, bigger: boolean) => {
          const cx = tableX + nameW + colIdx * colW;
          fillRect(cx, rowY, colW, playerRowH, totBg);
          const grossSize = bigger ? 13 : 11;
          const netSize = bigger ? 11 : 10;
          if (showNet) {
            drawText(gross > 0 ? String(gross) : '\u2013', cx + colW / 2, rowY + playerRowH / 2 - 8, { color: '#ffffff', bold: true, fontSize: grossSize });
            drawText(gross > 0 ? String(net) : '\u2013', cx + colW / 2, rowY + playerRowH / 2 + 10, { color: '#34d399', bold: true, fontSize: netSize });
          } else {
            drawText(gross > 0 ? String(gross) : '\u2013', cx + colW / 2, rowY + playerRowH / 2, { color: '#ffffff', bold: true, fontSize: grossSize });
          }
        };

        drawTotal(9, s.frontGross, s.frontNet, false);
        drawTotal(19, s.backGross, s.backNet, false);
        drawTotal(20, s.frontGross + s.backGross, s.frontNet + s.backNet, true);
      });

      // Table grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.5;
      const tableBottom = tableY + headerRowH * 2 + players.length * playerRowH;
      const tableRight = tableX + nameW + dataCols * colW;
      ctx.beginPath();
      ctx.moveTo(tableX, tableY); ctx.lineTo(tableRight, tableY); // top
      ctx.moveTo(tableX, tableY + headerRowH); ctx.lineTo(tableRight, tableY + headerRowH);
      ctx.moveTo(tableX, tableY + headerRowH * 2); ctx.lineTo(tableRight, tableY + headerRowH * 2);
      for (let pi = 1; pi <= players.length; pi++) {
        const y = tableY + headerRowH * 2 + pi * playerRowH;
        ctx.moveTo(tableX, y); ctx.lineTo(tableRight, y);
      }
      // vertical separators
      ctx.moveTo(tableX + nameW, tableY); ctx.lineTo(tableX + nameW, tableBottom);
      ctx.moveTo(tableX + nameW + 9 * colW, tableY); ctx.lineTo(tableX + nameW + 9 * colW, tableBottom);
      ctx.moveTo(tableX + nameW + 10 * colW, tableY); ctx.lineTo(tableX + nameW + 10 * colW, tableBottom);
      ctx.moveTo(tableX + nameW + 19 * colW, tableY); ctx.lineTo(tableX + nameW + 19 * colW, tableBottom);
      ctx.moveTo(tableX + nameW + 20 * colW, tableY); ctx.lineTo(tableX + nameW + 20 * colW, tableBottom);
      ctx.stroke();

      // Footer
      drawText('Golf Tracker Pro', padX, H - footerH / 2, { color: '#4b5563', fontSize: 9, align: 'left' });
      if (showNet) {
        drawText('Top: gross  \u2022  Bottom: net (handicap adjusted)', W - padX, H - footerH / 2, { color: '#4b5563', fontSize: 9, align: 'right' });
      }

      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) { setSharingId(null); return; }
      const fileName = game.courseName.replace(/\s+/g, '_') + '_' + game.date.replace(/\//g, '-') + '.png';
      const file = new File([blob], fileName, { type: 'image/png' });

      let shared = false;
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            files: [file],
            title: game.courseName + ' Scores',
            text: 'Scores from ' + game.courseName + ' - ' + game.date
          });
          shared = true;
        } catch (e: any) {
          if (e?.name === 'AbortError') {
            shared = true;
          }
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setSharingId(null);
    } catch (err) {
      console.error('Share failed:', err);
      alert('Could not generate shareable image. Please try again.');
      setSharingId(null);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-10 pb-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-semibold text-slate-100">Scores History</h1>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2 bg-red-950 text-red-400 hover:bg-red-900 rounded-xl font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {savedGames.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl shadow-sm border border-slate-700 text-center">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-100 mb-2">No saved games yet</h2>
          <p className="text-slate-400">Complete a round and click "Save Scores" to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedGames.map((game) => (
            <div key={game.id} className={`bg-slate-900 p-6 rounded-2xl shadow-sm border transition-colors ${selectedIds.has(game.id) ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-700'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(game.id)}
                    onChange={() => toggleSelection(game.id)}
                    className="mt-1.5 w-4 h-4 text-emerald-600 rounded border-slate-600 focus:ring-emerald-500 bg-slate-800"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      {game.courseName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {game.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {game.time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium">
                    {game.settings.gameFormat}
                  </span>
                  <span className="text-sm text-slate-400 mt-1">
                    {game.settings.playMode} • {game.settings.numPlayers} Players
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-2">
                    {game.winnerSummary ? (
                      <span className="text-emerald-400 bg-emerald-950 px-2 py-1 rounded inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {game.winnerSummary}
                      </span>
                    ) : (
                      'Players:'
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {game.settings.players.map(p => (
                      <span key={p.id} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-400">
                        {p.name} {game.settings.playMode === 'Teams' ? `(Team ${p.team})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
                  <button
                    onClick={() => handleShareScores(game)}
                    disabled={sharingId === game.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800 rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    {sharingId === game.id ? 'Generating...' : 'Share Scores'}
                  </button>
                  <button
                    onClick={() => onViewGame(game)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    View Scorecard
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
