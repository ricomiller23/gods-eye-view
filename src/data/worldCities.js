/**
 * World Cities & Places Gazette with Fuzzy Search and Nominatim Geocoding Fallback.
 * Ensures location search ("Moscow", "Mosow", "Scottsdale", "Berlin", etc.) succeeds
 * even without Google Maps API keys or when typos occur.
 */

/** Levenshtein distance between two strings. */
export function levenshteinDistance(a, b) {
  const s = String(a || '').toLowerCase();
  const t = String(b || '').toLowerCase();
  const m = s.length;
  const n = t.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

/** Pre-populated gazetteer of global cities and popular search targets. */
export const WORLD_CITIES = [
  {
    name: 'Moscow',
    aliases: ['mosow', 'moskva', 'москва', 'moskow'],
    lat: 55.7558,
    lon: 37.6173,
    range: 25000,
    label: 'Moscow, Russia',
    bounds: { southwest: { lat: 55.57, lng: 37.33 }, northeast: { lat: 55.91, lng: 37.88 } },
  },
  {
    name: 'Scottsdale',
    aliases: ['scottsdale az', 'scotsdale', 'scotsdale az'],
    lat: 33.4942,
    lon: -111.9261,
    range: 18000,
    label: 'Scottsdale, Arizona, USA',
    bounds: { southwest: { lat: 33.42, lng: -111.98 }, northeast: { lat: 33.68, lng: -111.82 } },
  },
  {
    name: 'Phoenix',
    aliases: ['phoenix az', 'phenix'],
    lat: 33.4484,
    lon: -112.0740,
    range: 25000,
    label: 'Phoenix, Arizona, USA',
  },
  {
    name: 'Los Angeles',
    aliases: ['la', 'los angeles ca', 'l.a.'],
    lat: 34.0522,
    lon: -118.2437,
    range: 35000,
    label: 'Los Angeles, California, USA',
  },
  {
    name: 'Chicago',
    aliases: ['chicago il', 'windy city'],
    lat: 41.8781,
    lon: -87.6298,
    range: 25000,
    label: 'Chicago, Illinois, USA',
  },
  {
    name: 'Houston',
    aliases: ['houston tx'],
    lat: 29.7604,
    lon: -95.3698,
    range: 25000,
    label: 'Houston, Texas, USA',
  },
  {
    name: 'Seattle',
    aliases: ['seattle wa'],
    lat: 47.6062,
    lon: -122.3321,
    range: 20000,
    label: 'Seattle, Washington, USA',
  },
  {
    name: 'Miami',
    aliases: ['miami fl'],
    lat: 25.7617,
    lon: -80.1918,
    range: 20000,
    label: 'Miami, Florida, USA',
  },
  {
    name: 'Berlin',
    aliases: ['berlin germany'],
    lat: 52.5200,
    lon: 13.4050,
    range: 22000,
    label: 'Berlin, Germany',
  },
  {
    name: 'Rome',
    aliases: ['roma', 'rome italy'],
    lat: 41.9028,
    lon: 12.4964,
    range: 20000,
    label: 'Rome, Italy',
  },
  {
    name: 'Madrid',
    aliases: ['madrid spain'],
    lat: 40.4168,
    lon: -3.7038,
    range: 22000,
    label: 'Madrid, Spain',
  },
  {
    name: 'Barcelona',
    aliases: ['barcelona spain'],
    lat: 41.3851,
    lon: 2.1734,
    range: 20000,
    label: 'Barcelona, Spain',
  },
  {
    name: 'Sydney',
    aliases: ['sydney australia'],
    lat: -33.8688,
    lon: 151.2093,
    range: 22000,
    label: 'Sydney, Australia',
  },
  {
    name: 'Toronto',
    aliases: ['toronto canada'],
    lat: 43.6532,
    lon: -79.3832,
    range: 22000,
    label: 'Toronto, Canada',
  },
  {
    name: 'Beijing',
    aliases: ['peking', 'beijing china'],
    lat: 39.9042,
    lon: 116.4074,
    range: 30000,
    label: 'Beijing, China',
  },
  {
    name: 'Shanghai',
    aliases: ['shanghai china'],
    lat: 31.2304,
    lon: 121.4737,
    range: 30000,
    label: 'Shanghai, China',
  },
  {
    name: 'Mumbai',
    aliases: ['bombay', 'mumbai india'],
    lat: 19.0760,
    lon: 72.8777,
    range: 28000,
    label: 'Mumbai, India',
  },
  {
    name: 'Cairo',
    aliases: ['cairo egypt'],
    lat: 30.0444,
    lon: 31.2357,
    range: 25000,
    label: 'Cairo, Egypt',
  },
  {
    name: 'Rio de Janeiro',
    aliases: ['rio', 'rio de janeiro brazil'],
    lat: -22.9068,
    lon: -43.1729,
    range: 25000,
    label: 'Rio de Janeiro, Brazil',
  },
  {
    name: 'Buenos Aires',
    aliases: ['buenos aires argentina'],
    lat: -34.6037,
    lon: -58.3816,
    range: 25000,
    label: 'Buenos Aires, Argentina',
  },
  {
    name: 'Singapore',
    aliases: ['singapore city'],
    lat: 1.3521,
    lon: 103.8198,
    range: 18000,
    label: 'Singapore',
  },
  {
    name: 'Hong Kong',
    aliases: ['hk', 'hong kong china'],
    lat: 22.3193,
    lon: 114.1694,
    range: 20000,
    label: 'Hong Kong',
  },
  {
    name: 'Seoul',
    aliases: ['seoul korea', 'seoul south korea'],
    lat: 37.5665,
    lon: 126.9780,
    range: 25000,
    label: 'Seoul, South Korea',
  },
  {
    name: 'Bangkok',
    aliases: ['bangkok thailand'],
    lat: 13.7563,
    lon: 100.5018,
    range: 25000,
    label: 'Bangkok, Thailand',
  },
  {
    name: 'Istanbul',
    aliases: ['istanbul turkey', 'constantinople'],
    lat: 41.0082,
    lon: 28.9784,
    range: 25000,
    label: 'Istanbul, Turkey',
  },
  {
    name: 'Amsterdam',
    aliases: ['amsterdam netherlands'],
    lat: 52.3676,
    lon: 4.9041,
    range: 18000,
    label: 'Amsterdam, Netherlands',
  },
  {
    name: 'Vienna',
    aliases: ['wien', 'vienna austria'],
    lat: 48.2082,
    lon: 16.3738,
    range: 18000,
    label: 'Vienna, Austria',
  },
  {
    name: 'Cape Town',
    aliases: ['cape town south africa'],
    lat: -33.9249,
    lon: 18.4241,
    range: 20000,
    label: 'Cape Town, South Africa',
  },
  {
    name: 'Las Vegas',
    aliases: ['vegas', 'las vegas nv'],
    lat: 36.1699,
    lon: -115.1398,
    range: 20000,
    label: 'Las Vegas, Nevada, USA',
  },
  {
    name: 'San Diego',
    aliases: ['san diego ca'],
    lat: 32.7157,
    lon: -117.1611,
    range: 22000,
    label: 'San Diego, California, USA',
  },
];

/** Search the built-in world cities gazetteer with fuzzy matching. */
export function findWorldCity(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;

  // 1. Direct name/alias match
  for (const city of WORLD_CITIES) {
    if (city.name.toLowerCase() === q) return city;
    if (city.aliases?.some((alias) => alias.toLowerCase() === q)) return city;
  }

  // 2. Substring/token match
  for (const city of WORLD_CITIES) {
    if (city.name.toLowerCase().includes(q) || q.includes(city.name.toLowerCase())) {
      return city;
    }
    if (city.aliases?.some((alias) => alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase()))) {
      return city;
    }
  }

  // 3. Fuzzy Levenshtein match (max edit distance 2 for words >= 4 chars)
  if (q.length >= 4) {
    let bestCity = null;
    let minDistance = 3;
    for (const city of WORLD_CITIES) {
      const nameDist = levenshteinDistance(q, city.name);
      if (nameDist < minDistance) {
        minDistance = nameDist;
        bestCity = city;
      }
      if (city.aliases) {
        for (const alias of city.aliases) {
          const aliasDist = levenshteinDistance(q, alias);
          if (aliasDist < minDistance) {
            minDistance = aliasDist;
            bestCity = city;
          }
        }
      }
    }
    if (bestCity && minDistance <= 2) {
      return bestCity;
    }
  }

  return null;
}

/** OpenStreetMap Nominatim keyless geocoding fallback. */
export async function geocodeViaNominatim(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ProjectCharlieTuna/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) return null;
    const hit = data[0];
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    let viewport = null;
    if (Array.isArray(hit.boundingbox) && hit.boundingbox.length === 4) {
      const south = parseFloat(hit.boundingbox[0]);
      const north = parseFloat(hit.boundingbox[1]);
      const west = parseFloat(hit.boundingbox[2]);
      const east = parseFloat(hit.boundingbox[3]);
      if ([south, north, west, east].every(Number.isFinite)) {
        viewport = {
          southwest: { lat: south, lng: west },
          northeast: { lat: north, lng: east },
        };
      }
    }

    const type = hit.type || hit.class || 'locality';
    const types = [type];
    if (['city', 'town', 'village', 'administrative'].includes(type)) {
      types.push('locality');
    }

    return {
      lat,
      lng,
      label: hit.display_name || query,
      types,
      viewport,
    };
  } catch (e) {
    console.warn('[Nominatim Geocoder] Fallback failed:', e?.message || e);
    return null;
  }
}
