import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import {
  detectSafeImageMimeFromBytes,
  isValidCoordinate,
  sanitizeAvatarDataUri,
  sanitizeIsoDate,
} from './validation';

/**
 * Hardened Photo Memory Picker & Pure-TS Client-Side EXIF GPS Extractor.
 *
 * Security notes:
 * - Accepts ONLY genuine JPEG, PNG, or WebP raster images <= 8 MB verified by
 *   binary magic bytes (strictly rejects SVG/XML/HTML/polyglots).
 * - Parses EXIF GPS & capture date purely in memory with strict buffer bounds
 *   checks (capped IFD counts) so the user can review/override the map pin.
 * - Re-encodes every saved image through offscreen HTML Canvas CDR into two
 *   compact, EXIF-free JPEG Data URIs (`160x160` map thumbnail <= 45 KB and
 *   `max 560px` lightbox photo <= 160 KB).
 */

export const MAX_MEMORY_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_MEMORY_THUMB_URI_LEN = 46_000;
export const MAX_MEMORY_PHOTO_URI_LEN = 165_000;

export interface ExtractedExifMeta {
  latitude: number | null;
  longitude: number | null;
  takenDateIso: string | null;
}

export type PhotoMemoryPickResult =
  | {
      status: 'picked';
      thumbnailUri: string;
      photoUri: string;
      exif: ExtractedExifMeta;
    }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function readU16(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  if (offset < 0 || offset + 2 > bytes.length) return 0;
  return littleEndian
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1];
}

function readU32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  if (offset < 0 || offset + 4 > bytes.length) return 0;
  return littleEndian
    ? (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
        0
    : ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
        0;
}

function readAscii(bytes: Uint8Array, offset: number, maxLen: number): string {
  if (offset < 0 || offset >= bytes.length) return '';
  const end = Math.min(bytes.length, offset + Math.max(0, Math.min(64, maxLen)));
  let out = '';
  for (let i = offset; i < end; i++) {
    const ch = bytes[i];
    if (ch === 0) break;
    if (ch >= 32 && ch <= 126) {
      out += String.fromCharCode(ch);
    }
  }
  return out.trim();
}

function readRational(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean
): number | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  const num = readU32(bytes, offset, littleEndian);
  const den = readU32(bytes, offset + 4, littleEndian);
  if (!den) return null;
  return num / den;
}

function readDmsTriplet(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean
): number | null {
  const deg = readRational(bytes, offset, littleEndian);
  const min = readRational(bytes, offset + 8, littleEndian);
  const sec = readRational(bytes, offset + 16, littleEndian);
  if (deg === null || min === null || sec === null) return null;
  return deg + min / 60 + sec / 3600;
}

function parseExifDateString(raw: string): string | null {
  // Standard EXIF format: "YYYY:MM:DD HH:MM:SS"
  const m = /^(\d{4})[:\-](\d{2})[:\-](\d{2})/.exec(raw.trim());
  if (!m) return null;
  return sanitizeIsoDate(`${m[1]}-${m[2]}-${m[3]}`);
}

/**
 * Safely extracts GPS coordinates and capture date from a raw JPEG byte buffer.
 * Strictly bounds-checked against malformed/hostile EXIF offsets.
 */
