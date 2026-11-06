import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CelestialBody, CELESTIAL_BODIES } from '../data/celestialBodies';
import { HorizonsVectorData, calculateKeplerianPosition } from '../services/nasaApi';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Eye, Info } from 'lucide-react';

interface OrreryCanvasProps {
  selectedBody: CelestialBody;
  onSelectBody: (body: CelestialBody) => void;
  liveEphemerides: Record<string, HorizonsVectorData>;
}

export const OrreryCanvas: React.FC<OrreryCanvasProps> = ({
  selectedBody,
  onSelectBody,
  liveEphemerides,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // days per second
  const [simDaysOffset, setSimDaysOffset] = useState<number>(0);
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Hover state
  const [hoveredBody, setHoveredBody] = useState<CelestialBody | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset to center / selected body
  const handleCenterOnSelected = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.0);
  }, []);

  // Map AU distance to canvas screen pixels
  const auToPixels = useCallback(
    (au: number, baseRadius: number) => {
      if (au <= 0) return 0;
      if (scaleMode === 'linear') {
        // 1 AU = 120 pixels * zoom
        return au * 110 * zoom;
      } else {
        // Balanced Logarithmic / Power scaling for astronomical clarity
        // R = baseRadius * (AU^0.55)
        return Math.pow(au, 0.58) * 160 * zoom;
      }
    },
    [scaleMode, zoom]
  );

  // Render loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();

    const render = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (isPlaying) {
        setSimDaysOffset((prev) => prev + speedMultiplier * deltaTime);
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2 + panOffset.x;
      const centerY = height / 2 + panOffset.y;

      // Clear Canvas
      ctx.fillStyle = '#07090E';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle astronomical coordinate grid
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1;
      const gridSize = 80 * zoom;
      const startX = (centerX % gridSize) - gridSize;
      const startY = (centerY % gridSize) - gridSize;

      ctx.beginPath();
      for (let x = startX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Range Rings (1 AU, 5 AU, 10 AU, 30 AU)
      const rangeDistancesAu = [1, 2, 5, 10, 20, 30];
      rangeDistancesAu.forEach((au) => {
        const r = auToPixels(au, 160);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (showLabels && r > 30) {
          ctx.fillStyle = '#475569';
          ctx.font = '9px monospace';
          ctx.fillText(`${au} AU`, centerX + r + 4, centerY - 4);
        }
      });

      // Draw Asteroid Belt between Mars (1.52 AU) and Jupiter (5.2 AU)
      if (showAsteroidBelt) {
        const innerR = auToPixels(2.1, 160);
        const outerR = auToPixels(3.3, 160);
        const particleCount = 280;

        ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
        for (let i = 0; i < particleCount; i++) {
          const angle = (i * 137.5 * Math.PI) / 180 + (simDaysOffset * 0.0008 * (i % 3 === 0 ? 1 : 0.8));
          const distFraction = ((i * 37) % 100) / 100;
          const r = innerR + distFraction * (outerR - innerR);
          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r;
          ctx.fillRect(px, py, 1.2, 1.2);
        }
      }

      // Track body screen coordinates for hit testing & rendering
      const renderedPositions: {
        body: CelestialBody;
        x: number;
        y: number;
        radius: number;
        distanceAu: number;
      }[] = [];

      // Orbit lines and planet rendering
      CELESTIAL_BODIES.forEach((body, idx) => {
        if (body.id === 'sun' || body.category === 'moon') return;

        // Calculate position
        let angleRad = 0;
        let distanceAu = body.semiMajorAxisAu;

        // Check if we have live NASA ephemeris vectors
        const liveVec = liveEphemerides[body.name];
        if (liveVec && speedMultiplier === 1 && simDaysOffset === 0) {
          // Compute angle from JPL X/Y vector
          angleRad = Math.atan2(liveVec.positionKm.y, liveVec.positionKm.x);
          distanceAu = liveVec.distanceAu;
        } else {
          // Keplerian orbital motion with simulation offset
          const kepler = calculateKeplerianPosition(
            body.semiMajorAxisAu,
            body.eccentricity,
            body.orbitalPeriodDays,
            simDaysOffset,
            idx
          );
          angleRad = kepler.angleRad;
          distanceAu = kepler.distanceAu;
        }

        const orbitRadius = auToPixels(distanceAu, 160);
        const px = centerX + Math.cos(angleRad) * orbitRadius;
        const py = centerY + Math.sin(angleRad) * orbitRadius;

        // Draw Orbit Line
        if (showOrbits) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
          const isSelected = selectedBody.id === body.id;
          ctx.strokeStyle = isSelected
            ? 'rgba(6, 182, 212, 0.7)'
            : 'rgba(51, 65, 85, 0.4)';
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.stroke();
        }

        // Body screen radius
        let bodyScreenRadius = 4;
        if (body.id === 'jupiter' || body.id === 'saturn') bodyScreenRadius = 7;
        else if (body.id === 'uranus' || body.id === 'neptune') bodyScreenRadius = 5.5;
        else if (body.id === 'earth' || body.id === 'venus') bodyScreenRadius = 4.5;
        else if (body.id === 'mercury' || body.id === 'mars') bodyScreenRadius = 3.5;
        else if (body.category === 'dwarf_planet') bodyScreenRadius = 2.5;

        renderedPositions.push({
          body,
          x: px,
          y: py,
          radius: bodyScreenRadius,
          distanceAu,
        });

        // Draw Saturn's Rings if Saturn
        if (body.id === 'saturn') {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.4);
          ctx.beginPath();
          ctx.ellipse(0, 0, bodyScreenRadius * 2.4, bodyScreenRadius * 0.9, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Draw Body Circle
        ctx.beginPath();
        ctx.arc(px, py, bodyScreenRadius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(px, py, bodyScreenRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = body.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Selected Target Reticle
        if (selectedBody.id === body.id) {
          const reticleR = bodyScreenRadius + 9;
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, reticleR, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle ticks
          ctx.beginPath();
          ctx.moveTo(px - reticleR - 3, py);
          ctx.lineTo(px - reticleR + 2, py);
          ctx.moveTo(px + reticleR - 2, py);
          ctx.lineTo(px + reticleR + 3, py);
          ctx.moveTo(px, py - reticleR - 3);
          ctx.lineTo(px, py - reticleR + 2);
          ctx.moveTo(px, py + reticleR - 2);
          ctx.lineTo(px, py + reticleR + 3);
          ctx.stroke();
        }

        // Body Label
        if (showLabels) {
          ctx.fillStyle = selectedBody.id === body.id ? '#06B6D4' : '#E2E8F0';
          ctx.font = selectedBody.id === body.id ? 'bold 11px system-ui' : '10px system-ui';
          ctx.fillText(body.name, px + bodyScreenRadius + 6, py + 3);

          ctx.fillStyle = '#64748B';
          ctx.font = '9px monospace';
          ctx.fillText(`${distanceAu.toFixed(2)} AU`, px + bodyScreenRadius + 6, py + 14);
        }
      });

      // Draw The Sun at Center
      const sunScreenRadius = Math.max(12, 16 * Math.sqrt(zoom));
      // Outer Solar Flare Corona
      const sunGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        sunScreenRadius * 0.4,
        centerX,
        centerY,
        sunScreenRadius * 2.8
      );
      sunGradient.addColorStop(0, '#FFFFFF');
      sunGradient.addColorStop(0.2, '#F59E0B');
      sunGradient.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
      sunGradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunScreenRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Sun Core
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunScreenRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sun Reticle if selected
      if (selectedBody.id === 'sun') {
        const reticleR = sunScreenRadius + 8;
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, reticleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showLabels) {
        ctx.fillStyle = selectedBody.id === 'sun' ? '#06B6D4' : '#FCD34D';
        ctx.font = 'bold 11px system-ui';
        ctx.fillText('The Sun', centerX + sunScreenRadius + 6, centerY + 3);
        ctx.fillStyle = '#78716C';
        ctx.font = '9px monospace';
        ctx.fillText('0.00 AU · Sol', centerX + sunScreenRadius + 6, centerY + 14);
      }

      // Store rendered positions for click handling
      (canvas as any).__renderedPositions = [
        {
          body: CELESTIAL_BODIES[0],
          x: centerX,
          y: centerY,
          radius: sunScreenRadius + 8,
          distanceAu: 0,
        },
        ...renderedPositions,
      ];

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    zoom,
    panOffset,
    isPlaying,
    speedMultiplier,
    simDaysOffset,
    scaleMode,
    showOrbits,
    showAsteroidBelt,
    showLabels,
    selectedBody,
    liveEphemerides,
    auToPixels,
  ]);

  // Click handler to select planet
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const positions: any[] = (canvas as any).__renderedPositions || [];
    for (const item of positions) {
      const dx = clickX - item.x;
      const dy = clickY - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(item.radius, 14)) {
        onSelectBody(item.body);
        return;
      }
    }
  };

  // Mouse move for hover and dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    setMousePos({ x: currentX, y: currentY });

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Check hover
    const positions: any[] = (canvas as any).__renderedPositions || [];
    let found: CelestialBody | null = null;
    for (const item of positions) {
      const dx = currentX - item.x;
      const dy = currentY - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(item.radius, 14)) {
        found = item.body;
        break;
      }
    }
    setHoveredBody(found);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 4.5));
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[640px] bg-[#07090E] border border-slate-800 rounded-lg overflow-hidden flex flex-col select-none">
      {/* Top HUD Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Telemetry Status Ribbon */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded text-xs pointer-events-auto backdrop-blur-sm">
          <span className="font-mono text-cyan-400 font-semibold tracking-wider uppercase">
            Heliocentric Orrery
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 font-mono">
            {simDaysOffset === 0 ? 'Live NASA Epoch' : `Sim: +${Math.round(simDaysOffset)}d`}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 font-mono">Zoom: {zoom.toFixed(2)}x</span>
        </div>

        {/* View & Layer Toggles */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Scale mode segmented buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded text-xs">
            <button
              onClick={() => setScaleMode('log')}
              className={`px-2.5 py-1 rounded font-mono transition-colors whitespace-nowrap ${
                scaleMode === 'log'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balanced scale keeps inner and outer planets clearly visible"
            >
              Balanced Scale
            </button>
            <button
              onClick={() => setScaleMode('linear')}
              className={`px-2.5 py-1 rounded font-mono transition-colors whitespace-nowrap ${
                scaleMode === 'linear'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Physical 1:1 Astronomical Unit scale"
            >
              Linear AU
            </button>
          </div>

          {/* Visibility toggles */}
          <button
            onClick={() => setShowOrbits((prev) => !prev)}
            className={`p-1.5 rounded border text-xs font-mono transition-colors ${
              showOrbits
                ? 'bg-slate-800 border-slate-700 text-cyan-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
            }`}
            title="Toggle Orbital Ellipses"
          >
            Orbits
          </button>
          <button
            onClick={() => setShowAsteroidBelt((prev) => !prev)}
            className={`p-1.5 rounded border text-xs font-mono transition-colors ${
              showAsteroidBelt
                ? 'bg-slate-800 border-slate-700 text-cyan-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
            }`}
            title="Toggle Asteroid Belt Particles"
          >
            Belt
          </button>
          <button
            onClick={() => setShowLabels((prev) => !prev)}
            className={`p-1.5 rounded border text-xs font-mono transition-colors ${
              showLabels
                ? 'bg-slate-800 border-slate-700 text-cyan-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
            }`}
            title="Toggle Body Labels"
          >
            Labels
          </button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair"
      />

      {/* Floating Hover Card */}
      {hoveredBody && (
        <div
          className="absolute z-20 pointer-events-none px-2.5 py-1.5 bg-slate-900/95 border border-cyan-700/60 rounded shadow-xl text-xs font-mono text-slate-200 backdrop-blur-md"
          style={{
            left: Math.min(mousePos.x + 14, 520),
            top: Math.max(mousePos.y - 45, 12),
          }}
        >
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: hoveredBody.color }}
            />
            {hoveredBody.name}
          </div>
          <div className="text-slate-400 text-[11px] mt-0.5">
            Distance: {hoveredBody.semiMajorAxisAu.toFixed(2)} AU · Speed: {hoveredBody.orbitalSpeedKms} km/s
          </div>
        </div>
      )}

      {/* Bottom HUD: Simulation & Zoom Controls */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Playback controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded pointer-events-auto backdrop-blur-sm">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 hover:bg-slate-800 text-slate-200 rounded transition-colors"
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Speed presets */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-2 pr-1">
            <button
              onClick={() => {
                setSpeedMultiplier(1);
                setSimDaysOffset(0);
              }}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                speedMultiplier === 1 && simDaysOffset === 0
                  ? 'bg-cyan-950 text-cyan-300'
                  : 'hover:text-slate-200'
              }`}
            >
              1x Real
            </button>
            <button
              onClick={() => setSpeedMultiplier(10)}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                speedMultiplier === 10 ? 'bg-cyan-950 text-cyan-300' : 'hover:text-slate-200'
              }`}
            >
              10d/s
            </button>
            <button
              onClick={() => setSpeedMultiplier(60)}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                speedMultiplier === 60 ? 'bg-cyan-950 text-cyan-300' : 'hover:text-slate-200'
              }`}
            >
              60d/s
            </button>
            <button
              onClick={() => setSpeedMultiplier(365)}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                speedMultiplier === 365 ? 'bg-cyan-950 text-cyan-300' : 'hover:text-slate-200'
              }`}
            >
              1yr/s
            </button>
          </div>

          {/* Reset epoch */}
          <button
            onClick={() => {
              setSimDaysOffset(0);
              setSpeedMultiplier(1);
            }}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Reset to Today"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport Zoom & Recenter controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded pointer-events-auto backdrop-blur-sm">
          <button
            onClick={() => setZoom((prev) => Math.min(prev * 1.25, 4.5))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(prev * 0.8, 0.25))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCenterOnSelected}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition-colors"
            title="Center View"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
