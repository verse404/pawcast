import { ForecastBundle, HourlyWeatherPoint } from '../types/walk';
import { clampNumber, isValidCoordinate } from '../utils/validation';

const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const AQI_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const REQUEST_TIMEOUT_MS = 9000;
const FORECAST_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 24;

const forecastCache = new Map<
  string,
  { storedAt: number; data: ForecastBundle }
>();

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses an Open-Meteo `time_format=unixtime` epoch second value safely.
 */
function parseEpochSeconds(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1_000_000_000) {
    return raw * 1000;
  }
  return null;
}

/**
 * Fetches 48-hour live weather + solar radiation + US Air Quality Index over HTTPS
 * for the given coordinates.
 */
export async function fetchWalkForecast(
  latitude: number,
  longitude: number,
  timezone = 'auto',
  forceRefresh = false
): Promise<ForecastBundle> {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error('INVALID_COORDINATES');
  }

  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${timezone || 'auto'}`;
  if (!forceRefresh) {
    const cached = forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.storedAt < FORECAST_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const latParam = latitude.toFixed(4);
  const lonParam = longitude.toFixed(4);
  const tzParam = encodeURIComponent(timezone || 'auto');

  const weatherUrl =
    `${FORECAST_BASE_URL}?latitude=${latParam}&longitude=${lonParam}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,relative_humidity_2m,cloud_cover,shortwave_radiation,is_day` +
    `&daily=sunrise,sunset` +
    `&past_hours=6&forecast_days=2&timeformat=unixtime&timezone=${tzParam}`;

  const aqiUrl =
    `${AQI_BASE_URL}?latitude=${latParam}&longitude=${lonParam}` +
    `&hourly=us_aqi&forecast_days=2&timeformat=unixtime&timezone=${tzParam}`;

  const [weatherRaw, aqiRaw] = await Promise.all([
    fetchJsonWithTimeout(weatherUrl),
    fetchJsonWithTimeout(aqiUrl).catch(() => null),
  ]);

  if (!weatherRaw || typeof weatherRaw !== 'object') {
    throw new Error('INVALID_WEATHER_PAYLOAD');
  }

  const weatherObj = weatherRaw as Record<string, unknown>;
  const hourly = weatherObj.hourly as Record<string, unknown[]> | undefined;
  if (!hourly || !Array.isArray(hourly.time)) {
    throw new Error('MISSING_HOURLY_SERIES');
  }

  // Index AQI by unix timestamp (ms)
  const aqiByEpoch = new Map<number, number>();
  if (aqiRaw && typeof aqiRaw === 'object') {
    const aqiHourly = (aqiRaw as Record<string, unknown>).hourly as
      | Record<string, unknown[]>
      | undefined;
    if (aqiHourly && Array.isArray(aqiHourly.time) && Array.isArray(aqiHourly.us_aqi)) {
      for (let i = 0; i < aqiHourly.time.length; i++) {
        const tMs = parseEpochSeconds(aqiHourly.time[i]);
        const val = aqiHourly.us_aqi[i];
        if (tMs !== null && typeof val === 'number' && Number.isFinite(val)) {
          aqiByEpoch.set(tMs, Math.round(clampNumber(val, 0, 500, 0)));
        }
      }
    }
  }

  const nowMs = Date.now();
  const currentHourFloorMs = nowMs - (nowMs % (60 * 60 * 1000));
  const allParsed: HourlyWeatherPoint[] = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const epochMs = parseEpochSeconds(hourly.time[i]);
    if (epochMs === null) {
      continue;
    }

    const tempC = clampNumber(hourly.temperature_2m?.[i], -55, 60, 18);
    const feelsLikeC = clampNumber(hourly.apparent_temperature?.[i], -65, 65, tempC);
    const precipProb = clampNumber(hourly.precipitation_probability?.[i], 0, 100, 0);
    const precipMm = clampNumber(hourly.precipitation?.[i], 0, 200, 0);
    const weatherCode = clampNumber(hourly.weather_code?.[i], 0, 99, 0);
    const windKph = clampNumber(hourly.wind_speed_10m?.[i], 0, 200, 8);
    const uvIndex = clampNumber(hourly.uv_index?.[i], 0, 16, 0);
    const humidity = clampNumber(hourly.relative_humidity_2m?.[i], 0, 100, 50);
    const cloudCover = clampNumber(hourly.cloud_cover?.[i], 0, 100, 25);
    const solarRadiationWm2 = clampNumber(
      hourly.shortwave_radiation?.[i],
      0,
      1300,
      0
    );
    const isDay = hourly.is_day?.[i] === 1;

    allParsed.push({
      isoTime: new Date(epochMs).toISOString(),
      epochMs,
      tempC,
      feelsLikeC,
      precipProb,
      precipMm,
      weatherCode,
      windKph,
      uvIndex,
      humidity,
      cloudCover,
      solarRadiationWm2,
      isDay,
      usAqi: aqiByEpoch.get(epochMs) ?? null,
    });
  }

  // Compute trailing 5-hour accumulated moisture (with solar evaporation decay) for post-rain wet grass check
  const points: HourlyWeatherPoint[] = [];
  for (let idx = 0; idx < allParsed.length; idx++) {
    const curr = allParsed[idx];
    if (curr.epochMs < currentHourFloorMs - 30 * 60 * 1000) {
      continue;
    }

    let trailingRainMm = 0;
    for (let back = Math.max(0, idx - 5); back < idx; back++) {
      const prev = allParsed[back];
      const recencyWeight = 1 - (idx - back - 1) * 0.14; // 1.0, 0.86, 0.72, 0.58, 0.44
      const rainContribution =
        prev.precipMm > 0
          ? prev.precipMm
          : prev.precipProb >= 65 || (prev.weatherCode >= 51 && prev.weatherCode <= 82)
            ? 0.45
            : 0;
      trailingRainMm += rainContribution * recencyWeight;

      // Strong warm sunshine evaporates turf moisture faster
      if (prev.isDay && prev.solarRadiationWm2 >= 300 && prev.precipMm === 0) {
        trailingRainMm = Math.max(0, trailingRainMm - 0.35);
      }
    }

    points.push({
      ...curr,
      trailingRainMm: Math.round(trailingRainMm * 100) / 100,
    });

    if (points.length >= 28) {
      break;
    }
  }

  if (points.length === 0) {
    throw new Error('EMPTY_FORECAST_WINDOW');
  }

  let sunriseEpochMs: number | null = null;
  let sunsetEpochMs: number | null = null;
  const daily = weatherObj.daily as Record<string, unknown[]> | undefined;
  if (daily) {
    if (Array.isArray(daily.sunrise) && daily.sunrise.length > 0) {
      sunriseEpochMs = parseEpochSeconds(daily.sunrise[0]);
    }
    if (Array.isArray(daily.sunset) && daily.sunset.length > 0) {
      // Pick the next upcoming sunset if today's already passed
      const todaySunset = parseEpochSeconds(daily.sunset[0]);
      const tomorrowSunset =
        daily.sunset.length > 1 ? parseEpochSeconds(daily.sunset[1]) : null;
      sunsetEpochMs =
        todaySunset !== null && todaySunset > nowMs - 60 * 60 * 1000
          ? todaySunset
          : tomorrowSunset ?? todaySunset;
    }
  }

  const bundle: ForecastBundle = {
    hours: points,
    sunriseEpochMs,
    sunsetEpochMs,
    fetchedAtEpochMs: nowMs,
  };

  if (forecastCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = forecastCache.keys().next().value;
    if (oldestKey) {
      forecastCache.delete(oldestKey);
    }
  }
  forecastCache.set(cacheKey, { storedAt: nowMs, data: bundle });

  return bundle;
}
