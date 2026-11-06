import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache to respect NASA API rate limits & speed up telemetry
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Format UTC date as YYYY-MM-DD
function getUTCDateString(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Helper to parse JPL Horizons state vectors from raw text result
function parseHorizonsVectors(rawText: string) {
  try {
    const soeIndex = rawText.indexOf('$$SOE');
    const eoeIndex = rawText.indexOf('$$EOE');

    if (soeIndex === -1 || eoeIndex === -1) {
      return null;
    }

    const vectorBlock = rawText.substring(soeIndex + 5, eoeIndex).trim();
    const lines = vectorBlock.split('\n').map((l) => l.trim()).filter(Boolean);

    // Look for lines containing X = and VX = and LT=
    let x = 0, y = 0, z = 0;
    let vx = 0, vy = 0, vz = 0;
    let lt = 0, rg = 0, rr = 0;
    let julianDate = '';

    for (const line of lines) {
      if (line.includes('=')) {
        if (line.includes('X =') && line.includes('Y =')) {
          const matchX = line.match(/X\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchY = line.match(/Y\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchZ = line.match(/Z\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          if (matchX) x = parseFloat(matchX[1]);
          if (matchY) y = parseFloat(matchY[1]);
          if (matchZ) z = parseFloat(matchZ[1]);
        } else if (line.includes('VX=') || line.includes('VX =')) {
          const matchVX = line.match(/VX\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchVY = line.match(/VY\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchVZ = line.match(/VZ\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          if (matchVX) vx = parseFloat(matchVX[1]);
          if (matchVY) vy = parseFloat(matchVY[1]);
          if (matchVZ) vz = parseFloat(matchVZ[1]);
        } else if (line.includes('LT=') || line.includes('RG=')) {
          const matchLT = line.match(/LT\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchRG = line.match(/RG\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          const matchRR = line.match(/RR\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/i);
          if (matchLT) lt = parseFloat(matchLT[1]);
          if (matchRG) rg = parseFloat(matchRG[1]);
          if (matchRR) rr = parseFloat(matchRR[1]);
        } else if (line.match(/^\d{7}\.\d+/)) {
          julianDate = line.split('=')[0]?.trim() || '';
        }
      }
    }

    const AU_KM = 149597870.7;
    const distanceAu = rg > 0 ? rg / AU_KM : Math.sqrt(x * x + y * y + z * z) / AU_KM;
    const velocityKmS = Math.sqrt(vx * vx + vy * vy + vz * vz);

    return {
      julianDate,
      positionKm: { x, y, z },
      velocityKmS: { vx, vy, vz },
      totalVelocityKmS: velocityKmS,
      distanceKm: rg || Math.sqrt(x * x + y * y + z * z),
      distanceAu,
      lightTimeSec: lt,
      rangeRateKmS: rr,
    };
  } catch (err) {
    console.error('Error parsing horizons text:', err);
    return null;
  }
}

// 1. Endpoint: JPL Horizons Ephemeris API proxy
app.get('/api/nasa/horizons', async (req: Request, res: Response) => {
  const bodyId = (req.query.bodyId as string) || '399';
  const today = getUTCDateString(0);
  const tomorrow = getUTCDateString(1);
  const cacheKey = `horizons_${bodyId}_${today}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const center = bodyId === '10' ? '500@0' : '500@10'; // Heliocentric or Solar System Barycenter
    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${encodeURIComponent(
      bodyId
    )}'&EPHEM_TYPE='VECTORS'&CENTER='${encodeURIComponent(
      center
    )}'&START_TIME='${today}'&STOP_TIME='${tomorrow}'&STEP_SIZE='1d'`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`NASA JPL returned ${response.status}`);
    }

    const json = await response.json();
    const vectors = parseHorizonsVectors(json.result || '');

    const resultPayload = {
      bodyId,
      date: today,
      vectors,
      rawSignature: json.signature || null,
      rawExcerpt: json.result ? json.result.slice(0, 1500) : '',
    };

    setCache(cacheKey, resultPayload);
    return res.json({ source: 'live', data: resultPayload });
  } catch (error: any) {
    console.error('Horizons fetch error:', error?.message);
    return res.status(500).json({ error: error?.message || 'Failed to fetch Horizons data' });
  }
});

// 2. Endpoint: NASA NeoWs (Near-Earth Objects live feed)
app.get('/api/nasa/neows', async (_req: Request, res: Response) => {
  const today = getUTCDateString(0);
  const cacheKey = `neows_${today}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`NeoWs returned ${response.status}`);
    }

    const json = await response.json();
    const objectsForToday = json.near_earth_objects?.[today] || [];

    const formatted = objectsForToday.map((item: any) => {
      const approach = item.close_approach_data?.[0] || {};
      return {
        id: item.id,
        name: item.name,
        nasaJplUrl: item.nasa_jpl_url,
        isHazardous: item.is_potentially_hazardous_asteroid,
        absoluteMagnitude: item.absolute_magnitude_h,
        estimatedDiameterMeters: {
          min: item.estimated_diameter?.meters?.estimated_diameter_min,
          max: item.estimated_diameter?.meters?.estimated_diameter_max,
        },
        closeApproachDate: approach.close_approach_date_full || approach.close_approach_date,
        velocityKmH: parseFloat(approach.relative_velocity?.kilometers_per_hour || '0'),
        velocityKmS: parseFloat(approach.relative_velocity?.kilometers_per_second || '0'),
        missDistanceKm: parseFloat(approach.miss_distance?.kilometers || '0'),
        missDistanceAu: parseFloat(approach.miss_distance?.astronomical || '0'),
        missDistanceLunar: parseFloat(approach.miss_distance?.lunar || '0'),
        orbitingBody: approach.orbiting_body,
      };
    });

    const payload = {
      date: today,
      count: json.element_count || formatted.length,
      objects: formatted,
    };

    setCache(cacheKey, payload);
    return res.json({ source: 'live', data: payload });
  } catch (error: any) {
    console.error('NeoWs fetch error:', error?.message);
    return res.status(500).json({ error: error?.message || 'Failed to fetch Near Earth Objects' });
  }
});

// 3. Endpoint: NASA APOD (Astronomy Picture of the Day)
app.get('/api/nasa/apod', async (_req: Request, res: Response) => {
  const today = getUTCDateString(0);
  const cacheKey = `apod_${today}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`APOD returned ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return res.json({ source: 'live', data });
  } catch (error: any) {
    console.error('APOD fetch error:', error?.message);
    return res.status(500).json({ error: error?.message || 'Failed to fetch APOD' });
  }
});

// 4. Batch live ephemerides for major solar system bodies
const MAJOR_BODIES = [
  { id: '199', name: 'Mercury' },
  { id: '299', name: 'Venus' },
  { id: '399', name: 'Earth' },
  { id: '301', name: 'Moon' },
  { id: '499', name: 'Mars' },
  { id: '1', name: 'Ceres' },
  { id: '599', name: 'Jupiter' },
  { id: '699', name: 'Saturn' },
  { id: '799', name: 'Uranus' },
  { id: '899', name: 'Neptune' },
  { id: '999', name: 'Pluto' },
];

app.get('/api/nasa/batch-ephemeris', async (_req: Request, res: Response) => {
  const today = getUTCDateString(0);
  const cacheKey = `batch_ephemeris_${today}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const tomorrow = getUTCDateString(1);
    const results: Record<string, any> = {};

    // Parallel fetch with Promise.allSettled
    const promises = MAJOR_BODIES.map(async (body) => {
      try {
        const center = '500@10'; // Heliocentric
        const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${body.id}'&EPHEM_TYPE='VECTORS'&CENTER='${center}'&START_TIME='${today}'&STOP_TIME='${tomorrow}'&STEP_SIZE='1d'`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (resp.ok) {
          const json = await resp.json();
          const vectors = parseHorizonsVectors(json.result || '');
          if (vectors) {
            results[body.name] = {
              bodyId: body.id,
              name: body.name,
              vectors,
            };
          }
        }
      } catch (e) {
        // Individual failure is caught cleanly
      }
    });

    await Promise.allSettled(promises);

    const payload = {
      date: today,
      bodies: results,
      totalCount: Object.keys(results).length,
    };

    setCache(cacheKey, payload);
    return res.json({ source: 'live', data: payload });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed batch ephemeris' });
  }
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solar System Explorer server running at http://localhost:${PORT}`);
  });
}

startServer();
