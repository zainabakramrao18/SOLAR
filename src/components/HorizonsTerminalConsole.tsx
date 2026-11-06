import React, { useState } from 'react';
import { HorizonsResponse, fetchHorizonsTelemetry } from '../services/nasaApi';
import { Terminal, Send, Copy, Check, Info, ShieldCheck } from 'lucide-react';

const COMMON_TARGETS = [
  { id: '10', name: 'Sun' },
  { id: '199', name: 'Mercury' },
  { id: '299', name: 'Venus' },
  { id: '399', name: 'Earth' },
  { id: '301', name: 'Moon' },
  { id: '499', name: 'Mars' },
  { id: '1', name: 'Ceres (Dwarf Planet)' },
  { id: '4', name: 'Vesta (Asteroid)' },
  { id: '599', name: 'Jupiter' },
  { id: '699', name: 'Saturn' },
  { id: '799', name: 'Uranus' },
  { id: '899', name: 'Neptune' },
  { id: '999', name: 'Pluto' },
  { id: '1P', name: '1P/Halley (Comet)' },
];

export const HorizonsTerminalConsole: React.FC = () => {
  const [targetId, setTargetId] = useState<string>('399');
  const [result, setResult] = useState<HorizonsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleQuery = async (idToQuery = targetId) => {
    if (!idToQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHorizonsTelemetry(idToQuery.trim());
      if (data) {
        setResult(data);
      } else {
        setError(`Unable to resolve Horizons query for command "${idToQuery}"`);
      }
    } catch (err: any) {
      setError(err?.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.rawExcerpt) {
      navigator.clipboard.writeText(result.rawExcerpt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>NASA Jet Propulsion Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Solar System Dynamics Group</span>
            <span aria-hidden="true">·</span>
            <span>Horizons System</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            JPL Horizons Ephemeris Terminal
          </h2>
        </div>

        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>DE441 Planetary Ephemerides Engine</span>
        </div>
      </div>

      {/* Query Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/20 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-mono text-slate-400">Target Quick Picks:</div>
          {COMMON_TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTargetId(t.id);
                handleQuery(t.id);
              }}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                targetId === t.id
                  ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Input & Submit */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="Enter NASA Horizons Target Command ID (e.g., 399, 499, 1P, 67P)..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => handleQuery()}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-semibold text-xs rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Transmitting...' : 'Query Horizons'}</span>
          </button>
        </div>
      </div>

      {/* Results View */}
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-900 rounded text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {result?.vectors && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
              <div className="text-[11px] font-mono text-slate-400">Distance (RG)</div>
              <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                {result.vectors.distanceAu.toFixed(4)} AU
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {(result.vectors.distanceKm / 1e6).toFixed(2)}M km
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
              <div className="text-[11px] font-mono text-slate-400">Orbital Speed</div>
              <div className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                {result.vectors.totalVelocityKmS.toFixed(2)} km/s
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {Math.round(result.vectors.totalVelocityKmS * 3600).toLocaleString()} km/h
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
              <div className="text-[11px] font-mono text-slate-400">Light Time (LT)</div>
              <div className="text-lg font-bold font-mono text-slate-100 tabular-nums">
                {(result.vectors.lightTimeSec / 60).toFixed(2)} min
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {result.vectors.lightTimeSec.toFixed(1)} seconds
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
              <div className="text-[11px] font-mono text-slate-400">Range Rate (RR)</div>
              <div className="text-lg font-bold font-mono text-slate-100 tabular-nums">
                {result.vectors.rangeRateKmS.toFixed(3)} km/s
              </div>
              <div className="text-[10px] font-mono text-slate-500">Center: Heliocentric</div>
            </div>
          </div>
        )}

        {/* Terminal Raw Console Output */}
        <div className="relative">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span>Official JPL Horizons Console Output:</span>
            {result?.rawExcerpt && (
              <button
                onClick={copyToClipboard}
                className="hover:text-cyan-400 flex items-center gap-1 transition-colors text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Output'}
              </button>
            )}
          </div>
          <pre className="p-3.5 bg-black border border-slate-800 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap select-text">
            {result?.rawExcerpt ||
              'Awaiting query. Select a target body above and click "Query Horizons" to receive the live ephemeris vector states.'}
          </pre>
        </div>
      </div>
    </div>
  );
};