export function extractJpegExifMeta(bytes: Uint8Array): ExtractedExifMeta {
  const empty: ExtractedExifMeta = {
    latitude: null,
    longitude: null,
    takenDateIso: null,
  };
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return empty;
  }

  let pos = 2;
  let segmentsScanned = 0;
  while (pos + 4 < bytes.length && segmentsScanned < 64) {
    segmentsScanned += 1;
    if (bytes[pos] !== 0xff) break;
    const marker = bytes[pos + 1];
    // Start of Scan or End of Image -> no more metadata segments
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
    if (segLen < 2 || pos + 2 + segLen > bytes.length) break;

    // APP1 Exif header: "Exif\0\0"
    if (
      marker === 0xe1 &&
      segLen >= 16 &&
      bytes[pos + 4] === 0x45 &&
      bytes[pos + 5] === 0x78 &&
      bytes[pos + 6] === 0x69 &&
      bytes[pos + 7] === 0x66 &&
      bytes[pos + 8] === 0x00 &&
      bytes[pos + 9] === 0x00
    ) {
      const tiffStart = pos + 10;
      const segEnd = pos + 2 + segLen;
      const slice = bytes.subarray(tiffStart, segEnd);
      if (slice.length < 10) break;

      const littleEndian =
        slice[0] === 0x49 && slice[1] === 0x49
          ? true
          : slice[0] === 0x4d && slice[1] === 0x4d
            ? false
            : null;
      if (littleEndian === null) break;
      if (readU16(slice, 2, littleEndian) !== 42) break;

      const ifd0Offset = readU32(slice, 4, littleEndian);
      if (ifd0Offset < 8 || ifd0Offset + 2 > slice.length) break;

      let gpsIfdOffset = 0;
      let exifIfdOffset = 0;
      let takenDateIso: string | null = null;

      const ifd0Count = Math.min(64, readU16(slice, ifd0Offset, littleEndian));
      for (let i = 0; i < ifd0Count; i++) {
        const entryOff = ifd0Offset + 2 + i * 12;
        if (entryOff + 12 > slice.length) break;
        const tag = readU16(slice, entryOff, littleEndian);
        const count = readU32(slice, entryOff + 4, littleEndian);
        const valOff = readU32(slice, entryOff + 8, littleEndian);
        if (tag === 0x8825) {
          gpsIfdOffset = valOff;
        } else if (tag === 0x8769) {
          exifIfdOffset = valOff;
        } else if (tag === 0x0132 && count >= 10 && !takenDateIso) {
          takenDateIso = parseExifDateString(readAscii(slice, valOff, count));
        }
      }

      if (exifIfdOffset >= 8 && exifIfdOffset + 2 <= slice.length) {
        const exifCount = Math.min(
          64,
          readU16(slice, exifIfdOffset, littleEndian)
        );
        for (let i = 0; i < exifCount; i++) {
          const entryOff = exifIfdOffset + 2 + i * 12;
          if (entryOff + 12 > slice.length) break;
          const tag = readU16(slice, entryOff, littleEndian);
          const count = readU32(slice, entryOff + 4, littleEndian);
          const valOff = readU32(slice, entryOff + 8, littleEndian);
          if ((tag === 0x9003 || tag === 0x9004) && count >= 10) {
            const parsed = parseExifDateString(readAscii(slice, valOff, count));
            if (parsed) {
              takenDateIso = parsed;
              break;
            }
          }
        }
      }

      let latRef = '';
      let lonRef = '';
      let latVal: number | null = null;
      let lonVal: number | null = null;

      if (gpsIfdOffset >= 8 && gpsIfdOffset + 2 <= slice.length) {
        const gpsCount = Math.min(
          64,
          readU16(slice, gpsIfdOffset, littleEndian)
        );
        for (let i = 0; i < gpsCount; i++) {
          const entryOff = gpsIfdOffset + 2 + i * 12;
          if (entryOff + 12 > slice.length) break;
          const tag = readU16(slice, entryOff, littleEndian);
          const valOff = readU32(slice, entryOff + 8, littleEndian);
          if (tag === 0x0001) {
            latRef = String.fromCharCode(slice[entryOff + 8] || 0).toUpperCase();
          } else if (tag === 0x0002) {
            latVal = readDmsTriplet(slice, valOff, littleEndian);
          } else if (tag === 0x0003) {
            lonRef = String.fromCharCode(slice[entryOff + 8] || 0).toUpperCase();
          } else if (tag === 0x0004) {
            lonVal = readDmsTriplet(slice, valOff, littleEndian);
          }
        }
      }

      if (latVal !== null && lonVal !== null) {
        const signedLat = latRef === 'S' ? -Math.abs(latVal) : Math.abs(latVal);
        const signedLon = lonRef === 'W' ? -Math.abs(lonVal) : Math.abs(lonVal);
        // Reject Null Island (0, 0) placeholders from uninitialized camera GPS modules
        if (
          isValidCoordinate(signedLat, signedLon) &&
          (Math.abs(signedLat) > 0.001 || Math.abs(signedLon) > 0.001)
        ) {
          return {
            latitude: Math.round(signedLat * 1_000_000) / 1_000_000,
            longitude: Math.round(signedLon * 1_000_000) / 1_000_000,
            takenDateIso,
          };
        }
      }
      return { latitude: null, longitude: null, takenDateIso };
    }

    pos += 2 + segLen;
  }
  return empty;
}

interface WebDomGlobal {
  document?: {
    createElement: (tag: string) => Record<string, unknown>;
    body?: {
      appendChild: (node: unknown) => void;
      removeChild: (node: unknown) => void;
    };
  };
  URL?: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  Image?: new () => {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    naturalWidth: number;
    naturalHeight: number;
    width: number;
    height: number;
    src: string;
  };
  Blob?: new (parts: unknown[], opts?: { type?: string }) => unknown;
}

