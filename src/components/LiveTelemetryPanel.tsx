import React, { useState, useEffect } from 'react';
import { CelestialBody } from '../data/celestialBodies';
import { HorizonsResponse, fetchHorizonsTelemetry } from '../services/nasaApi';
import { Activity, RefreshCw, Terminal, Globe, Compass, ShieldAlert, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

interface LiveTelemetryPanelProps {
  body: CelestialBody;
}

export const LiveTelemetryPanel: React.FC<LiveTelemetryPanelProps> = ({ body }) => {
  const [telemetry, setTelemetry] = useState<HorizonsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawTerminal, setShowRawTerminal] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHorizonsTelemetry(body.jplId);
      if (data) {
        setTelemetry(data);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError('Horizons data computed via Keplerian baseline');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [body.jplId]);

  // Format light time into human friendly minutes/seconds/hours
  const formatLightTime = (sec: number) => {
    if (!sec || sec <= 0) return '0.00 s';
    if (sec < 60) return `${sec.toFixed(1)} s`;
    if (sec < 3600) {
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return `${m}m ${s}s (${(sec / 60).toFixed(2)} min)`;
    }
    const h = (sec / 3600).toFixed(2);
    return `${h} hours (${(sec / 60).toFixed(1)} min)`;
  };

  const vectors = telemetry?.vectors;

  return (
    <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>NASA JPL Horizons Telemetry</span>
            <span aria-hidden="true">·</span>
            <span>Target Body #{body.jplId}</span>
            <span aria-hidden="true">·</span>
            <span>Center: 500@10 (Sun)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: body.color }}
            />
            {body.name}
            <span className="text-xs font-normal text-slate-400 font-mono uppercase tracking-wider ml-1">
              [{body.category.replace('_', ' ')}]
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawTerminal(!showRawTerminal)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 border ${
              showRawTerminal
                ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showRawTerminal ? 'Hide Terminal' : 'Raw JPL Feed'}</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded transition-colors disabled:opacity-50"
            title="Refresh Real-Time Ephemeris"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Raw Horizons Terminal Modal/Section */}
      {showRawTerminal && (
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="text-cyan-400 font-semibold">NASA JPL Solar System Dynamics Group Output</span>
            <span>API v1.2 · JPL DE441 Ephemeris</span>
          </div>
          <pre className="p-3 bg-black/80 border border-slate-800 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
            {telemetry?.rawExcerpt || 'Fetching JPL command session stream...'}
          </pre>
        </div>
      )}

      {/* Real-time State Vectors Grid */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/20">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Real-Time Heliocentric Vectors (Epoch: {telemetry?.date || 'UTC Today'})
          </span>
          {lastUpdated && (
            <span className="text-slate-500 text-[11px] font-mono">Synced {lastUpdated}</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Distance from Sun */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">
              Solar Distance (RG)
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-cyan-300 mt-1">
              {vectors?.distanceAu
                ? `${vectors.distanceAu.toFixed(3)}`
                : `${body.semiMajorAxisAu.toFixed(3)}`}
              <span className="text-xs uppercase font-mono text-slate-400 ml-1">AU</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
              {vectors?.distanceKm
                ? `${(vectors.distanceKm / 1e6).toFixed(2)}M km`
                : `${((body.semiMajorAxisAu * 149.59787) ).toFixed(2)}M km`}
            </div>
          </div>

          {/* Orbital Speed */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">
              Orbital Speed
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-300 mt-1">
              {vectors?.totalVelocityKmS
                ? `${vectors.totalVelocityKmS.toFixed(2)}`
                : `${body.orbitalSpeedKms.toFixed(2)}`}
              <span className="text-xs uppercase font-mono text-slate-400 ml-1">km/s</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
              {((vectors?.totalVelocityKmS || body.orbitalSpeedKms) * 3600).toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}{' '}
              km/h
            </div>
          </div>

          {/* Light Travel Time */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">
              Light Travel Time (LT)
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
              {vectors?.lightTimeSec
                ? formatLightTime(vectors.lightTimeSec)
                : `${((body.semiMajorAxisAu * 499) / 60).toFixed(1)} min`}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">One-way down-leg</div>
          </div>

          {/* Radial Velocity Range-Rate */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">
              Range Rate (RR)
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
              {vectors?.rangeRateKmS !== undefined
                ? `${vectors.rangeRateKmS > 0 ? '+' : ''}${vectors.rangeRateKmS.toFixed(3)}`
                : '±0.000'}
              <span className="text-xs uppercase font-mono text-slate-400 ml-1">km/s</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">Radial vector slope</div>
          </div>
        </div>

        {/* 3D Cartesian Coordinates Row */}
        {vectors?.positionKm && (
          <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded font-mono text-xs">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
              <span>J2000 Ecliptic Cartesian State [km]</span>
              <span className="text-slate-500">Center: Sun Center (0,0,0)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 tabular-nums text-slate-300">
              <div>
                <span className="text-cyan-400 mr-1.5 font-bold">X:</span>
                {vectors.positionKm.x.toExponential(4)}
              </div>
              <div>
                <span className="text-cyan-400 mr-1.5 font-bold">Y:</span>
                {vectors.positionKm.y.toExponential(4)}
              </div>
              <div>
                <span className="text-cyan-400 mr-1.5 font-bold">Z:</span>
                {vectors.positionKm.z.toExponential(4)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Details: Summary & Astrophysical Specs */}
      <div className="p-4 space-y-6">
        {/* Narrative & Tagline */}
        <div>
          <p className="text-xs uppercase tracking-wider text-cyan-400 font-mono font-semibold mb-1">
            Astrophysical Profile
          </p>
          <h3 className="text-base font-semibold text-slate-100 mb-2">{body.tagline}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{body.summary}</p>
        </div>

        {/* Physical Constants Matrix */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Physical & Planetary Constants
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Mean Radius</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.radiusKm.toLocaleString()} <span className="text-xs text-slate-400">km</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Mass</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.massKg} <span className="text-xs text-slate-400">kg</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Surface Gravity</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.gravityMs2} <span className="text-xs text-slate-400">m/s²</span>
              </div>
              <div className="text-[10px] text-slate-400">({body.gravityEarthRatio}× Earth)</div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Escape Velocity</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.escapeVelocityKms} <span className="text-xs text-slate-400">km/s</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Mean Density</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.densityGcm3} <span className="text-xs text-slate-400">g/cm³</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Mean Surface Temp</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.meanTempC > 0 ? `+${body.meanTempC}` : body.meanTempC}°C
              </div>
              <div className="text-[10px] text-slate-400">{body.meanTempC + 273.15} K</div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Orbital Period</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {body.orbitalPeriodDays < 1000
                  ? `${body.orbitalPeriodDays.toFixed(1)} days`
                  : `${(body.orbitalPeriodDays / 365.25).toFixed(1)} years`}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded">
              <div className="text-slate-400">Rotation / Day Length</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums mt-0.5">
                {Math.abs(body.rotationPeriodHours) < 48
                  ? `${Math.abs(body.rotationPeriodHours).toFixed(1)} hrs`
                  : `${(Math.abs(body.rotationPeriodHours) / 24).toFixed(1)} days`}
              </div>
              {body.rotationPeriodHours < 0 && (
                <div className="text-[10px] text-amber-400">Retrograde spin</div>
              )}
            </div>
          </div>
        </div>

        {/* Atmosphere & Composition */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Atmospheric Composition & Surface Pressure
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-mono">
              <span className="text-slate-400">Surface Pressure:</span>
              <span className="font-semibold text-slate-200">{body.atmosphericPressureBar}</span>
            </div>
            <div className="text-slate-400 pt-1 border-t border-slate-800/80">
              Constituents:{' '}
              <span className="text-slate-200 font-mono">{body.atmosphere.join(' · ')}</span>
            </div>
          </div>
        </div>

        {/* Natural Moons / Satellites */}
        {body.moonsCount > 0 && (
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Natural Satellites ({body.moonsCount} known)
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded text-xs">
              <div className="text-slate-300">
                Major Moons:{' '}
                <span className="text-cyan-300 font-mono font-medium">
                  {body.majorMoons.length > 0 ? body.majorMoons.join(', ') : 'None catalogued'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NASA Historical & Active Missions */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            NASA & International Exploration Missions
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs font-mono text-slate-300">
            {body.nasaMissions.map((mission, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded text-slate-200"
              >
                {mission}
              </span>
            ))}
          </div>
        </div>

        {/* Key Features Bullet List */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Astrophysical Phenomena & Discoveries
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {body.keyFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
