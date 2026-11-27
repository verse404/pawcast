import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  resolveParkPhotoSource,
  resolveParkPhotoUri,
} from '../constants/parkPhotos';
import { COLORS } from '../theme/colors';
import { PlaceCategory } from '../types/walk';

export type UiIconName =
  | 'paw'
  | 'map'
  | 'park'
  | 'forest'
  | 'route'
  | 'gps'
  | 'pin'
  | 'navigate'
  | 'tune'
  | 'list'
  | 'layers'
  | 'clock'
  | 'sun'
  | 'wind'
  | 'night'
  | 'heart'
  | 'heartOutline'
  | 'close'
  | 'edit'
  | 'camera'
  | 'cafe'
  | 'warning'
  | 'chat'
  | 'walk'
  | 'car'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'thermostat'
  | 'bolt'
  | 'star'
  | 'search'
  | 'water'
  | 'check'
  | 'cloud'
  | 'lock'
  | 'mail'
  | 'signIn';

interface UiIconProps {
  name: UiIconName;
  size?: number;
  color?: string;
}

const ICON_PATHS: Record<Exclude<UiIconName, 'paw' | 'camera'>, string[]> = {
  map: [
    'M14.65 4.98l-5-1.75c-.42-.15-.88-.15-1.3-.01L4.36 4.56C3.55 4.84 3 5.6 3 6.46v11.85c0 1.41 1.41 2.37 2.72 1.86l2.93-1.14c.22-.09.47-.09.69-.01l5 1.75c.42.15.88.15 1.3.01l3.99-1.34c.81-.27 1.36-1.04 1.36-1.9V5.69c0-1.41-1.41-2.37-2.72-1.86l-2.93 1.14c-.22.08-.46.09-.69.01zM15 18.89l-6-2.11V5.11l6 2.11v11.67z',
  ],
  park: [
    'M16.96 12h.08c.81 0 1.28-.91.82-1.57l-5.08-7.25c-.4-.57-1.24-.57-1.64 0L6.1 10.43c-.46.66.02 1.57.83 1.57h.04l-2.9 4.46c-.44.66.04 1.54.84 1.54h5.08v2.02c0 1.09.89 1.98 1.98 1.98 1.09 0 1.98-.89 1.98-1.98V18h5.15c.8 0 1.28-.89.83-1.55L16.96 12z',
  ],
  forest: [
    'M14.14 12h-.06c.81 0 1.28-.91.82-1.57L9.82 3.17c-.4-.57-1.24-.57-1.64 0L3.1 10.43c-.46.66.01 1.57.82 1.57h-.06l-2.87 4.46c-.43.66.05 1.54.84 1.54H7v2c0 1.1.9 2 2 2s2-.9 2-2v-2h5.17c.79 0 1.27-.88.84-1.54L14.14 12z',
    'M23.01 16.46L20.14 12h-.06c.81 0 1.28-.91.82-1.57l-5.08-7.26c-.4-.57-1.24-.57-1.64 0l-1.57 2.24 3.11 4.44c.43.61.48 1.41.14 2.07-.08.16-.18.3-.3.43l2.29 3.57c.4.62.42 1.4.07 2.04l-.03.04h4.28c.79 0 1.27-.88.84-1.54z',
    'M13 20c0 1.1.9 2 2 2s2-.9 2-2v-1h-4v1z',
  ],
  route: [
    'M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.41-2 1.51-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.3-.84-2.4-2-2.82z',
  ],
  gps: [
    'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V2c0-.55-.45-1-1-1s-1 .45-1 1v1.06C6.83 3.52 3.52 6.83 3.06 11H2c-.55 0-1 .45-1 1s.45 1 1 1h1.06c.46 4.17 3.77 7.48 7.94 7.94V22c0 .55.45 1 1 1s1-.45 1-1v-1.06c4.17-.46 7.48-3.77 7.94-7.94H22c.55 0 1-.45 1-1s-.45-1-1-1h-1.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  ],
  pin: [
    'M12 2c-4.2 0-8 3.22-8 8.2 0 3.18 2.45 6.92 7.34 11.23.38.33.95.33 1.33 0C17.55 17.12 20 13.38 20 10.2 20 5.22 16.2 2 12 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  ],
  navigate: [
    'M18.75 3.94L4.07 10.08c-.83.35-.81 1.53.02 1.85L9.43 14c.26.1.47.31.57.57l2.06 5.33c.32.84 1.51.86 1.86.03l6.15-14.67c.33-.83-.5-1.66-1.32-1.32z',
  ],
  tune: [
    'M3 18c0 .55.45 1 1 1h5v-2H4c-.55 0-1 .45-1 1zM3 6c0 .55.45 1 1 1h9V5H4c-.55 0-1 .45-1 1zm10 14v-1h7c.55 0 1-.45 1-1s-.45-1-1-1h-7v-1c0-.55-.45-1-1-1s-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1zM7 10v1H4c-.55 0-1 .45-1 1s.45 1 1 1h3v1c0 .55.45 1 1 1s1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1zm14 2c0-.55-.45-1-1-1h-9v2h9c.55 0 1-.45 1-1zm-5-3c.55 0 1-.45 1-1V7h3c.55 0 1-.45 1-1s-.45-1-1-1h-3V4c0-.55-.45-1-1-1s-1 .45-1 1v4c0 .55.45 1 1 1z',
  ],
  list: [
    'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM8 19h12c.55 0 1-.45 1-1s-.45-1-1-1H8c-.55 0-1 .45-1 1s.45 1 1 1zm0-6h12c.55 0 1-.45 1-1s-.45-1-1-1H8c-.55 0-1 .45-1 1s.45 1 1 1zM7 6c0 .55.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1H8c-.55 0-1 .45-1 1z',
  ],
  layers: [
    'M12.6 18.06c-.36.28-.87.28-1.23 0l-6.15-4.78c-.36-.28-.86-.28-1.22 0-.51.4-.51 1.17 0 1.57l6.76 5.26c.72.56 1.73.56 2.46 0l6.76-5.26c.51-.4.51-1.17 0-1.57l-.01-.01c-.36-.28-.86-.28-1.22 0l-6.15 4.79zm.63-3.02l6.76-5.26c.51-.4.51-1.18 0-1.58l-6.76-5.26c-.72-.56-1.73-.56-2.46 0L4.01 8.21c-.51.4-.51 1.18 0 1.58l6.76 5.26c.72.56 1.74.56 2.46-.01z',
  ],
  clock: [
    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13h-.06c-.4 0-.72.32-.72.72v4.72c0 .35.18.68.49.86l4.15 2.49c.34.2.78.1.98-.24.21-.34.1-.79-.25-.99l-3.87-2.3V7.72c0-.4-.32-.72-.72-.72z',
  ],
  sun: [
    'M6.05 4.14l-.39-.39c-.39-.39-1.02-.38-1.4 0l-.01.01c-.39.39-.39 1.02 0 1.4l.39.39c.39.39 1.01.39 1.4 0l.01-.01c.39-.38.39-1.02 0-1.4zM3.01 10.5H1.99c-.55 0-.99.44-.99.99v.01c0 .55.44.99.99.99H3c.56.01 1-.43 1-.98v-.01c0-.56-.44-1-.99-1zm9-9.95H12c-.56 0-1 .44-1 .99v.96c0 .55.44.99.99.99H12c.56.01 1-.43 1-.98v-.97c0-.55-.44-.99-.99-.99zm7.74 3.21c-.39-.39-1.02-.39-1.41-.01l-.39.39c-.39.39-.39 1.02 0 1.4l.01.01c.39.39 1.02.39 1.4 0l.39-.39c.39-.39.39-1.01 0-1.4zm-1.81 15.1l.39.39c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-.39-.39c-.39-.39-1.02-.38-1.4 0-.4.4-.4 1.02-.01 1.41zM20 11.49v.01c0 .55.44.99.99.99H22c.55 0 .99-.44.99-.99v-.01c0-.55-.44-.99-.99-.99h-1.01c-.55 0-.99.44-.99.99zM12 5.5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-.01 16.95H12c.55 0 .99-.44.99-.99v-.96c0-.55-.44-.99-.99-.99h-.01c-.55 0-.99.44-.99.99v.96c0 .55.44.99.99.99zm-7.74-3.21c.39.39 1.02.39 1.41 0l.39-.39c.39-.39.38-1.02 0-1.4l-.01-.01c-.39-.39-1.02-.39-1.41 0l-.39.39c-.38.4-.38 1.02.01 1.41z',
  ],
  wind: [
    'M14.35 17.95c-.28.89-1.01 1.62-1.9 1.9-1.51.48-2.94-.23-3.59-1.42-.35-.65.17-1.43.91-1.43h.01c.34 0 .68.16.84.46.17.32.5.54.89.54.55 0 1-.45 1-1s-.45-1-1-1H3c-.55 0-1-.45-1-1s.45-1 1-1h8.5c1.96 0 3.5 1.9 2.85 3.95zM18.91 5.67c-.29-1.26-1.32-2.29-2.58-2.58-1.76-.4-3.37.53-4.02 1.98-.31.67.17 1.43.9 1.43.39 0 .75-.22.9-.57.23-.55.76-.93 1.39-.93.83 0 1.5.67 1.5 1.5S16.33 8 15.5 8H3c-.55 0-1 .45-1 1s.45 1 1 1h12.5c2.2 0 3.93-2.04 3.41-4.33zM18.4 11H3c-.55 0-1 .45-1 1s.45 1 1 1h15.5c.83 0 1.5.67 1.5 1.5 0 .63-.38 1.16-.93 1.39-.36.15-.57.51-.57.9 0 .73.76 1.21 1.43.91 1.43-.64 2.35-2.21 2-3.93-.34-1.64-1.86-2.77-3.53-2.77z',
  ],
  night: [
    'M11.1 12.08c-2-3.88-.92-7.36.07-9.27.19-.36-.12-.77-.53-.72C5.62 2.77 1.78 7.16 1.99 12.41l.01.01C2.62 12.15 3.29 12 4 12c1.66 0 3.18.83 4.1 2.15C9.77 14.63 11 16.17 11 18c0 1.52-.87 2.83-2.12 3.51.98.32 2.03.5 3.11.5 3.13 0 5.92-1.44 7.76-3.69.26-.32.04-.79-.37-.82-2.49-.13-6.28-1.53-8.28-5.42z',
    'M7 16h-.18C6.4 14.84 5.3 14 4 14c-1.66 0-3 1.34-3 3s1.34 3 3 3h3c1.1 0 2-.9 2-2s-.9-2-2-2z',
  ],
  heart: [
    'M13.35 20.13c-.76.69-1.93.69-2.69-.01l-.11-.1C5.3 15.27 1.87 12.16 2 8.28c.06-1.7.93-3.33 2.34-4.29 2.64-1.8 5.9-.96 7.66 1.1 1.76-2.06 5.02-2.91 7.66-1.1 1.41.96 2.28 2.59 2.34 4.29.14 3.88-3.3 6.99-8.55 11.76l-.1.09z',
  ],
  heartOutline: [
    'M19.66 3.99c-2.64-1.8-5.9-.96-7.66 1.1-1.76-2.06-5.02-2.91-7.66-1.1-1.4.96-2.28 2.58-2.34 4.29-.14 3.88 3.3 6.99 8.55 11.76l.1.09c.76.69 1.93.69 2.69-.01l.11-.1c5.25-4.76 8.68-7.87 8.55-11.75-.06-1.7-.94-3.32-2.34-4.28zM12.1 18.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  ],
  close: [
    'M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z',
  ],
  edit: [
    'M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  ],
  cafe: [
    'M20 3H6c-1.1 0-2 .9-2 2v8c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM3 21h16c.55 0 1-.45 1-1s-.45-1-1-1H3c-.55 0-1 .45-1 1s.45 1 1 1z',
  ],
  warning: [
    'M12 5.99L19.53 19H4.47L12 5.99M2.74 18c-.77 1.33.19 3 1.73 3h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L2.74 18zM11 11v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zm0 5h2v2h-2z',
  ],
  chat: [
    'M20 4v12H5.17L4 17.17V4h16m0-2H4c-1.1 0-2 .9-2 2v15.59c0 .89 1.08 1.34 1.71.71L6 18h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  ],
  walk: [
    'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7.24 21.81c-.13.61.35 1.19.98 1.19h.08c.47 0 .87-.32.98-.78L10.9 15l2.1 2v5c0 .55.45 1 1 1s1-.45 1-1v-5.64c0-.55-.22-1.07-.62-1.45L12.9 13.5l.6-3c1.07 1.24 2.62 2.13 4.36 2.41.6.09 1.14-.39 1.14-1 0-.49-.36-.9-.85-.98-1.52-.25-2.78-1.15-3.45-2.33l-1-1.6c-.56-.89-1.68-1.25-2.65-.84L7.22 7.78C6.48 8.1 6 8.82 6 9.63V12c0 .55.45 1 1 1s1-.45 1-1V9.6l1.8-.7z',
  ],
  car: [
    'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01l-1.97 5.67c-.07.21-.11.43-.11.66v7.16c0 .83.67 1.5 1.5 1.5S6 20.33 6 19.5V19h12v.5c0 .82.67 1.5 1.5 1.5.82 0 1.5-.67 1.5-1.5v-7.16c0-.22-.04-.45-.11-.66l-1.97-5.67zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.27-3.82c.14-.4.52-.68.95-.68h9.56c.43 0 .81.28.95.68L19 11H5z',
  ],
  chevronRight: [
    'M9.29 6.71c-.39.39-.39 1.02 0 1.41L13.17 12l-3.88 3.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41L10.7 6.7c-.38-.38-1.02-.38-1.41.01z',
  ],
  chevronLeft: [
    'M14.71 6.71c-.39-.39-1.02-.39-1.41 0L8.71 11.3c-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L10.83 12l3.88-3.88c.39-.39.38-1.03 0-1.41z',
  ],
  chevronDown: [
    'M15.88 9.29L12 13.17 8.12 9.29c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41-.39-.38-1.03-.39-1.42 0z',
  ],
  thermostat: [
    'M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-2-2h-2V5c0-.55.45-1 1-1s1 .45 1 1h-.5c-.28 0-.5.22-.5.5s.22.5.5.5h.5v2h-.5c-.28 0-.5.22-.5.5s.22.5.5.5h.5v2z',
  ],
  bolt: [
    'M10.67 21c-.35 0-.62-.31-.57-.66L11 14H7.5c-.88 0-.33-.75-.31-.78 1.26-2.23 3.15-5.53 5.65-9.93.1-.18.3-.29.5-.29.35 0 .62.31.57.66L13.01 10h3.51c.4 0 .62.19.4.66-3.29 5.74-5.2 9.09-5.75 10.05-.1.18-.29.29-.5.29z',
  ],
  star: [
    'M12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72 3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18-1.1 4.72c-.2.86.73 1.54 1.49 1.08L12 17.27z',
  ],
  search: [
    'M15.5 14h-.79l-.28-.27c1.2-1.4 1.82-3.31 1.48-5.34-.47-2.78-2.79-5-5.59-5.34-4.23-.52-7.79 3.04-7.27 7.27.34 2.8 2.56 5.12 5.34 5.59 2.03.34 3.94-.28 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  ],
  water: [
    'M12.66 2.58c-.38-.33-.95-.33-1.33 0C6.45 6.88 4 10.62 4 13.8c0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.18-2.45-6.92-7.34-11.22zM7.83 14c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87z',
  ],
  check: [
    'M9 16.17L5.53 12.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L9 16.17z',
  ],
  cloud: [
    'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
  ],
  lock: [
    'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  ],
  mail: [
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  ],
  signIn: [
    'M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z',
  ],
};

const UiIconComponent: React.FC<UiIconProps> = ({
  name,
  size = 18,
  color = COLORS.textPrimary,
}) => {
  if (name === 'paw') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="4.5" cy="9.5" r="2.4" fill={color} />
        <Circle cx="9" cy="5.5" r="2.4" fill={color} />
        <Circle cx="15" cy="5.5" r="2.4" fill={color} />
        <Circle cx="19.5" cy="9.5" r="2.4" fill={color} />
        <Path
          d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.79.05c-.11.02-.22.05-.33.09-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8z"
          fill={color}
        />
      </Svg>
    );
  }

  if (name === 'camera') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="3" fill={color} />
        <Path
          d="M20 4h-3.17l-1.24-1.35c-.37-.41-.91-.65-1.47-.65H9.88c-.56 0-1.1.24-1.48.65L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
          fill={color}
        />
      </Svg>
    );
  }

  const paths = ICON_PATHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths.map((d, idx) => (
        <Path key={idx} d={d} fill={color} />
      ))}
    </Svg>
  );
};

export const UiIcon = React.memo(UiIconComponent);

interface ParkScenicBadgeProps {
  category: PlaceCategory;
  spotId?: string | null;
  photoUrl?: string | null;
  size?: number;
  rankBadge?: number | null;
}

const ParkScenicBadgeComponent: React.FC<ParkScenicBadgeProps> = ({
  category,
  spotId = null,
  photoUrl = null,
  size = 48,
  rankBadge = null,
}) => {
  const resolvedSource = resolveParkPhotoSource(spotId, photoUrl);
  const resolvedKey = spotId || resolveParkPhotoUri(spotId, photoUrl) || '';
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedKey]);

  const radius = Math.round(size * 0.26);
  const svgRadius = 13;

  if (resolvedSource && !imgFailed) {
    return (
      <View style={[styles.badgeHost, { width: size, height: size }]}>
        <View
          style={[
            styles.photoFrame,
            { width: size, height: size, borderRadius: radius },
          ]}
        >
          <Image
            source={resolvedSource}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setImgFailed(true)}
          />
          <View
            pointerEvents="none"
            style={[styles.photoInnerRing, { borderRadius: radius }]}
          />
        </View>
        {rankBadge === 1 ? (
          <View style={styles.rankCornerPill}>
            <Text style={styles.rankCornerText}>#1</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.badgeHost, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="skyDog" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#D7F3E6" />
            <Stop offset="100%" stopColor="#EFFBF5" />
          </LinearGradient>
          <LinearGradient id="skyPark" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#DCEFFB" />
            <Stop offset="100%" stopColor="#F1F9FE" />
          </LinearGradient>
          <LinearGradient id="skyTrail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E4F0DF" />
            <Stop offset="100%" stopColor="#F6F7EE" />
          </LinearGradient>
          <LinearGradient id="skyBeach" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#CFF0FC" />
            <Stop offset="100%" stopColor="#EAF8FE" />
          </LinearGradient>
        </Defs>

        {category === 'dog_beach' ? (
          <G>
            <Rect width="48" height="48" rx={svgRadius} fill="url(#skyBeach)" />
            <Circle cx="36" cy="12" r="5.5" fill="#F8B93B" />
            {/* Turquoise Bay / Ocean Water */}
            <Path
              d="M0 24 C14 21, 31 27, 48 22 L48 48 L0 48 Z"
              fill="#1CA3C8"
            />
            <Path
              d="M0 30 C16 27, 32 33, 48 28 L48 48 L0 48 Z"
              fill="#38BDF8"
            />
            {/* White Surf Foam Crest */}
            <Path
              d="M0 34 C15 31, 32 37, 48 33"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Warm Golden Beach Sand */}
            <Path
              d="M0 36 C16 33, 33 39, 48 35 L48 48 L0 48 Z"
              fill="#F5D393"
            />
            {/* Sandy Paw Print */}
            <Circle cx="16" cy="42" r="2.5" fill="#9A5B13" opacity="0.85" />
            <Circle cx="13.5" cy="38.5" r="1.1" fill="#9A5B13" opacity="0.85" />
            <Circle cx="16" cy="37.8" r="1.1" fill="#9A5B13" opacity="0.85" />
            <Circle cx="18.5" cy="38.5" r="1.1" fill="#9A5B13" opacity="0.85" />
          </G>
        ) : category === 'dog_park' ? (
          <G>
            <Rect width="48" height="48" rx={svgRadius} fill="url(#skyDog)" />
            <Circle cx="36" cy="12" r="5" fill="#F6BE4F" opacity="0.9" />
            <Path
              d="M0 31 C13 25, 28 27, 48 23 L48 48 L0 48 Z"
              fill="#359A6E"
            />
            <Path
              d="M0 36 C16 32, 33 34, 48 31 L48 48 L0 48 Z"
              fill="#186E4B"
            />
            {/* Fenced Off-Leash Rail Accent */}
            <Line
              x1="9"
              y1="28"
              x2="27"
              y2="28"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.92"
            />
            <Line
              x1="12"
              y1="25"
              x2="12"
              y2="32"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.92"
            />
            <Line
              x1="18"
              y1="25"
              x2="18"
              y2="32"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.92"
            />
            <Line
              x1="24"
              y1="25"
              x2="24"
              y2="32"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.92"
            />
            {/* Playful Paw Mark */}
            <Circle cx="34.5" cy="37.5" r="3" fill="#FFFFFF" opacity="0.95" />
            <Circle cx="31.5" cy="33.5" r="1.3" fill="#FFFFFF" opacity="0.95" />
            <Circle cx="34.5" cy="32.5" r="1.3" fill="#FFFFFF" opacity="0.95" />
            <Circle cx="37.5" cy="33.5" r="1.3" fill="#FFFFFF" opacity="0.95" />
          </G>
        ) : category === 'trail' ? (
          <G>
            <Rect width="48" height="48" rx={svgRadius} fill="url(#skyTrail)" />
            <Path
              d="M0 29 C14 25, 34 25, 48 30 L48 48 L0 48 Z"
              fill="#558C5A"
            />
            <Path
              d="M0 35 C18 33, 30 35, 48 33 L48 48 L0 48 Z"
              fill="#2D6A43"
            />
            {/* Shaded Winding Boulevard Trail */}
            <Path
              d="M19 48 C20 40, 27 36, 25 27 L30 27 C33 36, 27 40, 29 48 Z"
              fill="#F7F2E4"
            />
            {/* Canopy Trees */}
            <Circle cx="13" cy="20" r="7.5" fill="#3B7D4F" />
            <Circle cx="18" cy="17" r="6" fill="#529963" />
            <Rect x="14" y="25" width="2.4" height="7" rx="1" fill="#5D4636" />
            <Circle cx="36" cy="19" r="6.5" fill="#2F6C42" />
            <Rect x="35" y="24" width="2.2" height="6" rx="1" fill="#5D4636" />
          </G>
        ) : (
          <G>
            <Rect width="48" height="48" rx={svgRadius} fill="url(#skyPark)" />
            <Circle cx="35" cy="13" r="5" fill="#F8C146" opacity="0.92" />
            <Path
              d="M0 30 C15 24, 31 28, 48 25 L48 48 L0 48 Z"
              fill="#38986D"
            />
            {/* Waterfront River Ribbon */}
            <Path
              d="M0 38 C14 35, 32 41, 48 36 L48 48 L0 48 Z"
              fill="#4EA3DF"
            />
            <Path
              d="M8 42 Q18 40 28 42"
              stroke="#CBE8FC"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            {/* Botanical Park Trees */}
            <Circle cx="14" cy="21" r="6.8" fill="#1F7550" />
            <Circle cx="21" cy="23" r="5.4" fill="#2E9166" />
            <Rect x="13.2" y="26" width="2.2" height="6" rx="1" fill="#4E3B2E" />
          </G>
        )}
      </Svg>

      {rankBadge === 1 ? (
        <View style={styles.rankCornerPill}>
          <Text style={styles.rankCornerText}>#1</Text>
        </View>
      ) : null}
    </View>
  );
};

