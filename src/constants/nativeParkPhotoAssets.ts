import { ImageSourcePropType } from 'react-native';

/**
 * Web fallback stub for `nativeParkPhotoAssets`.
 * On Web, curated thumbnails load lazily as static `/park-thumbs/<id>.jpg` files
 * so the JavaScript bundle stays compact. On iOS and Android, Metro automatically
 * resolves `nativeParkPhotoAssets.native.ts` to bundle all 90 JPEGs offline.
 */
export const NATIVE_PARK_PHOTO_ASSETS: Readonly<
  Record<string, ImageSourcePropType>
> = {};
