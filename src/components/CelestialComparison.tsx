import React, { useState } from 'react';
import { CelestialBody, CELESTIAL_BODIES } from '../data/celestialBodies';
import { Scale, ArrowRightLeft, X } from 'lucide-react';

export const CelestialComparison: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>(['earth', 'mars', 'venus']);

  const selectedBodies = selectedIds
    .map((id) => CELESTIAL_BODIES.find((b) => b.id === id))
    .filter((b): b is CelestialBody => b !== undefined);

  const toggleBody = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds([selectedIds[1], selectedIds[2], id]);
      }
    }
  };

  // Helper to calculate bar percentage against max in selected set
  const getPercent = (value: number, max: number) => {
    if (max <= 0) return 0;
    return Math.min(Math.max((value / max) * 100, 3), 100);
  };

  const maxRadius = Math.max(...selectedBodies.map((b) => b.radiusKm), 1);
  const maxGravity = Math.max(...selectedBodies.map((b) => b.gravityMs2), 1);
  const maxVelocity = Math.max(...selectedBodies.map((b) => b.orbitalSpeedKms), 1);
  const maxEscape = Math.max(...selectedBodies.map((b) => b.escapeVelocityKms), 1);
  const maxAu = Math.max(...selectedBodies.map((b) => b.semiMajorAxisAu), 1);

  return (
    <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Astrophysical Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Comparative Planetary Science</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Scale className="w-5 h-5 text-cyan-400" />
            Celestial Body Comparison Matrix
          </h2>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Select up to 3 bodies to compare side-by-side
        </div>
      </div>

      {/* Body Selector Strip */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/20">
        <div className="flex flex-wrap gap-1.5">
          {CELESTIAL_BODIES.map((body) => {
            const isSelected = selectedIds.includes(body.id);
            return (
              <button
                key={body.id}
                onClick={() => toggleBody(body.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-700 text-cyan-300 font-semibold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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

      {/* Side-by-side Cards & Normalized Comparative Metrics */}
      <div className="p-4 space-y-6">
        {/* Header Columns for selected bodies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedBodies.map((body) => (
            <div
              key={body.id}
              className="p-4 bg-slate-900/50 border border-slate-800 rounded relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: body.color }}
              />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{body.name}</h3>
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    {body.category.replace('_', ' ')}
                  </div>
                </div>
                {selectedBodies.length > 1 && (
                  <button
                    onClick={() => toggleBody(body.id)}
                    className="p-1 hover:text-rose-400 text-slate-500 rounded"
                    title="Remove from comparison"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">{body.tagline}</p>
            </div>
          ))}
        </div>

        {/* Metric 1: Mean Radius */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Mean Radius (km)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedBodies.map((body) => (
              <div key={body.id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{body.name}</span>
                  <span className="text-slate-100 font-bold tabular-nums">
                    {body.radiusKm.toLocaleString()} km
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getPercent(body.radiusKm, maxRadius)}%`,
                      backgroundColor: body.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2: Surface Gravity */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Surface Gravity (m/s² &amp; vs Earth)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedBodies.map((body) => (
              <div key={body.id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{body.name}</span>
                  <span className="text-slate-100 font-bold tabular-nums">
                    {body.gravityMs2} m/s² ({body.gravityEarthRatio}×)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getPercent(body.gravityMs2, maxGravity)}%`,
                      backgroundColor: body.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 3: Orbital Speed */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Orbital Velocity (km/s)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedBodies.map((body) => (
              <div key={body.id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{body.name}</span>
                  <span className="text-slate-100 font-bold tabular-nums">
                    {body.orbitalSpeedKms} km/s
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getPercent(body.orbitalSpeedKms, maxVelocity)}%`,
                      backgroundColor: body.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 4: Semi-Major Axis / Distance from Sun */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Distance from Sun (AU)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedBodies.map((body) => (
              <div key={body.id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{body.name}</span>
                  <span className="text-slate-100 font-bold tabular-nums">
                    {body.semiMajorAxisAu.toFixed(2)} AU
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getPercent(body.semiMajorAxisAu, maxAu)}%`,
                      backgroundColor: body.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 5: Escape Velocity */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Escape Velocity (km/s)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedBodies.map((body) => (
              <div key={body.id} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{body.name}</span>
                  <span className="text-slate-100 font-bold tabular-nums">
                    {body.escapeVelocityKms} km/s
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getPercent(body.escapeVelocityKms, maxEscape)}%`,
                      backgroundColor: body.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Properties Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400">
                <th className="p-2.5 text-left border border-slate-800">Parameter</th>
                {selectedBodies.map((b) => (
                  <th key={b.id} className="p-2.5 text-left border border-slate-800 text-slate-200">
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Mass (kg)</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 tabular-nums border border-slate-800 font-bold">
                    {b.massKg}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Mean Density (g/cm³)</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 tabular-nums border border-slate-800">
                    {b.densityGcm3}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Mean Temperature</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 tabular-nums border border-slate-800">
                    {b.meanTempC}°C
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Day Length (Rotation)</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 tabular-nums border border-slate-800">
                    {Math.abs(b.rotationPeriodHours) < 48
                      ? `${Math.abs(b.rotationPeriodHours).toFixed(1)} hrs`
                      : `${(Math.abs(b.rotationPeriodHours) / 24).toFixed(1)} days`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Known Moons</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 tabular-nums border border-slate-800">
                    {b.moonsCount}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 text-slate-400 border border-slate-800">Atmospheric Pressure</td>
                {selectedBodies.map((b) => (
                  <td key={b.id} className="p-2.5 border border-slate-800 text-[11px]">
                    {b.atmosphericPressureBar}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
