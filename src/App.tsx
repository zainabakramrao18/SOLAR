/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CelestialBody, CELESTIAL_BODIES } from './data/celestialBodies';
import { OrreryCanvas } from './components/OrreryCanvas';
import { LiveTelemetryPanel } from './components/LiveTelemetryPanel';
import { NearEarthObjectsFeed } from './components/NearEarthObjectsFeed';
import { CelestialComparison } from './components/CelestialComparison';
import { HorizonsTerminalConsole } from './components/HorizonsTerminalConsole';
import { NasaApodSpotlight } from './components/NasaApodSpotlight';
import {
  HorizonsVectorData,
  fetchBatchEphemerides,
} from './services/nasaApi';
import {
  Orbit,
  Sparkles,
  Radio,
  Scale,
  Terminal,
  Grid,
  ChevronRight,
  Compass,
  ArrowUpRight,
  Globe2,
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'orrery' | 'catalogue' | 'neo' | 'compare' | 'terminal'
  >('orrery');
  const [selectedBody, setSelectedBody] = useState<CelestialBody>(
    CELESTIAL_BODIES.find((b) => b.id === 'earth') || CELESTIAL_BODIES[3]
  );
  const [catalogueFilter, setCatalogueFilter] = useState<string>('all');
  const [batchEphemerides, setBatchEphemerides] = useState<
    Record<string, HorizonsVectorData>
  >({});
  const [currentTimeUtc, setCurrentTimeUtc] = useState<string>('');
  const [showApodModal, setShowApodModal] = useState<boolean>(false);

  // Live UTC Clock ticking
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUtc(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial batch ephemerides from NASA JPL proxy
  useEffect(() => {
    async function loadEphemeris() {
      const data = await fetchBatchEphemerides();
      if (data && Object.keys(data).length > 0) {
        setBatchEphemerides(data);
      }
    }
    loadEphemeris();
  }, []);

  // Filter catalogue bodies
  const filteredBodies = CELESTIAL_BODIES.filter((b) => {
    if (catalogueFilter === 'all') return true;
    if (catalogueFilter === 'planets')
      return b.category === 'terrestrial' || b.category === 'gas_giant' || b.category === 'ice_giant';
    if (catalogueFilter === 'terrestrial') return b.category === 'terrestrial';
    if (catalogueFilter === 'giants') return b.category === 'gas_giant' || b.category === 'ice_giant';
    if (catalogueFilter === 'dwarf') return b.category === 'dwarf_planet';
    if (catalogueFilter === 'moons_star') return b.category === 'moon' || b.category === 'star';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. TOP BAR CONTRACT: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-50 bg-[#07090E]/95 border-b border-slate-800 backdrop-blur-md px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark in display face */}
        <a
          href="#orrery"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('orrery');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Orbit className="w-5 h-5 text-cyan-400" />
          <span>Orrery Live</span>
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('orrery')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orrery' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Heliocentric Orrery
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'catalogue' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Celestial Bodies
          </button>
          <button
            onClick={() => setActiveTab('neo')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'neo' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Near-Earth Asteroids
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'compare' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Comparison Lab
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'terminal' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            JPL Terminal
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowApodModal(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>NASA Daily APOD</span>
          </button>
        </div>
      </header>

      {/* 2. Top Telemetry Ribbon (NASA Science Style) */}
      <div className="bg-[#0B0E17] border-b border-slate-800/80 px-6 py-2 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-medium">NASA JPL EPHEMERIS DE441</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>COORDINATES: ECLIPTIC J2000 HELIOCENTRIC</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>BARYCENTER: SUN CENTER (500@10)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-300 tabular-nums">{currentTimeUtc || 'SYNCING UTC...'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>TRACKED BODIES:</span>
            <span className="font-bold text-slate-200 tabular-nums">12 MAJOR + LIVE NEOs</span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden flex items-center overflow-x-auto gap-1 p-2 bg-[#0B0E17] border-b border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('orrery')}
          className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'orrery' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
          }`}
        >
          Orrery
        </button>
        <button
          onClick={() => setActiveTab('catalogue')}
          className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'catalogue' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
          }`}
        >
          Bodies
        </button>
        <button
          onClick={() => setActiveTab('neo')}
          className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'neo' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
          }`}
        >
          Asteroids
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'compare' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
          }`}
        >
          Compare
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'terminal' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400'
          }`}
        >
          Terminal
        </button>
      </div>

      {/* 3. Main Stage Content */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* TAB 1: Heliocentric Orrery Console */}
        {activeTab === 'orrery' && (
          <div className="space-y-6">
            {/* Quick planet quick-selector toolbar */}
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg flex items-center justify-between gap-3 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 shrink-0">
                <span>Quick Focus:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {CELESTIAL_BODIES.map((body) => {
                  const isSelected = selectedBody.id === body.id;
                  return (
                    <button
                      key={body.id}
                      onClick={() => setSelectedBody(body)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-cyan-950 border-cyan-700 text-cyan-300 font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: body.color }}
                      />
                      {body.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asymmetric Split Console: Canvas Viewport (Left/Top) & Live Telemetry Inspector (Right/Bottom) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Orrery Canvas Stage (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <OrreryCanvas
                  selectedBody={selectedBody}
                  onSelectBody={(b) => setSelectedBody(b)}
                  liveEphemerides={batchEphemerides}
                />
                <div className="p-3 bg-slate-900/30 border border-slate-800/80 rounded text-xs text-slate-400 font-mono flex flex-wrap items-center justify-between gap-2">
                  <span>Interactive Controls: Drag to pan · Scroll wheel to zoom · Click planet to focus</span>
                  <span className="text-slate-500">Epoch: Real-time NASA JPL DE441 Ephemeris</span>
                </div>
              </div>

              {/* Live Telemetry Panel (5 cols) */}
              <div className="lg:col-span-5">
                <LiveTelemetryPanel body={selectedBody} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Planetary & Celestial Catalogue */}
        {activeTab === 'catalogue' && (
          <div className="space-y-6">
            {/* Header and Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-lg">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Solar System Heavenly Bodies
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  12 catalogued major celestial bodies, planetary systems, and dwarf worlds
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono">
                <button
                  onClick={() => setCatalogueFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    catalogueFilter === 'all'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({CELESTIAL_BODIES.length})
                </button>
                <button
                  onClick={() => setCatalogueFilter('terrestrial')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    catalogueFilter === 'terrestrial'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Terrestrial Planets
                </button>
                <button
                  onClick={() => setCatalogueFilter('giants')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    catalogueFilter === 'giants'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gas &amp; Ice Giants
                </button>
                <button
                  onClick={() => setCatalogueFilter('dwarf')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    catalogueFilter === 'dwarf'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dwarf Planets
                </button>
                <button
                  onClick={() => setCatalogueFilter('moons_star')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    catalogueFilter === 'moons_star'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Star &amp; Moons
                </button>
              </div>
            </div>

            {/* Grid of Celestial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBodies.map((body) => (
                <div
                  key={body.id}
                  className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col hover:border-slate-700 transition-all group"
                >
                  {/* Card Header & Visual Banner */}
                  <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: body.color }}
                        />
                        <span>{body.category.replace('_', ' ')}</span>
                        <span aria-hidden="true">·</span>
                        <span>JPL #{body.jplId}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-100 mt-1">{body.name}</h3>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="text-cyan-300 font-bold tabular-nums">
                        {body.semiMajorAxisAu > 0 ? `${body.semiMajorAxisAu.toFixed(2)} AU` : '0 AU'}
                      </div>
                      <div className="text-slate-500 text-[11px] tabular-nums">
                        {body.orbitalSpeedKms} km/s
                      </div>
                    </div>
                  </div>

                  {/* Summary & Tagline */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <p className="text-xs text-cyan-400 font-mono font-medium mb-1">
                        {body.tagline}
                      </p>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {body.summary}
                      </p>
                    </div>

                    {/* Key Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2.5 bg-slate-950/60 border border-slate-800/80 rounded">
                      <div>
                        <div className="text-slate-500 text-[10px]">Radius</div>
                        <div className="text-slate-200 font-semibold tabular-nums">
                          {body.radiusKm.toLocaleString()} km
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Gravity</div>
                        <div className="text-slate-200 font-semibold tabular-nums">
                          {body.gravityMs2} m/s²
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Moons</div>
                        <div className="text-slate-200 font-semibold tabular-nums">
                          {body.moonsCount}
                        </div>
                      </div>
                    </div>

                    {/* Actions: View in Orrery */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                      <button
                        onClick={() => {
                          setSelectedBody(body);
                          setActiveTab('orrery');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        Inspect in Live Orrery
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-slate-500 text-[11px]">
                        {body.nasaMissions[0] || 'NASA DE441'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Real-Time Near-Earth Objects (NeoWs Feed) */}
        {activeTab === 'neo' && <NearEarthObjectsFeed />}

        {/* TAB 4: Side-by-Side Comparison Lab */}
        {activeTab === 'compare' && <CelestialComparison />}

        {/* TAB 5: NASA JPL Horizons Raw Query Terminal */}
        {activeTab === 'terminal' && <HorizonsTerminalConsole />}

        {/* APOD Feature Spotlight section at bottom for discovery */}
        <div className="mt-8">
          <NasaApodSpotlight />
        </div>
      </main>

      {/* APOD Modal (when clicked from primary header action) */}
      {showApodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                NASA Astronomy Picture of the Day
              </h3>
              <button
                onClick={() => setShowApodModal(false)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <NasaApodSpotlight />
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="mt-12 border-t border-slate-800 bg-[#07090E] px-6 py-8 text-xs font-mono text-slate-500">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-semibold">Orrery Live</span>
            <span>·</span>
            <span>NASA Jet Propulsion Laboratory (JPL) SSD Horizons</span>
            <span>·</span>
            <span>Center for Near Earth Object Studies (CNEOS)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://ssd.jpl.nasa.gov/horizons/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              JPL Horizons API <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://cneos.jpl.nasa.gov/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              CNEOS NeoWs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
