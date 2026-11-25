import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sanitizeAvatarDataUri } from '../utils/validation';

export type AvatarBreedId =
  | 'maltipoo'
  | 'cavoodle'
  | 'golden'
  | 'kelpie'
  | 'staffy'
  | 'poodle'
  | 'corgi'
  | 'frenchie'
  | 'husky'
  | 'shiba';

interface DogAvatarProps {
  breedId: string;
  size?: number;
  customUri?: string | null;
}

interface BreedPalette {
  bg: string;
  furMain: string;
  furSecondary: string;
  ear: string;
  muzzle: string;
  collar: string;
  earStyle: 'maltipoo' | 'floppy' | 'poodle' | 'pointy' | 'bat' | 'husky';
  eyeColor: string;
}

const PALETTES: Record<AvatarBreedId, BreedPalette> = {
  maltipoo: {
    bg: '#DCF2E8',
    furMain: '#FFFFFF',
    furSecondary: '#FAF7F2',
    ear: '#EFEAE0',
    muzzle: '#FFFFFF',
    collar: '#166345',
    earStyle: 'maltipoo',
    eyeColor: '#1E1916',
  },
  cavoodle: {
    bg: '#FDEFD9',
    furMain: '#D4844A',
    furSecondary: '#E7A26E',
    ear: '#B3642E',
    muzzle: '#FFF3E4',
    collar: '#166345',
    earStyle: 'poodle',
    eyeColor: '#2B1E16',
  },
  golden: {
    bg: '#FDECC8',
    furMain: '#E6A145',
    furSecondary: '#F5C478',
    ear: '#C47B24',
    muzzle: '#FFF3DC',
    collar: '#1E6F50',
    earStyle: 'floppy',
    eyeColor: '#2B1E16',
  },
  kelpie: {
    bg: '#E4F2EA',
    furMain: '#6D3924',
    furSecondary: '#D89B5B',
    ear: '#532918',
    muzzle: '#E3AA6E',
    collar: '#D97706',
    earStyle: 'pointy',
    eyeColor: '#2B1E16',
  },
  staffy: {
    bg: '#E6EFF8',
    furMain: '#5E6C7B',
    furSecondary: '#FFFFFF',
    ear: '#45515E',
    muzzle: '#FFFFFF',
    collar: '#0F766E',
    earStyle: 'floppy',
    eyeColor: '#231F20',
  },
  poodle: {
    bg: '#FCE7F3',
    furMain: '#D98B5F',
    furSecondary: '#EDA67E',
    ear: '#BA6D43',
    muzzle: '#F6C5A8',
    collar: '#DB2777',
    earStyle: 'poodle',
    eyeColor: '#2B1E16',
  },
  corgi: {
    bg: '#FEF0D6',
    furMain: '#E58A35',
    furSecondary: '#FFFFFF',
    ear: '#D47420',
    muzzle: '#FFFFFF',
    collar: '#2563EB',
    earStyle: 'pointy',
    eyeColor: '#2B1E16',
  },
  frenchie: {
    bg: '#E8EEFF',
    furMain: '#DDD3C4',
    furSecondary: '#EFE9DF',
    ear: '#5B534B',
    muzzle: '#5B534B',
    collar: '#7C3AED',
    earStyle: 'bat',
    eyeColor: '#231F20',
  },
  husky: {
    bg: '#E0F2FE',
    furMain: '#526071',
    furSecondary: '#FFFFFF',
    ear: '#3B4756',
    muzzle: '#FFFFFF',
    collar: '#0284C7',
    earStyle: 'husky',
    eyeColor: '#38BDF8',
  },
  shiba: {
    bg: '#E6F5EC',
    furMain: '#DF8236',
    furSecondary: '#FFF6E8',
    ear: '#C4681E',
    muzzle: '#FFF6E8',
    collar: '#DC2626',
    earStyle: 'pointy',
    eyeColor: '#2B1E16',
  },
};

export function resolveAvatarBreed(breedId: string): AvatarBreedId {
  if (breedId in PALETTES) {
    return breedId as AvatarBreedId;
  }
  if (breedId === 'senior' || breedId === 'dachshund') {
    return 'shiba';
  }
  return 'maltipoo';
}

/**
 * Illustrated SVG dog portrait with breed-specific ears, markings, shiny eyes,
 * happy pink tongue, and collar tag.
 */
