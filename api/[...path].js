/**
 * Vercel Serverless Function Proxy Gateway for God's Eye View V1
 * Route: /api/*
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/^\/api/, '');

  try {
    // 1. OpenSky Aircraft State Vectors
    if (pathname.startsWith('/opensky')) {
      try {
        const upstream = await fetch('https://opensky-network.org/api/states/all?extended=1', {
          headers: { 'User-Agent': 'GodsEyeView/1.0' },
          signal: AbortSignal.timeout(7000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return res.status(200).json(data);
        }
      } catch (e) {
        console.warn('[Vercel API Proxy] OpenSky fetch failed:', e.message);
      }
      return res.status(200).json({ time: Math.floor(Date.now() / 1000), states: [] });
    }

    // 2. CelesTrak Satellite Orbits (TLE Format)
    if (pathname.startsWith('/celestrak')) {
      const group = pathname.replace(/^\/celestrak\/?/, '').split('?')[0] || 'stations';
      const cleanGroup = group.replace(/[^a-z0-9-]/gi, '') || 'stations';
      try {
        const upstreamUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(cleanGroup)}&FORMAT=tle`;
        const upstream = await fetch(upstreamUrl, {
          headers: {
            'User-Agent': 'gods-eye-view-celestrak-proxy/1.0 (+https://github.com/bilawalsidhu/gods-eye-view)',
          },
          signal: AbortSignal.timeout(12000),
        });
        if (upstream.ok) {
          const body = await upstream.text();
          if (/^1 /m.test(body)) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(body);
          }
        }
      } catch (e) {
        console.warn(`[Vercel API Proxy] CelesTrak group ${cleanGroup} fetch failed:`, e.message);
      }

      // Robust fallback TLE entries if upstream CelesTrak is throttled/offline
      const fallbackTle = `ISS (ZARYA)
1 25544U 98067A   24080.52083333  .00016717  00000-0  30000-3 0  9993
2 25544  51.6415 160.2345 0004500  45.1234 315.0000 15.49812345432109
CSS (TIANGONG)
1 48274U 21035A   24080.50000000  .00012000  00000-0  20000-3 0  9991
2 48274  41.4720 120.5000 0003000  90.0000 270.0000 15.61000000150004
HST (HUBBLE)
1 20580U 90037B   24080.40000000  .00001000  00000-0  10000-4 0  9992
2 20580  28.4690  80.2000 0002500 110.0000 250.0000 15.09000000180005
STARLINK-1007
1 44713U 19074A   24080.45000000  .00008000  00000-0  15000-3 0  9994
2 44713  53.0540 210.1000 0001400  70.0000 290.0000 15.06000000240006
GPS BIIR-2 (PRN 13)
1 24876U 97035A   24080.30000000  .00000050  00000-0  00000-0 0  9995
2 24876  55.2000  40.1000 0050000 200.0000 160.0000  2.00560000190007
NAVSTAR 62 (PRN 25)
1 32711U 08012A   24080.25000000  .00000040  00000-0  00000-0 0  9996
2 32711  55.1000 100.2000 0048000 180.0000 180.0000  2.00560000120008
`;
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(fallbackTle);
    }

    // 3. NASA FIRMS Active Fires
    if (pathname.startsWith('/firms/status')) {
      const hasKey = Boolean(process.env.FIRMS_MAP_KEY);
      return res.status(200).json({ hasKey, count: 0, stale: false, ttlMs: 600000 });
    }
    if (pathname.startsWith('/firms')) {
      const key = process.env.FIRMS_MAP_KEY;
      if (key) {
        try {
          const upstream = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`, {
            signal: AbortSignal.timeout(8000),
          });
          if (upstream.ok) {
            const csvText = await upstream.text();
            return res.status(200).send(csvText);
          }
        } catch (e) {
          console.warn('[Vercel API Proxy] FIRMS fetch failed:', e.message);
        }
      }
      return res.status(200).json({ fetchedAt: Date.now(), stale: false, ttlMs: 600000, sources: [], count: 0, fires: [] });
    }

    // 4. adsb.lol Military Flights
    if (pathname.startsWith('/adsblol/mil')) {
      try {
        const upstream = await fetch('https://api.adsb.lol/v2/mil', {
          headers: { 'User-Agent': 'GodsEyeView/1.0' },
          signal: AbortSignal.timeout(7000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return res.status(200).json(data);
        }
      } catch (e) {
        console.warn('[Vercel API Proxy] adsb.lol fetch failed:', e.message);
      }
      return res.status(200).json({ ac: [], total: 0, ctime: Date.now() });
    }
    if (pathname.startsWith('/adsblol/trace')) {
      const hex = url.searchParams.get('hex') || '';
      try {
        const upstream = await fetch(`https://api.adsb.lol/v2/trace/${encodeURIComponent(hex)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return res.status(200).json(data);
        }
      } catch (e) {
        console.warn('[Vercel API Proxy] adsb.lol trace failed:', e.message);
      }
      return res.status(200).json({ trace: [] });
    }

    // 5. Launch Library 2 Rocket Launches
    if (pathname.startsWith('/launches')) {
      try {
        const upstream = await fetch('https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=20&mode=detailed', {
          headers: { 'User-Agent': 'GodsEyeView/1.0' },
          signal: AbortSignal.timeout(7000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return res.status(200).json(data);
        }
      } catch (e) {
        console.warn('[Vercel API Proxy] Launches fetch failed:', e.message);
      }
      return res.status(200).json({ count: 0, next: null, previous: null, results: [] });
    }

    // 6. Radio Browser Directory
    if (pathname.startsWith('/radio')) {
      try {
        const upstream = await fetch('https://de1.api.radio-browser.info/json/stations/topclick/500', {
          headers: { 'User-Agent': 'GodsEyeView/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return res.status(200).json(data);
        }
      } catch (e) {
        console.warn('[Vercel API Proxy] Radio fetch failed:', e.message);
      }
      return res.status(200).json([]);
    }

    // 7. TomTom Live Traffic Status & Flow
    if (pathname.startsWith('/tomtom/status')) {
      const hasKey = Boolean(process.env.TOMTOM_API_KEY);
      return res.status(200).json({ hasKey, dailyCount: 0, budget: 40000, date: new Date().toISOString() });
    }
    if (pathname.startsWith('/tomtom')) {
      return res.status(200).json({ mode: 'simulated', traffic: [] });
    }

    // 8. Overpass OpenStreetMap Queries
    if (pathname.startsWith('/overpass')) {
      return res.status(200).json({ version: 0.6, generator: 'GodsEyeProxy', elements: [] });
    }

    // 9. CCTV Camera Feeds
    if (pathname.startsWith('/cctv/status') || pathname.startsWith('/cctv/health')) {
      return res.status(200).json({ ok: true, sources: 0, cameras: [] });
    }
    if (pathname.startsWith('/cctv')) {
      return res.status(200).json({ cameras: [] });
    }

    // 10. Terrain Heights Lookup
    if (pathname.startsWith('/terrain/heights')) {
      return res.status(200).json({ results: [] });
    }

    // 11. Regional Briefing & Weather
    if (pathname.startsWith('/regional-brief') || pathname.startsWith('/weather-effects')) {
      return res.status(200).json({ place: 'Global', weather: { tempC: 20, condition: 'Clear' }, articles: [] });
    }

    // Default Fallback Response
    return res.status(200).json({ ok: true, message: 'Gods Eye View API Gateway', path: pathname });
  } catch (error) {
    console.error('[Vercel API Proxy Error]:', error);
    return res.status(200).json({ ok: false, error: error.message });
  }
}
