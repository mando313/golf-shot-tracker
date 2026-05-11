import React, { useState, useCallback } from 'react';
import { SavedGame, Hole } from '../types';
import { COURSES } from '../data/courses';
import { ArrowLeft, Calendar, Clock, MapPin, Trophy, Trash2, Eye, Share2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

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
    let h = player.handicap - (game.settings.handicapReduction ?? 4);
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

      // Layout constants
      const scale = 2;
      const colW = 36;
      const nameW = 82;
      const extraCols = 3; // OUT, IN, TOT
      const dataCols = 18 + extraCols;
      const padX = 16;
      const W = nameW + dataCols * colW + padX * 2;
      const rowH = 28;
      const headerH = 72;
      const footerH = 36;
      const numDataRows = 2 + players.length; // hole nums + par + players
      const H = headerH + numDataRows * rowH + footerH;

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
      // roundRect fallback for older browsers
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
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('\u26f3  ' + game.courseName, padX, 26);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(game.date + '  \u2022  ' + game.time + '  \u2022  ' + game.settings.gameFormat + '  \u2022  ' + game.settings.selectedTee + ' Tees', padX, 44);
      if (hcp) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.fillText('HCP ADJUSTED', W - padX - 72, 44);
      }
      if (game.winnerSummary) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText('\uD83C\uDFC6 ' + game.winnerSummary, padX, 62);
      }

      const tableY = headerH;
      const tableX = padX;

      const drawCell = (x: number, y: number, w: number, h: number, text: string, opts: {
        bg?: string, color?: string, bold?: boolean, fontSize?: number, align?: CanvasTextAlign
      } = {}) => {
        if (opts.bg) {
          ctx.fillStyle = opts.bg;
          ctx.fillRect(x, y, w, h);
        }
        ctx.fillStyle = opts.color || '#e5e7eb';
        ctx.font = (opts.bold ? 'bold' : '500') + ' ' + (opts.fontSize || 10) + 'px system-ui, -apple-system, sans-serif';
        ctx.textAlign = opts.align || 'center';
        const tx = opts.align === 'left' ? x + 4 : x + w / 2;
        ctx.fillText(text, tx, y + h / 2 + 4);
        ctx.textAlign = 'left';
      };

      // Row 1: Hole numbers
      const row0Y = tableY;
      drawCell(tableX, row0Y, nameW, rowH, '', { bg: '#0f362b' });
      for (let i = 0; i < 9; i++) {
        drawCell(tableX + nameW + i * colW, row0Y, colW, rowH, String(i + 1), { bg: '#0f362b', color: '#34d399', bold: true });
      }
      drawCell(tableX + nameW + 9 * colW, row0Y, colW, rowH, 'OUT', { bg: '#134e3a', color: '#ffffff', bold: true, fontSize: 9 });
      for (let i = 0; i < 9; i++) {
        drawCell(tableX + nameW + (10 + i) * colW, row0Y, colW, rowH, String(i + 10), { bg: '#0f362b', color: '#fbbf24', bold: true });
      }
      drawCell(tableX + nameW + 19 * colW, row0Y, colW, rowH, 'IN', { bg: '#134e3a', color: '#ffffff', bold: true, fontSize: 9 });
      drawCell(tableX + nameW + 20 * colW, row0Y, colW, rowH, 'TOT', { bg: '#134e3a', color: '#ffffff', bold: true, fontSize: 9 });

      // Row 2: Par
      const row1Y = tableY + rowH;
      drawCell(tableX, row1Y, nameW, rowH, 'Par', { bg: '#0d2f24', color: '#9ca3af', bold: true, align: 'left' });
      const parFront = holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
      const parBack = holes.slice(9).reduce((s, h) => s + h.par, 0);
      for (let i = 0; i < 9; i++) {
        drawCell(tableX + nameW + i * colW, row1Y, colW, rowH, String(holes[i].par), { bg: '#0d2f24', color: '#9ca3af' });
      }
      drawCell(tableX + nameW + 9 * colW, row1Y, colW, rowH, String(parFront), { bg: '#103a2e', color: '#d1d5db', bold: true });
      for (let i = 0; i < 9; i++) {
        drawCell(tableX + nameW + (10 + i) * colW, row1Y, colW, rowH, String(holes[9 + i].par), { bg: '#0d2f24', color: '#9ca3af' });
      }
      drawCell(tableX + nameW + 19 * colW, row1Y, colW, rowH, String(parBack), { bg: '#103a2e', color: '#d1d5db', bold: true });
      drawCell(tableX + nameW + 20 * colW, row1Y, colW, rowH, String(parFront + parBack), { bg: '#103a2e', color: '#d1d5db', bold: true });

      // Player rows
      const playerColors = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];
      players.forEach((p, pi) => {
        const rowY = tableY + (2 + pi) * rowH;
        const bg = pi % 2 === 0 ? '#0a2a1f' : '#0d2f24';
        const pColor = playerColors[pi % playerColors.length];

        drawCell(tableX, rowY, nameW, rowH, p.name.length > 9 ? p.name.slice(0, 9) : p.name, { bg, color: pColor, bold: true, align: 'left', fontSize: 10 });

        let frontGross = 0, frontNet = 0, backGross = 0, backNet = 0;

        for (let i = 0; i < 18; i++) {
          const hole = holes[i];
          const gross = game.scores[hole.number]?.[p.id] || 0;
          const net = gross ? getNetScoreForShare(gross, p.id, hole, game) : 0;
          const display = gross;

          if (i < 9) { frontGross += gross; frontNet += net; }
          else { backGross += gross; backNet += net; }

          let color = '#6b7280';
          if (display > 0) {
            const diff = display - hole.par;
            if (diff <= -2) color = '#eab308';
            else if (diff === -1) color = '#ef4444';
            else if (diff === 0) color = '#34d399';
            else if (diff === 1) color = '#a78bfa';
            else color = '#f472b6';
          }

          const colIdx = i < 9 ? i : i + 1;
          drawCell(tableX + nameW + colIdx * colW, rowY, colW, rowH, display > 0 ? String(display) : '\u2013', { bg, color, bold: true });
        }

        // OUT — always show gross total
        drawCell(tableX + nameW + 9 * colW, rowY, colW, rowH, frontGross > 0 ? String(frontGross) : '\u2013', { bg: '#103a2e', color: '#e5e7eb', bold: true });
        // IN — always show gross total
        drawCell(tableX + nameW + 19 * colW, rowY, colW, rowH, backGross > 0 ? String(backGross) : '\u2013', { bg: '#103a2e', color: '#e5e7eb', bold: true });
        // TOT — always show gross total
        const totalGross = frontGross + backGross;
        drawCell(tableX + nameW + 20 * colW, rowY, colW, rowH, totalGross > 0 ? String(totalGross) : '\u2013', { bg: '#103a2e', color: '#ffffff', bold: true, fontSize: 12 });
      });

      // Footer
      ctx.fillStyle = '#4b5563';
      ctx.font = '500 9px system-ui, -apple-system, sans-serif';
      ctx.fillText('Golf Tracker Pro', padX, H - 14);

      // Table grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= numDataRows; r++) {
        const y = tableY + r * rowH;
        ctx.beginPath(); ctx.moveTo(tableX, y); ctx.lineTo(tableX + nameW + dataCols * colW, y); ctx.stroke();
      }

      // Share or download natively via Capacitor
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const fileName = game.courseName.replace(/\s+/g, '_') + '_' + game.date.replace(/\//g, '-') + '.png';

      try {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: game.courseName + ' Scores',
          text: 'Scores from ' + game.courseName + ' - ' + game.date,
          url: savedFile.uri,
          dialogTitle: 'Share Scorecard'
        });
      } catch (e) {
        console.error('Capacitor share failed, falling back to web share:', e);
        // Fallback for web/desktop if capacitor fails
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            try { await navigator.share({ files: [file], title: game.courseName + ' Scores', text: 'Scores from ' + game.courseName + ' - ' + game.date }); } catch (err) {}
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
      setSharingId(null);
    } catch (err) {
      console.error('Share failed:', err);
      setSharingId(null);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">Scores History</h1>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {savedGames.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-900 mb-2">No saved games yet</h2>
          <p className="text-slate-500">Complete a round and click "Save Scores" to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedGames.map((game) => (
            <div key={game.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-colors ${selectedIds.has(game.id) ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(game.id)}
                    onChange={() => toggleSelection(game.id)}
                    className="mt-1.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      {game.courseName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
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
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                    {game.settings.gameFormat}
                  </span>
                  <span className="text-sm text-slate-500 mt-1">
                    {game.settings.playMode} • {game.settings.numPlayers} Players
                  </span>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {game.winnerSummary ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {game.winnerSummary}
                      </span>
                    ) : (
                      'Players:'
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {game.settings.players.map(p => (
                      <span key={p.id} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                        {p.name} {game.settings.playMode === 'Teams' ? `(Team ${p.team})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
                  <button
                    onClick={() => handleShareScores(game)}
                    disabled={sharingId === game.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    {sharingId === game.id ? 'Generating...' : 'Share Scores'}
                  </button>
                  <button
                    onClick={() => onViewGame(game)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
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
