import { UnitSystem } from '../types/walk';

/**
 * Locale-aware number, unit, percentage, and date/time formatters built on
 * standard ECMAScript `Intl` APIs (zero hardcoded unit concatenation or date patterns).
 */

export function celsiusToFahrenheit(tempC: number): number {
  return (tempC * 9) / 5 + 32;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Formats temperature using `Intl.NumberFormat` unit formatting.
 */
export function formatTemperature(
  tempC: number,
  units: UnitSystem,
  locale?: string
): string {
  const value = Math.round(units === 'imperial' ? celsiusToFahrenheit(tempC) : tempC);
  const unit = units === 'imperial' ? 'fahrenheit' : 'celsius';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }
}

/**
 * Formats walking distance in miles or kilometers using `Intl.NumberFormat`.
 */
export function formatDistance(
  distanceKm: number,
  units: UnitSystem,
  locale?: string
): string {
  const raw = units === 'imperial' ? kmToMiles(distanceKm) : distanceKm;
  const unit = units === 'imperial' ? 'mile' : 'kilometer';
  const maximumFractionDigits = raw < 10 ? 1 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits,
      minimumFractionDigits: raw < 10 ? 1 : 0,
    }).format(raw);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(raw);
  }
}

/**
 * Returns true when a spot is within comfortable neighborhood walking distance (< 2.5 km, ~30 min walk).
 */
export function isWalkableSpotDistance(distanceKm: number): boolean {
  return distanceKm < 2.5;
}

/**
 * Formats estimated walking duration in minutes from distance (at ~4.8 km/h brisk walk pace)
 * using `Intl.NumberFormat` unit formatting.
 */
export function formatWalkMinutes(distanceKm: number, locale?: string): string {
  const minutes = Math.max(3, Math.round((distanceKm / 4.8) * 60));
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(minutes);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      minutes
    );
  }
}

/**
 * Formats realistic urban + expressway drive duration in minutes for spots >= 2.5 km away
 * (~24 km/h inner-city first 8 km + ~45 km/h elevated ring/suburban beyond 8 km) via `Intl.NumberFormat`.
 */
export function formatDriveMinutes(distanceKm: number, locale?: string): string {
  const rawMinutes =
    distanceKm <= 8
      ? (distanceKm / 24) * 60 + 4
      : 24 + ((distanceKm - 8) / 45) * 60;
  const minutes = Math.max(8, Math.round(rawMinutes));
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(minutes);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      minutes
    );
  }
}

/**
 * Formats wind speed using `Intl.NumberFormat` unit formatting.
 */
export function formatWindSpeed(
  windKph: number,
  units: UnitSystem,
  locale?: string
): string {
  const value = Math.round(units === 'imperial' ? kmToMiles(windKph) : windKph);
  const unit = units === 'imperial' ? 'mile-per-hour' : 'kilometer-per-hour';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }
}

/**
 * Formats a 0..100 percentage value via `Intl.NumberFormat` percent style.
 */
export function formatPercent(percent0To100: number, locale?: string): string {
  const ratio = Math.max(0, Math.min(100, percent0To100)) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(ratio);
}

/**
 * Formats a plain integer score or index (e.g., Walk Score 0..100, UV, AQI).
 */
export function formatInteger(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Formats an hour chip label (e.g. localized short hour) in the target location's timezone.
 */
export function formatShortHour(
  epochMs: number,
  timezone?: string,
  locale?: string
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      timeZone: timezone || undefined,
    }).format(new Date(epochMs));
  } catch {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
    }).format(new Date(epochMs));
  }
}

/**
 * Formats a localized clock time (e.g. 7:00 AM / 07:00) in the target location's timezone.
 */
export function formatClockTime(
  epochMs: number,
  timezone?: string,
  locale?: string
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
      timeZone: timezone || undefined,
    }).format(new Date(epochMs));
  } catch {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(epochMs));
  }
}

/**
 * Formats a walk window range using `Intl.DateTimeFormat.formatRange` when supported.
 */
export function formatTimeWindow(
  startEpochMs: number,
  endEpochMs: number,
  timezone?: string,
  locale?: string
): string {
  const startDate = new Date(startEpochMs);
  const endDate = new Date(endEpochMs);
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || undefined,
    });
    if (typeof fmt.formatRange === 'function') {
      return fmt.formatRange(startDate, endDate);
    }
    return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
  } catch {
    const fallback = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${fallback.format(startDate)} – ${fallback.format(endDate)}`;
  }
}

/**
 * Formats a day + short time label for tomorrow's forecast slots.
 */
export function formatDayAndTime(
  epochMs: number,
  timezone?: string,
  locale?: string
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || undefined,
    }).format(new Date(epochMs));
  } catch {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      hour: 'numeric',
    }).format(new Date(epochMs));
  }
}

/**
 * Formats a latitude/longitude pair with localized decimals (e.g. 31.22°N, 121.45°E).
 */
export function formatCoordinatePair(
  latitude: number,
  longitude: number,
  locale?: string
): string {
  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const latHem = latitude >= 0 ? 'N' : 'S';
  const lonHem = longitude >= 0 ? 'E' : 'W';
  return `${fmt.format(Math.abs(latitude))}°${latHem}, ${fmt.format(Math.abs(longitude))}°${lonHem}`;
}
