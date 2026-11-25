import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import {
  detectSafeImageMimeFromBytes,
  MAX_AVATAR_UPLOAD_BYTES,
  sanitizeAvatarDataUri,
} from './validation';

/**
 * Security notes on client-side profile photo handling:
 * - Only JPEG, PNG, and WebP raster images <= 5 MB are accepted (verified by
 *   magic bytes on Web and OS media-type filtering + base64 validation on Native).
 * - SVG/XML formats are strictly excluded to prevent embedded script / XXE risks.
 * - On Web, images are decoded and re-encoded through a 256x256 offscreen canvas
 *   (Content Disarm & Reconstruction) to strip EXIF GPS metadata and ancillary chunks.
 * - TODO(security): If photos are ever uploaded to a remote server in the future,
 *   store them outside the web root with random UUID filenames, `X-Content-Type-Options: nosniff`,
 *   CSRF protection, and server-side malware/CDR scanning.
 */

export type DogPhotoPickResult =
  | { status: 'picked'; dataUri: string; baseCropUri: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const TARGET_AVATAR_PX = 256;

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

function renderCroppedSquareOnWeb(
  imageSrc: string,
  zoomFactor = 1,
  outputSize = TARGET_AVATAR_PX
): Promise<string | null> {
  const g = globalThis as unknown as WebDomGlobal;
  const doc = g.document;
  const ImageCtor = g.Image;
  if (!doc || !ImageCtor) {
    return Promise.resolve(null);
  }

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
        const clampedZoom = Math.max(1, Math.min(2.4, zoomFactor));
        const side = Math.min(w, h) / clampedZoom;
        const sx = (w - side) / 2;
        const sy = (h - side) / 2;

        const canvas = doc.createElement('canvas') as {
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
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FAF8F3';
        ctx.fillRect(0, 0, outputSize, outputSize);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, outputSize, outputSize);

        const rawDataUri = canvas.toDataURL('image/jpeg', 0.86);
        resolve(sanitizeAvatarDataUri(rawDataUri));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

/**
 * Re-crops an already-validated base portrait Data URI on Web at a chosen zoom factor (`1.0`..`2.0`).
 */
export async function recropWebDogPhoto(
  baseDataUri: string,
  zoomFactor: number
): Promise<string | null> {
  const safeBase = sanitizeAvatarDataUri(baseDataUri);
  if (!safeBase || Platform.OS !== 'web') {
    return safeBase;
  }
  return renderCroppedSquareOnWeb(safeBase, zoomFactor, TARGET_AVATAR_PX);
}

async function pickWebDogPhoto(useCamera: boolean): Promise<DogPhotoPickResult> {
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
        // Ignore already-removed node
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
      if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
        resolve({
          status: 'error',
          message: 'Please choose an image under 5 MB.',
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

        const safeBlob = new BlobCtor([bytes], { type: verifiedMime });
        objectUrl = urlApi.createObjectURL(safeBlob);
        const baseCrop = await renderCroppedSquareOnWeb(objectUrl, 1.0, 320);
        const avatarUri = await renderCroppedSquareOnWeb(
          objectUrl,
          1.0,
          TARGET_AVATAR_PX
        );
        if (!avatarUri) {
          resolve({
            status: 'error',
            message: 'Could not decode that image. Try another photo.',
          });
          return;
        }
        resolve({
          status: 'picked',
          dataUri: avatarUri,
          baseCropUri: baseCrop || avatarUri,
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

/**
 * Opens the device photo library or camera across iOS, Android, and Web,
 * validates format & size, crops to a 1:1 square, and returns a clean Data URI.
 */
export async function pickDogProfilePhoto(
  source: 'library' | 'camera' = 'library'
): Promise<DogPhotoPickResult> {
  if (Platform.OS === 'web') {
    return pickWebDogPhoto(source === 'camera');
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
            ? 'Camera permission is needed to snap a pup photo.'
            : 'Photo library permission is needed to choose a pup photo.',
      };
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.[0]) {
      return { status: 'cancelled' };
    }

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_UPLOAD_BYTES) {
      return {
        status: 'error',
        message: 'Please choose an image under 5 MB.',
      };
    }

    const rawMime =
      asset.mimeType === 'image/png'
        ? 'image/png'
        : asset.mimeType === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

    if (!asset.base64) {
      return {
        status: 'error',
        message: 'Could not read image data. Please try another photo.',
      };
    }

    const candidateUri = sanitizeAvatarDataUri(
      `data:${rawMime};base64,${asset.base64}`
    );
    if (!candidateUri) {
      return {
        status: 'error',
        message: 'Selected photo is too large. Try cropping closer.',
      };
    }

    return {
      status: 'picked',
      dataUri: candidateUri,
      baseCropUri: candidateUri,
    };
  } catch {
    return {
      status: 'error',
      message: 'Unable to open photo picker right now.',
    };
  }
}
