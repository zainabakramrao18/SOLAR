export interface HorizonsVectorData {
  julianDate: string;
  positionKm: { x: number; y: number; z: number };
  velocityKmS: { vx: number; vy: number; vz: number };
  totalVelocityKmS: number;
  distanceKm: number;
  distanceAu: number;
  lightTimeSec: number;
  rangeRateKmS: number;
}

export interface HorizonsResponse {
  bodyId: string;
  date: string;
  vectors: HorizonsVectorData | null;
  rawSignature?: { source: string; version: string } | null;
  rawExcerpt?: string;
}

export interface NeoObject {
  id: string;
  name: string;
  nasaJplUrl: string;
  isHazardous: boolean;
  absoluteMagnitude: number;
  estimatedDiameterMeters: {
    min: number;
    max: number;
  };
  closeApproachDate: string;
  velocityKmH: number;
  velocityKmS: number;
  missDistanceKm: number;
  missDistanceAu: number;
  missDistanceLunar: number;
  orbitingBody: string;
}

export interface NeoWsResponse {
  date: string;
  count: number;
  objects: NeoObject[];
}

export interface ApodData {
  title: string;
  date: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
}

// Fetch single body Horizons telemetry
export async function fetchHorizonsTelemetry(bodyId: string): Promise<HorizonsResponse | null> {
  try {
    const res = await fetch(`/api/nasa/horizons?bodyId=${encodeURIComponent(bodyId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn(`Failed to fetch Horizons data for ${bodyId}, using orbital mechanics:`, err);
    return null;
  }
}

// Fetch batch ephemerides for all major planets
export async function fetchBatchEphemerides(): Promise<Record<string, HorizonsVectorData>> {
  try {
    const res = await fetch('/api/nasa/batch-ephemeris');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const result: Record<string, HorizonsVectorData> = {};
    if (json.data && json.data.bodies) {
      for (const [name, val] of Object.entries<any>(json.data.bodies)) {
        if (val.vectors) {
          result[name] = val.vectors;
        }
      }
    }
    return result;
  } catch (err) {
    console.warn('Batch ephemeris fetch error, falling back to Keplerian calculation:', err);
    return {};
  }
}

// Fetch live Near Earth Objects from NASA NeoWs
export async function fetchNearEarthObjects(): Promise<NeoWsResponse | null> {
  try {
    const res = await fetch('/api/nasa/neows');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Failed to fetch NeoWs:', err);
    return null;
  }
}

// Fetch NASA Astronomy Picture of the Day
export async function fetchApod(): Promise<ApodData | null> {
  try {
    const res = await fetch('/api/nasa/apod');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Failed to fetch APOD:', err);
    return null;
  }
}

// Keplerian orbital position calculation for arbitrary date or simulation time
// Based on NASA JPL approximate positions of the planets
export function calculateKeplerianPosition(
  semiMajorAxisAu: number,
  eccentricity: number,
  orbitalPeriodDays: number,
  epochDaysOffset: number,
  bodyIndexPhase = 0
): { xAu: number; yAu: number; distanceAu: number; angleRad: number } {
  if (semiMajorAxisAu <= 0) {
    return { xAu: 0, yAu: 0, distanceAu: 0, angleRad: 0 };
  }

  // Mean anomaly M in radians
  const meanMotionRadPerDay = (2 * Math.PI) / orbitalPeriodDays;
  const initialPhase = bodyIndexPhase * 0.73;
  const M = (meanMotionRadPerDay * epochDaysOffset + initialPhase) % (2 * Math.PI);

  // Solve Kepler's equation M = E - e*sin(E) for Eccentric Anomaly E
  let E = M;
  for (let i = 0; i < 4; i++) {
    E = E - (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E));
  }

  // Heliocentric coordinates in orbital plane
  const xPrime = semiMajorAxisAu * (Math.cos(E) - eccentricity);
  const yPrime = semiMajorAxisAu * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E);

  const distanceAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  const angleRad = Math.atan2(yPrime, xPrime);

  return {
    xAu: xPrime,
    yAu: yPrime,
    distanceAu,
    angleRad,
  };
}
