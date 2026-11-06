import React, { useState, useEffect } from 'react';
import { NeoWsResponse, NeoObject, fetchNearEarthObjects } from '../services/nasaApi';
import { AlertTriangle, ShieldCheck, ArrowUpRight, RefreshCw, Radar, Filter, ExternalLink } from 'lucide-react';

export const NearEarthObjectsFeed: React.FC = () => {
  const [data, setData] = useState<NeoWsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hazardousOnly, setHazardousOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'velocity' | 'diameter'>('distance');
  const [selectedNeo, setSelectedNeo] = useState<NeoObject | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNearEarthObjects();
      if (res) {
        setData(res);
      } else {
        setError('Unable to load NeoWs stream at this moment');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading NEO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const objects = data?.objects || [];

  const filtered = objects.filter((item) => {
    if (hazardousOnly) return item.isHazardous;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'distance') return a.missDistanceLunar - b.missDistanceLunar;
    if (sortBy === 'velocity') return b.velocityKmS - a.velocityKmS;
    if (sortBy === 'diameter') {
      const diaA = (a.estimatedDiameterMeters.min + a.estimatedDiameterMeters.max) / 2;
      const diaB = (b.estimatedDiameterMeters.min + b.estimatedDiameterMeters.max) / 2;
      return diaB - diaA;
    }
    return 0;
  });

  return (
    <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>NASA NeoWs Feed</span>
            <span aria-hidden="true">·</span>
            <span>Near-Earth Object Tracking</span>
            <span aria-hidden="true">·</span>
            <span>Date: {data?.date || 'Today (UTC)'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Radar className="w-5 h-5 text-cyan-400" />
            Near-Earth Asteroids & Close Approaches
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Hazardous filter button */}
          <button
            onClick={() => setHazardousOnly(!hazardousOnly)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              hazardousOnly
                ? 'bg-amber-950 border-amber-800 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Hazardous Only</span>
          </button>

          {/* Sort selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded text-xs font-mono p-0.5">
            <button
              onClick={() => setSortBy('distance')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                sortBy === 'distance' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
              }`}
              title="Closest Miss Distance"
            >
              Closest
            </button>
            <button
              onClick={() => setSortBy('velocity')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                sortBy === 'velocity' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
              }`}
              title="Highest Velocity"
            >
              Fastest
            </button>
            <button
              onClick={() => setSortBy('diameter')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                sortBy === 'diameter' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
              }`}
              title="Largest Estimated Size"
            >
              Largest
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded transition-colors disabled:opacity-50"
            title="Refresh NEO Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="p-4 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Total Asteroids Passing Today
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-0.5">
            {objects.length}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Real-time NASA telemetry</div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Potentially Hazardous (PHA)
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums mt-0.5">
            {objects.filter((o) => o.isHazardous).length}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Diameter &gt;140m &amp; &lt;19.5 LD</div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Closest Flyby Distance
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums mt-0.5">
            {objects.length > 0
              ? `${Math.min(...objects.map((o) => o.missDistanceLunar)).toFixed(1)} LD`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {objects.length > 0
              ? `${(Math.min(...objects.map((o) => o.missDistanceKm)) / 1e6).toFixed(2)}M km`
              : '—'}
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Maximum Flyby Speed
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
            {objects.length > 0
              ? `${Math.max(...objects.map((o) => o.velocityKmS)).toFixed(1)} km/s`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {objects.length > 0
              ? `${Math.round(Math.max(...objects.map((o) => o.velocityKmH))).toLocaleString()} km/h`
              : '—'}
          </div>
        </div>
      </div>

      {/* Main Content: List & Details */}
      <div className="p-4">
        {loading && (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Querying NASA Near-Earth Object Web Service...
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center text-rose-400 font-mono text-xs bg-rose-950/20 border border-rose-900 rounded p-4">
            {error}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No near-Earth objects match current filter criteria.
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="space-y-2.5">
            {sorted.map((neo) => {
              const avgDiameterM = Math.round(
                (neo.estimatedDiameterMeters.min + neo.estimatedDiameterMeters.max) / 2
              );
              const isSelected = selectedNeo?.id === neo.id;

              return (
                <div
                  key={neo.id}
                  onClick={() => setSelectedNeo(isSelected ? null : neo)}
                  className={`p-3.5 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        {neo.name}
                      </span>
                      {neo.isHazardous ? (
                        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Potentially Hazardous Asteroid
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                          Nominal Trajectory
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-slate-500 text-[11px]">Miss Distance: </span>
                        <span className="font-semibold text-cyan-300 tabular-nums">
                          {neo.missDistanceLunar.toFixed(1)} LD
                        </span>
                        <span className="text-slate-500 text-[11px] ml-1">
                          ({(neo.missDistanceKm / 1e6).toFixed(2)}M km)
                        </span>
                      </div>
                      <a
                        href={neo.nasaJplUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
                        title="View on NASA JPL SBDB Lookup"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500">Flyby Time: </span>
                      <span className="text-slate-300">{neo.closeApproachDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Velocity: </span>
                      <span className="text-slate-200 tabular-nums">
                        {neo.velocityKmS.toFixed(2)} km/s ({Math.round(neo.velocityKmH).toLocaleString()} km/h)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Est. Diameter: </span>
                      <span className="text-slate-200 tabular-nums">
                        {Math.round(neo.estimatedDiameterMeters.min)}m – {Math.round(neo.estimatedDiameterMeters.max)}m
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Magnitude H: </span>
                      <span className="text-slate-200 tabular-nums">{neo.absoluteMagnitude}</span>
                    </div>
                  </div>

                  {/* Expanded Detail drawer when selected */}
                  {isSelected && (
                    <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono space-y-2">
                      <div className="text-cyan-400 font-semibold">
                        Orbital Encounter Telemetry Details
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500">Primary Orbiting Center: </span>
                          <span>{neo.orbitingBody}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Distance in AU: </span>
                          <span className="tabular-nums">{neo.missDistanceAu.toFixed(6)} AU</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Average Span: </span>
                          <span className="tabular-nums">{avgDiameterM} meters</span>
                        </div>
                      </div>
                      <div className="text-slate-400 pt-1 text-[11px]">
                        NASA Reference ID: {neo.id} · Monitored by NASA Center for Near Earth Object Studies (CNEOS).
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