function renderDualMemoryUrisOnWeb(
  imageSrc: string
): Promise<{ thumbnailUri: string; photoUri: string } | null> {
  const g = globalThis as unknown as WebDomGlobal;
  const doc = g.document;
  const ImageCtor = g.Image;
  if (!doc || !ImageCtor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new ImageCtor();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w < 16 || h < 16) {
          resolve(null);
          return;
        }

        const makeCanvas = (cw: number, ch: number) => {
          const c = doc.createElement('canvas') as {
            width: number;
            height: number;
            getContext: (kind: '2d') => {
              fillStyle: string;
              fillRect: (x: number, y: number, w: number, h: number) => void;
              drawImage: (
                source: unknown,
                sx: number,
                sy: number,
                sw: number,
                sh: number,
                dx: number,
                dy: number,
                dw: number,
                dh: number
              ) => void;
            } | null;
            toDataURL: (mime: string, quality?: number) => string;
          };
          c.width = cw;
          c.height = ch;
          return c;
        };

        // 1. 160x160 center-cropped square map thumbnail
        const side = Math.min(w, h);
        const sx = (w - side) / 2;
        const sy = (h - side) / 2;
        const thumbCanvas = makeCanvas(160, 160);
        const tCtx = thumbCanvas.getContext('2d');
        if (!tCtx) {
          resolve(null);
          return;
        }
        tCtx.fillStyle = '#FAF8F3';
        tCtx.fillRect(0, 0, 160, 160);
        tCtx.drawImage(img, sx, sy, side, side, 0, 0, 160, 160);
        let rawThumb = thumbCanvas.toDataURL('image/jpeg', 0.78);
        if (rawThumb.length > MAX_MEMORY_THUMB_URI_LEN) {
          rawThumb = thumbCanvas.toDataURL('image/jpeg', 0.6);
        }

        // 2. Aspect-preserving full-view photo (max 560px longest edge)
        const maxEdge = 560;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const outW = Math.max(32, Math.round(w * scale));
        const outH = Math.max(32, Math.round(h * scale));
        const photoCanvas = makeCanvas(outW, outH);
        const pCtx = photoCanvas.getContext('2d');
        if (!pCtx) {
          resolve(null);
          return;
        }
        pCtx.fillStyle = '#FAF8F3';
        pCtx.fillRect(0, 0, outW, outH);
        pCtx.drawImage(img, 0, 0, w, h, 0, 0, outW, outH);
        let rawPhoto = photoCanvas.toDataURL('image/jpeg', 0.82);
        if (rawPhoto.length > MAX_MEMORY_PHOTO_URI_LEN) {
          rawPhoto = photoCanvas.toDataURL('image/jpeg', 0.66);
        }
        if (rawPhoto.length > MAX_MEMORY_PHOTO_URI_LEN) {
          rawPhoto = photoCanvas.toDataURL('image/jpeg', 0.5);
        }

        const safeThumb = sanitizeAvatarDataUri(rawThumb, MAX_MEMORY_THUMB_URI_LEN);
        const safePhoto = sanitizeAvatarDataUri(rawPhoto, MAX_MEMORY_PHOTO_URI_LEN);
        if (!safeThumb || !safePhoto) {
          resolve(null);
          return;
        }
        resolve({ thumbnailUri: safeThumb, photoUri: safePhoto });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

async function pickWebMemoryPhoto(
  useCamera: boolean
): Promise<PhotoMemoryPickResult> {
  const g = globalThis as unknown as WebDomGlobal;
  const doc = g.document;
  const urlApi = g.URL;
  const BlobCtor = g.Blob;
  if (!doc || !urlApi || !BlobCtor) {
    return {
      status: 'error',
      message: 'Photo upload is unavailable in this browser.',
    };
  }

  return new Promise((resolve) => {
    const input = doc.createElement('input') as {
      type: string;
      accept: string;
      style: { display: string };
      setAttribute: (k: string, v: string) => void;
      files?: ArrayLike<{
        size: number;
        type: string;
        arrayBuffer: () => Promise<ArrayBuffer>;
      }> | null;
      onchange: (() => void) | null;
      oncancel?: (() => void) | null;
      click: () => void;
    };
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    if (useCamera) {
      input.setAttribute('capture', 'environment');
    }
    input.style.display = 'none';
    doc.body?.appendChild(input);

    let settled = false;
    const cleanup = () => {
      try {
        doc.body?.removeChild(input);
      } catch {
        // Ignore already-removed element
      }
    };

    input.oncancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ status: 'cancelled' });
    };

    input.onchange = async () => {
      if (settled) return;
      settled = true;
      const file = input.files?.[0];
      cleanup();

      if (!file) {
        resolve({ status: 'cancelled' });
        return;
      }
      if (file.size > MAX_MEMORY_UPLOAD_BYTES) {
        resolve({
          status: 'error',
          message: 'Please choose an image under 8 MB.',
        });
        return;
      }

      let objectUrl: string | null = null;
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const verifiedMime = detectSafeImageMimeFromBytes(bytes);
        if (!verifiedMime) {
          resolve({
            status: 'error',
            message: 'Only JPG, PNG, or WebP photos are supported.',
          });
          return;
        }

        // Read optional GPS & date locally before canvas re-encoding strips all EXIF
        const exif =
          verifiedMime === 'image/jpeg'
            ? extractJpegExifMeta(bytes)
            : { latitude: null, longitude: null, takenDateIso: null };

        const safeBlob = new BlobCtor([bytes], { type: verifiedMime });
        objectUrl = urlApi.createObjectURL(safeBlob);
        const rendered = await renderDualMemoryUrisOnWeb(objectUrl);
        if (!rendered) {
          resolve({
            status: 'error',
            message: 'Could not decode that image. Try another photo.',
          });
          return;
        }

        resolve({
          status: 'picked',
          thumbnailUri: rendered.thumbnailUri,
          photoUri: rendered.photoUri,
          exif,
        });
      } catch {
        resolve({
          status: 'error',
          message: 'Could not process the selected photo.',
        });
      } finally {
        if (objectUrl) {
          urlApi.revokeObjectURL(objectUrl);
        }
      }
    };

    input.click();
  });
}

