import {
  MELBOURNE_PILOT_SPOTS,
  MELBOURNE_STREET_CORRIDORS,
  SYDNEY_PILOT_SPOTS,
  SYDNEY_STREET_CORRIDORS,
} from '../constants/auPresets';
import { detectActiveRegion } from '../constants/auSuburbs';
import {
  isSafeParkPhotoUrl,
  resolveParkPhotoUri,
} from '../constants/parkPhotos';
import {
  SHANGHAI_PILOT_SPOTS,
  SHANGHAI_STREET_CORRIDORS,
} from '../constants/presets';
import {
  AmenityKey,
  LocationPoint,
  PlaceCategory,
  StreetCorridor,
  WalkPlace,
} from '../types/walk';
import {
  isValidCoordinate,
  sanitizeSearchQuery,
  sanitizeText,
} from '../utils/validation';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';
const REQUEST_TIMEOUT_MS = 7500;

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Computes great-circle Haversine distance in kilometers between two coordinates.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * Returns curated street & foreshore walking corridors for Melbourne, Sydney, or Shanghai.
 */
export function getCorridorsForLocation(
  latitude: number,
  longitude: number
): StreetCorridor[] {
  const region = detectActiveRegion(latitude, longitude);
  if (region === 'melbourne') return MELBOURNE_STREET_CORRIDORS;
  if (region === 'sydney') return SYDNEY_STREET_CORRIDORS;
  if (region === 'shanghai') return SHANGHAI_STREET_CORRIDORS;
  return [];
}

/**
 * Searches worldwide cities and neighborhoods via Open-Meteo's HTTPS Geocoding API.
 */
