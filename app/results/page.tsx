'use client';

import { useEffect, useMemo, useState } from 'react';

// Set this to your Google Apps Script Web App URL (same as the voting page ENDPOINT)
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxVviwSj1tQyYX6-LmIHssvmxq2C6g3jmcOp1_cM_Fukd-d3Fgxrn8f3YUJnPnM791YFw/exec"; // e.g., https://script.google.com/macros/s/AKfycb.../exec

// Minimal topic map for labels
const TOPICS_RES = [
  { id: 'mental-health', title: 'AI & Mental Health' },
  { id: 'defenses', title: 'AI Defenses' },
  { id: 'personal-info', title: 'Personal Information & AI' },
  { id: 'politics', title: 'AI & Politics' },
  { id: 'education', title: 'AI in Education' },
  { id: 'creativity', title: 'AI & Creativity' },
] as const;

type VariantKey = 'neutral' | 'nudged';
type Vote = { variant: VariantKey; choice: string; ts: string; userAgent?: string };

function readLS(variant: VariantKey): Vote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`autonomy-demo-local-${variant}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function parseCSV(text: string): Vote[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const hdr = lines[0].split(',').map((h) => JSON.parse(h));
  const iVar = hdr.indexOf('variant');
  const iChoice = hdr.indexOf('choice');
  const iTs = hdr.indexOf('timestamp');
  const iUA = hdr.indexOf('userAgent');
  const out: Vote[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => { try { return JSON.parse(c); } catch { return c; } });
    const v = cols[iVar];
    if (v !== 'neutral' && v !== 'nudged') continue;
    out.push({ variant: v, choice: String(cols[iChoice] ?? ''), ts: String(cols[iTs] ?? ''), userAgent: String(cols[iUA] ?? '') });
  }
  return out;
}

function tally(votes: Vote[]) {
  const perVariant: Record<VariantKey, Record<string, number>> = { neutral: {}, nudged: {} };
  for (const v of votes) perVariant[v.variant][v.choice] = (perVariant[v.variant][v.choice] || 0) + 1;
  return perVariant;
}
function maxCount(tallies: Record<VariantKey, Record<string, number>>): number {
  let m = 0;
  (['neutral','nudged'] as VariantKey[]).forEach(variant => {
    for (const k in tallies[variant]) m = Math.max(m, tallies[variant][k]);
  });
  return m;
}
const topicTitle = (id: string) => TOPICS_RES.find(t => t.id === id)?.title ?? id;

export default function ResultsPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Load local votes
  useEffect(() => {
    setVotes([...readLS('neutral'), ...readLS('nudged')]);
  }, []);

  // Fetch from Google Sheet (if configured)
  useEffect(() => {
    if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes("SCRIPT_ID_GOES_HERE")) return;
    fetch(SHEET_ENDPOINT)
      .then(r => r.json())
      .then((serverVotes: Vote[]) => {
        setVotes(prev => {
          const all = [...serverVotes, ...prev];
          const seen = new Set<string>();
          return all.filter(v => {
            const key = `${v.variant}|${v.choice}|${v.ts}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      })
      .catch(() => {});
  }, []);

  function refreshFromServer() {
    if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes("SCRIPT_ID_GOES_HERE")) return;
    fetch(SHEET_ENDPOINT)
      .then(r => r.json())
      .then((serverVotes: Vote[]) => setVotes(serverVotes))
      .catch(() => {});
  }

  const tallies = useMemo(() => tally(votes), [votes]);
  const max = useMemo(() => Math.max(1, maxCount(tallies)), [tallies]);
  const totalNeutral = useMemo(() => votes.filter(v => v.variant === 'neutral').length, [votes]);
  const totalNudged = useMemo(() => votes.filter(v => v.variant === 'nudged').length, [votes]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (!files.length) return;
    Promise.all(files.map(f => f.text())).then(texts => {
      const parsed = texts.flatMap(parseCSV);
      setVotes(prev => [...prev, ...parsed]);
    });
  }
  function onFilePick(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files || []).filter(f => f.name.endsWith('.csv'));
    if (!files.length) return;
    Promise.all(files.map(f => f.text())).then(texts => {
      const parsed = texts.flatMap(parseCSV);
      setVotes(prev => [...prev, ...parsed]);
    });
  }
  function clearLocal() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('autonomy-demo-local-neutral');
    localStorage.removeItem('autonomy-demo-local-nudged');
    setVotes([]);
  }

  // Chart (inline SVG)
  const BAR_W = 20, GAP = 10, GROUP_GAP = 30, PADDING = 40, HEIGHT = 220;
  const SCALE = (count: number) => (HEIGHT - 20) * (count / max);
  const topicIds = TOPICS_RES.map(t => t.id);
  const width = PADDING*2 + topicIds.length * (BAR_W*2 + GAP + GROUP_GAP) - GROUP_GAP;
  const countOf = (variant: VariantKey, id: string) => tallies[variant][id] || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <header className="mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Class Vote Results</h1>
          <p className="text-sm text-gray-600 mt-1">Drop the downloaded CSVs here or rely on the votes saved in your browser. Use Refresh to pull the latest from the sheet.</p>
        </header>

        <div
          className={`rounded-xl border bg-white p-4 mb-4 ${dragActive ? 'ring-2 ring-indigo-400' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-gray-700">
              <strong>Totals:</strong> Neutral {totalNeutral} · Nudged {totalNudged}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm underline cursor-pointer">
                <input type="file" accept=".csv" multiple className="hidden" onChange={onFilePick} />
                Import CSV(s)
              </label>
              <button onClick={refreshFromServer} className="text-sm underline">Refresh</button>
              <button onClick={clearLocal} className="text-sm underline">Clear local votes</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
          <svg width={width} height={HEIGHT + 60}>
            <text x={PADDING} y={14} fontSize="12" fill="#374151">Counts (per topic)</text>
            {topicIds.map((id, i) => {
              const x0 = PADDING + i * (BAR_W*2 + GAP + GROUP_GAP);
              const n = countOf('neutral', id);
              const u = countOf('nudged', id);
              const hN = SCALE(n), hU = SCALE(u);
              return (
                <g key={id}>
                  <rect x={x0} y={HEIGHT - hN} width={BAR_W} height={hN} fill="#60a5fa" />
                  <rect x={x0 + BAR_W + GAP} y={HEIGHT - hU} width={BAR_W} height={hU} fill="#34d399" />
                  <text x={x0 + (BAR_W + GAP)/2} y={HEIGHT + 16} fontSize="11" textAnchor="start"
                        transform={`rotate(20, ${x0 + (BAR_W + GAP)/2}, ${HEIGHT + 16})`} fill="#374151">
                    {topicTitle(id)}
                  </text>
                  <text x={x0} y={HEIGHT + 34} fontSize="10" fill="#6b7280">N:{n} · U:{u}</text>
                </g>
              );
            })}
            <g>
              <rect x={PADDING} y={HEIGHT + 42} width={12} height={12} fill="#60a5fa" />
              <text x={PADDING + 18} y={HEIGHT + 52} fontSize="12" fill="#374151">Neutral</text>
              <rect x={PADDING + 90} y={HEIGHT + 42} width={12} height={12} fill="#34d399" />
              <text x={PADDING + 108} y={HEIGHT + 52} fontSize="12" fill="#374151">Nudged</text>
            </g>
          </svg>
        </div>

        <div className="mt-3 text-xs text-gray-500 text-center">
          Tip: open this page on the same machine you used to project the QR slide, unless you’re aggregating from the Sheet.
        </div>
      </div>
    </div>
  );
}