export const ParkScenicBadge = React.memo(ParkScenicBadgeComponent);

export type WeatherMood = 'sunny' | 'shaded' | 'rain' | 'night' | 'hot';

export const WeatherAtmosphereArt: React.FC<{ mood: WeatherMood }> = React.memo(
  ({ mood }) => {
    return (
      <View pointerEvents="none" style={styles.atmosphereWrap}>
        <Svg width={154} height={106} viewBox="0 0 154 106">
          {mood === 'rain' ? (
            <G opacity="0.55">
              <Circle cx="108" cy="28" r="18" fill="#BFDBFE" />
              <Circle cx="90" cy="32" r="14" fill="#DBEAFE" />
              <Circle cx="124" cy="33" r="13" fill="#DBEAFE" />
              <Line
                x1="88"
                y1="52"
                x2="83"
                y2="65"
                stroke="#60A5FA"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Line
                x1="104"
                y1="54"
                x2="99"
                y2="69"
                stroke="#60A5FA"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Line
                x1="120"
                y1="52"
                x2="115"
                y2="65"
                stroke="#60A5FA"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </G>
          ) : mood === 'night' ? (
            <G opacity="0.48">
              <Circle cx="118" cy="28" r="24" fill="#A7DFC6" opacity="0.45" />
              <Path
                d="M122 14 C112 16, 108 27, 114 36 C120 44, 131 44, 136 39 C127 42, 118 36, 118 26 C118 20, 120 16, 122 14 Z"
                fill="#166345"
                opacity="0.4"
              />
              <Circle cx="86" cy="20" r="2.2" fill="#166345" opacity="0.45" />
              <Circle cx="98" cy="40" r="1.8" fill="#166345" opacity="0.35" />
              <Circle cx="140" cy="18" r="1.8" fill="#166345" opacity="0.4" />
            </G>
          ) : mood === 'hot' ? (
            <G opacity="0.5">
              <Circle cx="122" cy="22" r="34" fill="#FDE0D9" />
              <Circle cx="122" cy="22" r="20" fill="#FCA5A5" opacity="0.65" />
            </G>
          ) : mood === 'shaded' ? (
            <G opacity="0.6">
              <Circle cx="122" cy="22" r="22" fill="#FDE68A" />
              <Circle cx="102" cy="32" r="15" fill="#FFFBEB" />
              <Circle cx="118" cy="34" r="13" fill="#FFFBEB" />
            </G>
          ) : (
            <G opacity="0.58">
              <Circle cx="124" cy="20" r="34" fill="#BDE8D4" />
              <Circle cx="124" cy="20" r="19" fill="#FDE68A" opacity="0.85" />
            </G>
          )}
        </Svg>
      </View>
    );
  }
);

export const PassportBotanicalBanner: React.FC = React.memo(() => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 400 96" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="passportGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#145A3E" />
          <Stop offset="55%" stopColor="#1B7351" />
          <Stop offset="100%" stopColor="#268762" />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="96" fill="url(#passportGrad)" />
      <Circle cx="354" cy="18" r="46" fill="#FFFFFF" opacity="0.08" />
      <Circle cx="42" cy="84" r="54" fill="#A7F3D0" opacity="0.1" />
      <Path
        d="M0 76 C120 58, 270 92, 400 68 L400 96 L0 96 Z"
        fill="#FFFFFF"
        opacity="0.08"
      />
    </Svg>
  </View>
));

const styles = StyleSheet.create({
  badgeHost: {
    position: 'relative',
    flexShrink: 0,
  },
  photoFrame: {
    overflow: 'hidden',
    backgroundColor: '#E6EFEA',
  },
  photoInnerRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: 'rgba(15, 45, 30, 0.12)',
  },
  rankCornerPill: {
    position: 'absolute',
    top: -4,
    start: -4,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 999,
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  rankCornerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  atmosphereWrap: {
    position: 'absolute',
    top: 0,
    end: 0,
  },
});