const DogAvatarInner: React.FC<DogAvatarProps> = ({
  breedId,
  size = 96,
  customUri,
}) => {
  const safeCustomUri = sanitizeAvatarDataUri(customUri);
  if (safeCustomUri) {
    return (
      <Image
        source={{ uri: safeCustomUri }}
        accessibilityIgnoresInvertColors
        style={[
          styles.photoAvatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        resizeMode="cover"
      />
    );
  }

  const key = resolveAvatarBreed(breedId);
  const p = PALETTES[key];

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Warm Circular Portrait Backdrop */}
      <Circle cx={60} cy={60} r={57} fill={p.bg} />

      {/* Shoulders / Chest */}
      <Path
        d="M28 108 C32 86, 88 86, 92 108 Z"
        fill={p.furMain}
      />
      <Ellipse cx={60} cy={102} rx={18} ry={12} fill={p.furSecondary} />

      {/* Collar & Gold Tag */}
      <Rect x={39} y={88} width={42} height={8} rx={4} fill={p.collar} />
      <Circle cx={60} cy={98} r={5.5} fill="#FBBF24" stroke="#D97706" strokeWidth={1.5} />

      {/* Breed-Specific Ears (Behind Head) */}
      {p.earStyle === 'floppy' ? (
        <G>
          <Ellipse
            cx={26}
            cy={60}
            rx={13}
            ry={24}
            transform="rotate(14 26 60)"
            fill={p.ear}
          />
          <Ellipse
            cx={94}
            cy={60}
            rx={13}
            ry={24}
            transform="rotate(-14 94 60)"
            fill={p.ear}
          />
        </G>
      ) : null}

      {p.earStyle === 'maltipoo' ? (
        <G>
          {/* Fluffy curly Maltese-Poodle floppy ears */}
          <Circle cx={25} cy={54} r={14} fill={p.ear} stroke="#DDD5C7" strokeWidth={1.4} />
          <Circle cx={22} cy={67} r={12.5} fill={p.ear} stroke="#DDD5C7" strokeWidth={1.4} />
          <Circle cx={26} cy={77} r={9.5} fill="#F7F3EC" />
          <Circle cx={95} cy={54} r={14} fill={p.ear} stroke="#DDD5C7" strokeWidth={1.4} />
          <Circle cx={98} cy={67} r={12.5} fill={p.ear} stroke="#DDD5C7" strokeWidth={1.4} />
          <Circle cx={94} cy={77} r={9.5} fill="#F7F3EC" />
        </G>
      ) : null}

      {p.earStyle === 'poodle' ? (
        <G>
          <Circle cx={24} cy={56} r={14} fill={p.ear} />
          <Circle cx={22} cy={70} r={12} fill={p.ear} />
          <Circle cx={96} cy={56} r={14} fill={p.ear} />
          <Circle cx={98} cy={70} r={12} fill={p.ear} />
        </G>
      ) : null}

      {p.earStyle === 'pointy' || p.earStyle === 'husky' ? (
        <G>
          <Path d="M26 52 L19 18 L47 34 Z" fill={p.ear} />
          <Path d="M29 47 L25 25 L43 36 Z" fill="#FBCFE8" />
          <Path d="M94 52 L101 18 L73 34 Z" fill={p.ear} />
          <Path d="M91 47 L95 25 L77 36 Z" fill="#FBCFE8" />
        </G>
      ) : null}

      {p.earStyle === 'bat' ? (
        <G>
          <Path
            d="M24 52 C14 20, 32 10, 46 34 Z"
            fill={p.ear}
          />
          <Path
            d="M28 47 C22 26, 33 19, 42 35 Z"
            fill="#F9A8D4"
          />
          <Path
            d="M96 52 C106 20, 88 10, 74 34 Z"
            fill={p.ear}
          />
          <Path
            d="M92 47 C98 26, 87 19, 78 35 Z"
            fill="#F9A8D4"
          />
        </G>
      ) : null}

      {/* Head Base */}
      <Ellipse
        cx={60}
        cy={58}
        rx={32}
        ry={29}
        fill={p.furMain}
        stroke={key === 'maltipoo' ? '#E4DDD2' : 'none'}
        strokeWidth={key === 'maltipoo' ? 1.4 : 0}
      />

      {/* White Maltipoo Teddy-Bear Cloud Curls & Fluffy Cheek Tufts */}
      {p.earStyle === 'maltipoo' ? (
        <G>
          <Circle cx={44} cy={31} r={11.5} fill="#FFFFFF" stroke="#E4DDD2" strokeWidth={1.2} />
          <Circle cx={60} cy={26} r={13.5} fill="#FFFFFF" stroke="#E4DDD2" strokeWidth={1.2} />
          <Circle cx={76} cy={31} r={11.5} fill="#FFFFFF" stroke="#E4DDD2" strokeWidth={1.2} />
          <Circle cx={52} cy={30} r={10.5} fill="#FFFFFF" />
          <Circle cx={68} cy={30} r={10.5} fill="#FFFFFF" />
          {/* Soft fluffy side-cheek puffs */}
          <Circle cx={34} cy={64} r={10} fill="#FFFFFF" />
          <Circle cx={86} cy={64} r={10} fill="#FFFFFF" />
        </G>
      ) : null}

      {/* Poodle Fluffy Top Poof */}
      {p.earStyle === 'poodle' ? (
        <G>
          <Circle cx={48} cy={30} r={11} fill={p.furSecondary} />
          <Circle cx={60} cy={27} r={13} fill={p.furSecondary} />
          <Circle cx={72} cy={30} r={11} fill={p.furSecondary} />
        </G>
      ) : null}

      {/* Husky / Corgi Facial Mask Markings */}
      {key === 'husky' ? (
        <G>
          <Circle cx={46} cy={53} r={12} fill="#FFFFFF" />
          <Circle cx={74} cy={53} r={12} fill="#FFFFFF" />
          <Ellipse cx={60} cy={69} rx={22} ry={16} fill="#FFFFFF" />
        </G>
      ) : null}

      {key === 'corgi' || key === 'shiba' || key === 'staffy' ? (
        <G>
          <Path d="M56 32 L60 55 L64 32 Z" fill={p.furSecondary} />
          <Ellipse cx={60} cy={69} rx={21} ry={15} fill={p.furSecondary} />
        </G>
      ) : null}

      {key === 'kelpie' ? (
        <G>
          <Circle cx={47} cy={44} r={4.2} fill={p.furSecondary} />
          <Circle cx={73} cy={44} r={4.2} fill={p.furSecondary} />
          <Ellipse cx={60} cy={69} rx={19} ry={14} fill={p.furSecondary} />
        </G>
      ) : null}

      {/* Cheeks / Muzzle */}
      <Ellipse cx={60} cy={68} rx={17} ry={13} fill={p.muzzle} />

      {/* Rosy Blush Spots */}
      <Ellipse cx={37} cy={63} rx={5.5} ry={3.2} fill="#FDA4AF" opacity={0.55} />
      <Ellipse cx={83} cy={63} rx={5.5} ry={3.2} fill="#FDA4AF" opacity={0.55} />

      {/* Expressive Shiny Eyes */}
      <Circle cx={45} cy={52} r={5.2} fill={p.eyeColor} />
      <Circle cx={43.3} cy={50.2} r={1.8} fill="#FFFFFF" />
      <Circle cx={75} cy={52} r={5.2} fill={p.eyeColor} />
      <Circle cx={73.3} cy={50.2} r={1.8} fill="#FFFFFF" />

      {/* Cute Happy Tongue */}
      <Path
        d="M54 74 Q60 88 66 74 Z"
        fill="#FB7185"
      />
      <Path
        d="M60 75 L60 81"
        stroke="#E11D48"
        strokeWidth={1.3}
        strokeLinecap="round"
      />

      {/* Smile & Boopable Nose */}
      <Path
        d="M50 71 Q55 76 60 71 Q65 76 70 71"
        fill="none"
        stroke="#2B1E16"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Ellipse cx={60} cy={63} rx={6.5} ry={4.6} fill="#1F1917" />
      <Ellipse cx={58} cy={61.6} rx={2.2} ry={1.1} fill="#6B5E58" />
    </Svg>
  );
};

export const DogAvatar = React.memo(DogAvatarInner);

const styles = StyleSheet.create({
  photoAvatar: {
    backgroundColor: '#FAF8F3',
  },
});