export async function pickWalkMemoryPhoto(
  source: 'library' | 'camera' = 'library'
): Promise<PhotoMemoryPickResult> {
  if (Platform.OS === 'web') {
    return pickWebMemoryPhoto(source === 'camera');
  }

  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return {
        status: 'error',
        message:
          source === 'camera'
            ? 'Camera permission is needed to take a walk photo.'
            : 'Photo library permission is needed to pick a walk photo.',
      };
    }

    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
      exif: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);

    if (result.canceled || !result.assets?.[0]) {
      return { status: 'cancelled' };
    }

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_MEMORY_UPLOAD_BYTES) {
      return {
        status: 'error',
        message: 'Please choose an image under 8 MB.',
      };
    }
    if (!asset.base64) {
      return {
        status: 'error',
        message: 'Could not read photo data. Try another image.',
      };
    }

    const rawMime =
      asset.mimeType === 'image/png'
        ? 'image/png'
        : asset.mimeType === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

    const safePhoto = sanitizeAvatarDataUri(
      `data:${rawMime};base64,${asset.base64}`,
      MAX_MEMORY_PHOTO_URI_LEN
    );
    if (!safePhoto) {
      return {
        status: 'error',
        message: 'Selected photo is too large. Try cropping closer.',
      };
    }

    const rawExif = (asset.exif || {}) as Record<string, unknown>;
    let lat: number | null = null;
    let lon: number | null = null;
    if (
      typeof rawExif.GPSLatitude === 'number' &&
      typeof rawExif.GPSLongitude === 'number'
    ) {
      const signedLat =
        rawExif.GPSLatitudeRef === 'S'
          ? -Math.abs(rawExif.GPSLatitude)
          : rawExif.GPSLatitude;
      const signedLon =
        rawExif.GPSLongitudeRef === 'W'
          ? -Math.abs(rawExif.GPSLongitude)
          : rawExif.GPSLongitude;
      if (isValidCoordinate(signedLat, signedLon)) {
        lat = Math.round(signedLat * 1_000_000) / 1_000_000;
        lon = Math.round(signedLon * 1_000_000) / 1_000_000;
      }
    }
    const rawDate =
      typeof rawExif.DateTimeOriginal === 'string'
        ? rawExif.DateTimeOriginal
        : typeof rawExif.DateTime === 'string'
          ? rawExif.DateTime
          : '';
    const takenDateIso = rawDate ? parseExifDateString(rawDate) : null;

    return {
      status: 'picked',
      thumbnailUri: safePhoto,
      photoUri: safePhoto,
      exif: { latitude: lat, longitude: lon, takenDateIso },
    };
  } catch {
    return {
      status: 'error',
      message: 'Unable to open photo picker right now.',
    };
  }
}
