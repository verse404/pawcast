/**
 * Coordinate conversion between WGS-84 (GPS / OpenStreetMap) and GCJ-02
 * (Apple MapKit CN / AutoNavi Gaode / Mainland China street maps).
 */

const KRASOVSKY_A = 6378245.0;
const KRASOVSKY_EE = 0.006693421622965943;

export function isInsideMainlandChina(lat: number, lon: number): boolean {
  return lat >= 18.15 && lat <= 53.55 && lon >= 73.66 && lon <= 135.05;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * Math.PI) +
      40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

function transformLon(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * Math.PI) +
      40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * Converts WGS-84 coordinates to GCJ-02 when inside Mainland China; passes
 * through unchanged outside Mainland China.
 */
export function wgs84ToGcj02(
  lat: number,
  lon: number
): { latitude: number; longitude: number } {
  if (!isInsideMainlandChina(lat, lon)) {
    return { latitude: lat, longitude: lon };
  }
  let dLat = transformLat(lon - 105.0, lat - 35.0);
  let dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - KRASOVSKY_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat =
    (dLat * 180.0) /
    (((KRASOVSKY_A * (1 - KRASOVSKY_EE)) / (magic * sqrtMagic)) * Math.PI);
  dLon =
    (dLon * 180.0) /
    ((KRASOVSKY_A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return {
    latitude: lat + dLat,
    longitude: lon + dLon,
  };
}
