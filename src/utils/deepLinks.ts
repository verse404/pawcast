import { Platform } from 'react-native';
import {
  MELBOURNE_PILOT_SPOTS,
  SYDNEY_PILOT_SPOTS,
} from '../constants/auPresets';
import {
  getAuSuburbsForCity,
  suburbToLocationPoint,
} from '../constants/auSuburbs';
import { PRESET_LOCATIONS, SHANGHAI_PILOT_SPOTS } from '../constants/presets';
import { LocationPoint } from '../types/walk';

const SAFE_SLUG_RE = /^[a-z0-9-]{2,56}$/;

export interface ResolvedDeepLink {
  location: LocationPoint;
  focusSpotId?: string;
}

/**
 * Resolves a validated allow-listed URL hash/query deep link (`#spot=<id>`,
 * `#suburb=<id>`, or `#city=melbourne|sydney|shanghai`) strictly against built-in
 * curated catalogs. Untrusted strings are never reflected into UI or network requests.
 */
export function parseDeepLinkParams(
  rawHashOrQuery: string
): ResolvedDeepLink | null {
  if (!rawHashOrQuery || typeof rawHashOrQuery !== 'string') {
    return null;
  }
  const cleaned = rawHashOrQuery.replace(/^[#?]+/, '').trim();
  if (!cleaned || cleaned.length > 160) {
    return null;
  }

  let spotSlug = '';
  let suburbSlug = '';
  let citySlug = '';

  const pairs = cleaned.split('&');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = pair.slice(0, eqIdx).trim().toLowerCase();
    const rawVal = pair.slice(eqIdx + 1).trim().toLowerCase();
    if (!SAFE_SLUG_RE.test(rawVal)) continue;
    if (key === 'spot') spotSlug = rawVal;
    else if (key === 'suburb') suburbSlug = rawVal;
    else if (key === 'city') citySlug = rawVal;
  }

  if (spotSlug) {
    const mel = MELBOURNE_PILOT_SPOTS.find((s) => s.id === spotSlug);
    if (mel) {
      return {
        location: {
          name: `Melbourne · ${mel.name.split(' · ')[0]}`,
          region: mel.district || mel.subtitle,
          latitude: mel.latitude,
          longitude: mel.longitude,
          timezone: 'Australia/Melbourne',
        },
        focusSpotId: mel.id,
      };
    }
    const syd = SYDNEY_PILOT_SPOTS.find((s) => s.id === spotSlug);
    if (syd) {
      return {
        location: {
          name: `Sydney · ${syd.name.split(' · ')[0]}`,
          region: syd.district || syd.subtitle,
          latitude: syd.latitude,
          longitude: syd.longitude,
          timezone: 'Australia/Sydney',
        },
        focusSpotId: syd.id,
      };
    }
    const sh = SHANGHAI_PILOT_SPOTS.find((s) => s.id === spotSlug);
    if (sh) {
      return {
        location: {
          name: `Shanghai · ${sh.name.split(' · ')[0]}`,
          region: sh.district || sh.subtitle,
          latitude: sh.latitude,
          longitude: sh.longitude,
          timezone: 'Asia/Shanghai',
        },
        focusSpotId: sh.id,
      };
    }
  }

  if (suburbSlug) {
    const allSuburbs = [
      ...getAuSuburbsForCity('melbourne'),
      ...getAuSuburbsForCity('sydney'),
      ...getAuSuburbsForCity('shanghai'),
    ];
    const matched = allSuburbs.find((s) => s.id.toLowerCase() === suburbSlug);
    if (matched) {
      return { location: suburbToLocationPoint(matched) };
    }
  }

  if (citySlug === 'melbourne') {
    return { location: PRESET_LOCATIONS[0] };
  }
  if (citySlug === 'sydney') {
    return { location: PRESET_LOCATIONS[2] };
  }
  if (citySlug === 'shanghai') {
    const xuhui = getAuSuburbsForCity('shanghai')[0];
    if (xuhui) {
      return { location: suburbToLocationPoint(xuhui) };
    }
  }

  return null;
}

/**
 * Reads the initial deep link on Web (`window.location.hash` or `search`).
 */
export function readInitialWebDeepLink(): ResolvedDeepLink | null {
  if (Platform.OS !== 'web') return null;
  const loc = (
    globalThis as { location?: { hash?: string; search?: string } }
  ).location;
  if (!loc) return null;
  return (
    parseDeepLinkParams(loc.hash || '') || parseDeepLinkParams(loc.search || '')
  );
}

/**
 * Builds a clean, allow-listed shareable web URL for a curated park ID.
 */
export function buildShareableSpotUrl(spotId: string): string | null {
  if (Platform.OS !== 'web' || !SAFE_SLUG_RE.test(spotId)) {
    return null;
  }
  const loc = (
    globalThis as {
      location?: { origin?: string; pathname?: string; protocol?: string };
    }
  ).location;
  if (
    !loc?.origin ||
    (loc.protocol !== 'https:' && loc.protocol !== 'http:')
  ) {
    return null;
  }
  const rawPath = loc.pathname || '/';
  const safePath = /^\/[a-zA-Z0-9._/-]*$/.test(rawPath) ? rawPath : '/';
  return `${loc.origin}${safePath}#spot=${spotId}`;
}