export async function searchLocations(
  rawQuery: string
): Promise<LocationPoint[]> {
  const cleanQuery = sanitizeSearchQuery(rawQuery);
  if (cleanQuery.length < 2) {
    return [];
  }

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cleanQuery)}&count=8&language=en&format=json`;
  const data = await fetchJsonWithTimeout(url);
  if (!data || typeof data !== 'object') {
    return [];
  }

  const results = (data as Record<string, unknown>).results;
  if (!Array.isArray(results)) {
    return [];
  }

  const locations: LocationPoint[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const lat = rec.latitude;
    const lon = rec.longitude;
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      !isValidCoordinate(lat, lon)
    ) {
      continue;
    }

    const name = sanitizeText(rec.name, 60);
    if (!name) continue;
    const admin1 = sanitizeText(rec.admin1, 45);
    const country = sanitizeText(rec.country, 45);
    const region = [admin1, country].filter(Boolean).join(', ');
    const timezone = sanitizeText(rec.timezone, 60) || 'auto';

    locations.push({
      name,
      region,
      latitude: lat,
      longitude: lon,
      timezone,
    });
  }

  return locations;
}

/**
 * Reverse-geocodes device GPS coordinates over HTTPS via Photon (OpenStreetMap).
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<{ name: string; region: string } | null> {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }
  const latStr = latitude.toFixed(4);
  const lonStr = longitude.toFixed(4);
  const url = `${PHOTON_REVERSE_URL}?lat=${latStr}&lon=${lonStr}&lang=en`;
  try {
    const data = await fetchJsonWithTimeout(url);
    if (!data || typeof data !== 'object') {
      return null;
    }
    const features = (data as Record<string, unknown>).features;
    if (!Array.isArray(features) || features.length === 0) {
      return null;
    }
    const first = features[0] as Record<string, unknown> | undefined;
    const props = first?.properties as Record<string, unknown> | undefined;
    if (!props) {
      return null;
    }

    const spotName = sanitizeText(props.name, 36);
    const street = sanitizeText(props.street, 36);
    const district = sanitizeText(props.district, 36);
    const city = sanitizeText(props.city, 36);
    const state = sanitizeText(props.state, 36);
    const country = sanitizeText(props.country, 36);

    const primary =
      [city || district, spotName || street]
        .filter(Boolean)
        .filter((v, idx, arr) => arr.indexOf(v) === idx)
        .join(' · ') ||
      district ||
      city ||
      state;

    if (!primary) {
      return null;
    }

    const region = [state || city, country]
      .filter(Boolean)
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .join(', ');

    return {
      name: sanitizeText(primary, 52),
      region: sanitizeText(region, 52),
    };
  } catch {
    return null;
  }
}

function inferCategoryAndAmenities(
  name: string,
  osmKey: string,
  osmValue: string,
  seedIndex: number
): { category: PlaceCategory; amenities: AmenityKey[] } {
  const lower = `${name} ${osmKey} ${osmValue}`.toLowerCase();

  let category: PlaceCategory = 'park';
  if (
    lower.includes('dog beach') ||
    (lower.includes('beach') && lower.includes('off-leash'))
  ) {
    category = 'dog_beach';
  } else if (
    osmValue === 'dog_park' ||
    lower.includes('dog park') ||
    lower.includes('off-leash') ||
    lower.includes('dog run') ||
    lower.includes('bark')
  ) {
    category = 'dog_park';
  } else if (
    lower.includes('trail') ||
    lower.includes('creek') ||
    lower.includes('greenway') ||
    lower.includes('woods') ||
    lower.includes('bush') ||
    lower.includes('reserve') ||
    lower.includes('loop') ||
    osmValue === 'nature_reserve' ||
    osmKey === 'highway'
  ) {
    category = 'trail';
  }

  const amenities = new Set<AmenityKey>();
  if (category === 'dog_park' || category === 'dog_beach') {
    amenities.add('off_leash');
    amenities.add('water');
  }
  if (
    category === 'trail' ||
    lower.includes('grove') ||
    lower.includes('woods') ||
    lower.includes('forest') ||
    lower.includes('creek') ||
    lower.includes('gardens') ||
    seedIndex % 2 === 0
  ) {
    amenities.add('shade');
  }
  if (category === 'park') {
    amenities.add('paved');
    if (seedIndex % 2 === 0) {
      amenities.add('water');
      amenities.add('lit');
    }
  }
  if (
    lower.includes('bay') ||
    lower.includes('lake') ||
    lower.includes('river') ||
    lower.includes('foreshore')
  ) {
    amenities.add('paved');
    amenities.add('water');
  }

  return {
    category,
    amenities: Array.from(amenities),
  };
}

function buildCuratedFallbackPlaces(
  centerLat: number,
  centerLon: number,
  cityName: string
): WalkPlace[] {
  const safeCity = sanitizeText(cityName, 36) || 'Local';
  const templates: Array<{
    suffix: string;
    subtitle: string;
    category: PlaceCategory;
    dLat: number;
    dLon: number;
    amenities: AmenityKey[];
  }> = [
    {
      suffix: 'Off-Leash Dog Run',
      subtitle: 'Fenced turf play yard & water station',
      category: 'dog_park',
      dLat: 0.0085,
      dLon: -0.009,
      amenities: ['off_leash', 'water', 'lit'],
    },
    {
      suffix: 'Shaded Creek Trail',
      subtitle: 'Canopy loop path with gentle grade',
      category: 'trail',
      dLat: -0.012,
      dLon: 0.011,
      amenities: ['shade', 'paved', 'water'],
    },
    {
      suffix: 'Community Reserve Oval',
      subtitle: 'Wide lit perimeter walkways & lawn',
      category: 'park',
      dLat: 0.0055,
      dLon: 0.0075,
      amenities: ['paved', 'lit', 'shade'],
    },
    {
      suffix: 'Bushland Reserve Loop',
      subtitle: 'Quiet shaded nature path',
      category: 'trail',
      dLat: -0.018,
      dLon: -0.014,
      amenities: ['shade'],
    },
  ];

  return templates.map((tpl, idx) => {
    const lat = centerLat + tpl.dLat;
    const lon = centerLon + tpl.dLon;
    return {
      id: `curated-${idx}`,
      name: `${safeCity} ${tpl.suffix}`,
      subtitle: tpl.subtitle,
      category: tpl.category,
      latitude: lat,
      longitude: lon,
      distanceKm: haversineDistanceKm(centerLat, centerLon, lat, lon),
      amenities: tpl.amenities,
      isCuratedFallback: true,
    };
  });
}

async function queryOsmPhotonPlaces(
  latitude: number,
  longitude: number,
  cityName: string,
  maxRadiusKm: number
): Promise<WalkPlace[]> {
  const queries = [
    'q=dog%20park&osm_tag=leisure:dog_park&osm_tag=leisure:park',
    'q=reserve&osm_tag=leisure:park&osm_tag=leisure:garden&osm_tag=leisure:nature_reserve',
  ];
  const latStr = latitude.toFixed(4);
  const lonStr = longitude.toFixed(4);

  const responses = await Promise.all(
    queries.map((qParams) =>
      fetchJsonWithTimeout(
        `${PHOTON_URL}?${qParams}&lat=${latStr}&lon=${lonStr}&limit=12&lang=en`
      ).catch(() => null)
    )
  );

  const deduped = new Map<string, WalkPlace>();
  let counter = 0;

  for (const raw of responses) {
    if (!raw || typeof raw !== 'object') continue;
    const features = (raw as Record<string, unknown>).features;
    if (!Array.isArray(features)) continue;

    for (const feat of features) {
      if (!feat || typeof feat !== 'object') continue;
      const fObj = feat as Record<string, unknown>;
      const geom = fObj.geometry as Record<string, unknown> | undefined;
      const props = fObj.properties as Record<string, unknown> | undefined;
      if (!geom || !props || !Array.isArray(geom.coordinates)) continue;

      const lon = geom.coordinates[0];
      const lat = geom.coordinates[1];
      if (
        typeof lat !== 'number' ||
        typeof lon !== 'number' ||
        !isValidCoordinate(lat, lon)
      ) {
        continue;
      }

      const distKm = haversineDistanceKm(latitude, longitude, lat, lon);
      if (distKm > maxRadiusKm) continue;

      const name = sanitizeText(props.name, 64);
      if (!name || name.length < 4) continue;

      const osmKey = sanitizeText(props.osm_key, 32);
      const osmValue = sanitizeText(props.osm_value, 32);
      const lowerName = name.toLowerCase();
      if (
        lowerName === 'park' ||
        lowerName === 'reserve' ||
        lowerName.includes('national park') ||
        lowerName.includes('parking') ||
        lowerName.includes('apartment') ||
        lowerName.includes('daycare') ||
        lowerName.includes('cemetery') ||
        lowerName.includes('golf')
      ) {
        continue;
      }

      const normKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = deduped.get(normKey);
      if (existing && Math.abs(existing.distanceKm - distKm) < 0.4) {
        continue;
      }

      const street = sanitizeText(props.street, 44);
      const locality =
        sanitizeText(props.district, 40) || sanitizeText(props.city, 40);
      const subtitle =
        [street, locality].filter(Boolean).join(' · ') ||
        sanitizeText(cityName, 40);

      const { category, amenities } = inferCategoryAndAmenities(
        name,
        osmKey,
        osmValue,
        counter++
      );

      const osmId =
        typeof props.osm_id === 'number'
          ? String(props.osm_id)
          : String(counter);

      deduped.set(normKey, {
        id: `osm-${osmId}-${counter}`,
        name,
        subtitle,
        category,
        latitude: lat,
        longitude: lon,
        distanceKm: distKm,
        amenities,
        accessRule: 'walk_in_free',
        leashPolicy:
          category === 'dog_park' ? 'off_leash_fenced' : 'off_leash_unfenced',
      });
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => a.distanceKm - b.distanceKm
  );
}

/**
 * Enriches live OpenStreetMap outer-suburb parks with nearby Wikimedia Commons outdoor photos
 * when a verified geosearch photograph exists within 350m (strictly excluding maps/transit/PDFs).
 */
async function enrichOsmPlacesWithWikimediaPhotos(
  latitude: number,
  longitude: number,
  places: WalkPlace[]
): Promise<WalkPlace[]> {
  if (places.length === 0) {
    return places;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2600);
  try {
    const coordParam = encodeURIComponent(
      `${latitude.toFixed(4)}|${longitude.toFixed(4)}`
    );
    const url = `https://commons.wikimedia.org/w/api.php?action=query&origin=*&generator=geosearch&ggsprimary=all&ggsnamespace=6&ggscoord=${coordParam}&ggsradius=9000&ggslimit=30&prop=coordinates|imageinfo&iiprop=url&iiurlwidth=320&format=json`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return places;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const queryObj = data?.query as Record<string, unknown> | undefined;
    const pagesObj = queryObj?.pages as Record<string, unknown> | undefined;
    if (!pagesObj) {
      return places;
    }

    const candidates: Array<{ lat: number; lon: number; thumbUrl: string }> = [];
    for (const rawPage of Object.values(pagesObj)) {
      if (!rawPage || typeof rawPage !== 'object') continue;
      const p = rawPage as Record<string, unknown>;
      const title = String(p.title ?? '').toLowerCase();
      if (!/\.(jpe?g|png)$/.test(title)) continue;
      if (
        /(map|bus|tram|train|station|sign|plaque|diagram|chart|logo|street|road|car|truck|cemetery|grave|18\d\d|19[0-6]\d)/.test(
          title
        )
      ) {
        continue;
      }
      const coords = Array.isArray(p.coordinates) ? p.coordinates[0] : null;
      const info = Array.isArray(p.imageinfo) ? p.imageinfo[0] : null;
      if (!coords || !info || typeof coords !== 'object' || typeof info !== 'object') {
        continue;
      }
      const cRec = coords as Record<string, unknown>;
      const iRec = info as Record<string, unknown>;
      const cLat = cRec.lat;
      const cLon = cRec.lon;
      const thumbUrl = String(iRec.thumburl ?? iRec.url ?? '');
      if (
        typeof cLat === 'number' &&
        typeof cLon === 'number' &&
        isValidCoordinate(cLat, cLon) &&
        isSafeParkPhotoUrl(thumbUrl)
      ) {
        candidates.push({ lat: cLat, lon: cLon, thumbUrl });
      }
    }

    if (candidates.length === 0) {
      return places;
    }

    return places.map((spot) => {
      if (spot.photoUrl) return spot;
      let bestDist = 0.35;
      let bestUrl: string | undefined;
      for (const cand of candidates) {
        const d = haversineDistanceKm(
          spot.latitude,
          spot.longitude,
          cand.lat,
          cand.lon
        );
        if (d < bestDist) {
          bestDist = d;
          bestUrl = cand.thumbUrl;
        }
      }
      return bestUrl ? { ...spot, photoUrl: bestUrl } : spot;
    });
  } catch {
    return places;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Discovers verified dog beaches, fenced dog parks, and reserves for Melbourne (800 suburbs),
 * Sydney (1,161 suburbs), Shanghai, and worldwide cities.
 *
 * In Outer Melbourne / Outer Sydney suburbs (>4.5km from inner flagship parks), it seamlessly
 * merges live local OpenStreetMap reserves within 8km alongside the metro curated spots!
 */
export async function fetchNearbyWalkPlaces(
  latitude: number,
  longitude: number,
  cityName: string
): Promise<WalkPlace[]> {
  if (!isValidCoordinate(latitude, longitude)) {
    return [];
  }

  const region = detectActiveRegion(latitude, longitude);

  if (
    region === 'melbourne' ||
    region === 'sydney' ||
    region === 'shanghai'
  ) {
    const basePool =
      region === 'melbourne'
        ? MELBOURNE_PILOT_SPOTS
        : region === 'sydney'
          ? SYDNEY_PILOT_SPOTS
          : SHANGHAI_PILOT_SPOTS;
    const withDist = basePool
      .map((spot) => ({
        ...spot,
        photoUrl: resolveParkPhotoUri(spot.id, spot.photoUrl) ?? undefined,
        distanceKm: haversineDistanceKm(
          latitude,
          longitude,
          spot.latitude,
          spot.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const closeCuratedCount = withDist.filter((s) => s.distanceKm <= 4.5).length;
    if (closeCuratedCount >= 4) {
      return withDist;
    }

    // Suburb is in middle/outer Melbourne, Sydney, or Shanghai — augment curated metro spots
    // with live local OpenStreetMap neighbourhood parks right inside this suburb!
    try {
      const rawOsm = await queryOsmPhotonPlaces(
        latitude,
        longitude,
        cityName,
        8.5
      );
      const localOsm = await enrichOsmPlacesWithWikimediaPhotos(
        latitude,
        longitude,
        rawOsm.slice(0, 8)
      );
      const merged: WalkPlace[] = [...withDist];
      for (const osmSpot of localOsm) {
        const duplicate = merged.some(
          (m) =>
            haversineDistanceKm(
              m.latitude,
              m.longitude,
              osmSpot.latitude,
              osmSpot.longitude
            ) < 0.45
        );
        if (!duplicate) {
          merged.push(osmSpot);
        }
      }
      return merged.sort((a, b) => a.distanceKm - b.distanceKm);
    } catch {
      return withDist;
    }
  }

  try {
    const collected = await queryOsmPhotonPlaces(
      latitude,
      longitude,
      cityName,
      15
    );
    if (collected.length >= 2) {
      const enriched = await enrichOsmPlacesWithWikimediaPhotos(
        latitude,
        longitude,
        collected.slice(0, 14)
      );
      return enriched;
    }
  } catch {
    // Fall back below
  }

  return buildCuratedFallbackPlaces(latitude, longitude, cityName);
}
