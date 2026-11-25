import { formatTemperature } from '../i18n/formatters';
import { AMENITY_LABELS, LEASH_POLICY_LABELS } from '../i18n/messages';
import { getLocaleTag } from '../i18n/translations';
import {
  AppLanguage,
  DogProfile,
  ScoredHour,
  ScoredPlace,
  UnitSystem,
} from '../types/walk';

export interface SimpleSpotTag {
  label: string;
  tone: 'hero' | 'good' | 'warn' | 'muted';
}

export interface SpotInsiderGuide {
  englishTitle: string;
  localSubtitle: string;
  gateLabel: string;
  gateLatitude: number;
  gateLongitude: number;
  footingAndRulesNow: string;
  perksNearby: string;
  localHeadsUp: string;
}

interface CuratedShanghaiGuide {
  gateLabel: string;
  gateLat?: number;
  gateLon?: number;
  perks: string;
  headsUp: string;
}

/**
 * Curated Shanghai dog-owner gate, parking, perks, and local heads-up guide
 * covering all 30 verified Greater-Shanghai spots in `SHANGHAI_PILOT_SPOTS`.
 */
const SHANGHAI_CURATED_GUIDES: Record<string, CuratedShanghaiGuide> = {
  // === 10 Dedicated Off-Leash Dog Parks ===
  'sh-west-bund': {
    gateLabel: 'North Dog Gate · 3268 Longteng Ave (Underground Lot P2)',
    gateLat: 31.1902,
    gateLon: 121.4603,
    perks:
      'Manner Coffee, pet water bowls & wide car-free riverside deck 60m south.',
    headsUp:
      'Peak dog social hour is 17:00–19:00; weekend afternoons get busy with riverside tents.',
  },
  'sh-expo-doggo': {
    gateLabel: 'Expo Cultural Park P4 Lot · East DogGO Gate',
    gateLat: 31.1815,
    gateLon: 121.4826,
    perks:
      'Self-serve dog wash station, pet vending machine & size-split (>40cm / <40cm) runs.',
    headsUp:
      'Have your Shanghai 狗证 & WeChat booking QR ready; last entry is 16:30 before 17:30 close.',
  },
  'sh-century-pet': {
    gateLabel: 'Century Park Gate 7 · Jinxiu Rd P3 Parking Lot',
    gateLat: 31.2158,
    gateLon: 121.5518,
    perks:
      'Enclosed agility hurdles, shaded benches & fresh water taps inside fenced zone.',
    headsUp:
      'Advance WeChat booking + 狗证 check at Gate 7; dogs are not allowed on inner non-pet lawns.',
  },
  'sh-heping-dog': {
    gateLabel: 'Heping Park Gate 3 · Dalian Rd & Xinkang Rd',
    perks:
      'Separate small/large fenced runs plus pet-friendly cafés in the sunken plaza.',
    headsUp:
      'Keep dogs leashed on park walkways between the street gate and the fenced run.',
  },
  'sh-gate-m': {
    gateLabel: 'West Bund Dream Center South Drop-Off · Longteng Ave',
    perks:
      'Waterfront play ramps, abundant pet-friendly restaurant patios & treat shops.',
    headsUp:
      'Friday–Sunday evenings draw lively dining crowds; mornings are quiet and breezy.',
  },
  'sh-pengpu': {
    gateLabel: 'Qiuyuan Gate 6 · Changlin Rd (Closest to Enclosed Run)',
    perks:
      'Free neighborhood enclosed off-leash zone with mature shade trees.',
    headsUp:
      'Strictly timed sessions (06:00–08:30 & 13:00–15:30) — gates lock outside those hours.',
  },
  'sh-dahuangcun': {
    gateLabel: 'Greenbelt South Entrance · Gonghexin Rd Service Lane',
    perks:
      '3,000m² fenced off-leash greenbelt open 24h with shade canopy and water.',
    headsUp:
      'Bring mosquito spray on humid evenings near the creekside trees.',
  },
  'sh-yanbei': {
    gateLabel: 'Yanbei Park Main Gate · Free Roadside Parking Bay',
    perks:
      '80% forest canopy shade across a 3 km woodland trail plus enclosed dog run.',
    headsUp:
      'Best daytime summer escape; bring extra drinking water on warm afternoons.',
  },
  'sh-langxiang': {
    gateLabel: 'Langxiang Pet Resort Visitor Lot · 顾村 Gucun',
    perks:
      'Expansive resort lawns, splash zones & weekend breed meet-up events.',
    headsUp:
      'Pet entry ticket at gate; wide lawns stay soft for several hours after heavy rain.',
  },
  'sh-lets-dog': {
    gateLabel: 'Pujiang Country Park Gate 1 · P1 Parking Lot',
    perks:
      'Countryside agility lawn, shaded picnic tables & wide walking paths.',
    headsUp:
      'Requires WeChat reservation + Shanghai 狗证 inspection at park entrance.',
  },

  // === 12 Official District Pilot Parks & Urban Lawns ===
  'sh-suhewan': {
    gateLabel: 'Fujian N Rd & Tiantong Rd Open Lawn Ramp',
    perks:
      'Pet-friendly East Lane cafés, dog water stations & open riverside breeze.',
    headsUp:
      'Keep dogs leashed on mall walkways; evening social lawn peaks 18:30–20:30.',
  },
  'sh-butterfly-bay': {
    gateLabel: 'Kangding E Rd Creekside Gate · Jing’an',
    perks:
      'Connects directly onto the car-free Suzhou Creek boardwalk.',
    headsUp:
      'Keep leash short near evening joggers along the creekside promenade.',
  },
  'sh-sleepless': {
    gateLabel: 'Hanzhong Rd South Slope Entrance · Tianmu W Rd',
    perks:
      'Shaded terraced walkways buffered from main road traffic noise.',
    headsUp:
      'Stick to the lower paved loop if stone steps are damp after rain.',
  },
  'sh-dongjiaojing': {
    gateLabel: 'Pingxingguan Rd Creek Footbridge Entrance',
    perks:
      'Calm neighborhood creekside paths with shaded rest benches.',
    headsUp:
      'Relaxed residential dog-walking crowd before 09:00 and after 18:00.',
  },
  'sh-zhonghuan': {
    gateLabel: 'Gonghexin Rd & Wenshui Rd NW Greenbelt Corner',
    perks:
      'Wide paved greenbelt paths with bright evening street lighting.',
    headsUp:
      'Keep leash ≤2m near metro commuter footpaths during rush hour.',
  },
  'sh-nanyuan': {
    gateLabel: 'Longhua E Rd & Luban Rd South River Gate',
    perks:
      'Wide 6m riverfront promenade away from Bund tourist crowds.',
    headsUp:
      'Calm riverfront alternative to crowded Tianzifang and Huaihai Rd.',
  },
  'sh-daji': {
    gateLabel: 'Daji Rd & Xizang S Rd Pocket Entrance',
    perks: 'Shaded downtown pocket green with smooth paved paths.',
    headsUp:
      'Huangpu pilot rule: restricted to small dogs ≤15 kg on a short leash.',
  },
  'sh-jingmi': {
    gateLabel: 'Mengzi Rd & Madang Rd Pocket Gate',
    perks: 'Quiet tree-shaded benches away from Xintiandi foot traffic.',
    headsUp:
      'Huangpu pilot rule: restricted to small dogs ≤15 kg (07:00–21:00).',
  },
  'sh-runway-park': {
    gateLabel: 'Yunjin Rd & Fenggu Rd Promenade Entrance',
    perks:
      'Former airport runway converted into a wide, car-free linear park with water fountains.',
    headsUp:
      'Watch for evening joggers along the center track — stick to the shaded garden side paths.',
  },
  'sh-haisu': {
    gateLabel: 'Yan’an W Rd & Kaixuan Rd Open Lawn · C·PARK',
    perks:
      'Pet-friendly café patios & shaded steps right around C·PARK Haisu.',
    headsUp:
      'Popular sunset dog-social lawn; keep leash clipped on unfenced grass.',
  },
  'sh-gubei': {
    gateLabel: 'Fugu Rd West Lawn Gate · Gubei',
    perks:
      'Clean neighborhood lawn popular with friendly Gubei Corgis, Shibas & Poodles.',
    headsUp:
      'Shared pet pilot hours only (06:30–09:30 & 17:30–21:00); leashed walk required.',
  },
  'sh-kunshan': {
    gateLabel: 'Kunshan Garden Rd Historic South Gate',
    perks:
      'Century-old shade canopy and calm winding garden footpaths.',
    headsUp:
      'Open to leashed dogs 08:00–20:00; gates close promptly at 20:00.',
  },

  // === 8 Iconic Waterfronts, Quiet Canopy Loops & Country Parks ===
  'sh-hunan-loop': {
    gateLabel: 'Start Corner · Hunan Rd & Yongfu Rd (Xuhui FFC)',
    perks:
      '3.5m sycamore-shaded villa sidewalks & dog-friendly patios along Ferguson Lane.',
    headsUp:
      'Calm smart swap 1 block south of crowded Anfu Rd; keep leash short at Huaihai Rd crossing.',
  },
  'sh-banma-suhe': {
    gateLabel: 'Guangfu W Rd Waterfront Ramp (Lot P1)',
    perks:
      '3.5 km continuous Suzhou Creek promenade with wide lawns & rest pavilions.',
    headsUp:
      'Stay on the pedestrian riverside walk and clear of the marked outer bike lane.',
  },
  'sh-qiantan': {
    gateLabel: 'Qiantan Ave P2 Parking · Riverfront Boardwalk Access',
    perks:
      'Wide sunset boardwalk near pet-friendly cafés at Qiantan Taikoo Li.',
    headsUp:
      'Keep dogs off the dedicated red jogging/cycling track.',
  },
  'sh-century-outer': {
    gateLabel: 'Jinxiu Rd & Fangdian Rd Greenway Start',
    perks:
      'Uninterrupted 5 km car-free tree-shaded outer loop open 24h for free.',
    headsUp:
      'Outer ring trail is free 24h; inner fenced Century Pet Park requires advance booking.',
  },
  'sh-minhang-river': {
    gateLabel: 'Jiangchuan Rd Ferry Pier Lawn Entrance',
    perks:
      'Expansive unfenced Huangpu riverside rolling lawns with fresh river breeze.',
    headsUp:
      'Unfenced waterfront edge — keep water-loving dogs securely leashed near the bank.',
  },
  'sh-xinjiangwan': {
    gateLabel: 'Guoxiu Rd & Yinhang Rd Greenway Access',
    perks:
      'Lush wetland greenways, wide calm sidewalks & abundant tree shade.',
    headsUp:
      'Keep dogs on paved greenway paths and out of protected wetland reed beds.',
  },
  'sh-panlong': {
    gateLabel: 'Panding Rd P3 Underground Lot · East Lawn',
    perks:
      'Pet-friendly water-town plazas, outdoor dining patios & open lawns.',
    headsUp:
      'Weekend afternoons get crowded on canal bridges — mornings and evenings are calmest.',
  },
  'sh-fish-art': {
    gateLabel: 'Hupan Rd North Lakeside Parking Lot',
    perks:
      'Expansive lakeside pilot lawns & wide breezy paved promenades.',
    headsUp:
      'Open sun exposure around the lake midday — best before 10:00 or near sunset.',
  },
};

/**
 * Generates a concise, low-clutter Simple Tag for collapsed spot cards & map pins.
 */
export function getSimpleSpotTag(
  sp: ScoredPlace,
  rankIndex: number,
  selectedHour: ScoredHour | null,
  language: AppLanguage = 'en'
): SimpleSpotTag {
  const zh = language === 'zh';
  if (!sp.openStatus.isOpen) {
    return {
      label:
        sp.place.accessRule === 'timed_beach'
          ? zh
            ? '海滩限时段'
            : 'Beach Curfew'
          : zh
            ? '当前闭园'
            : 'Closed Now',
      tone: 'muted',
    };
  }
  if (sp.needsLicenseWarning) {
    return { label: zh ? '需备狗证' : 'Needs 狗证', tone: 'warn' };
  }
  if (sp.matchBadge === 'small_dogs_only') {
    return { label: zh ? '限≤15kg小型犬' : '≤15 kg Only', tone: 'warn' };
  }

  const isRainy = (selectedHour?.weather.precipProb ?? 0) >= 40;
  const isPostRain = Boolean(selectedHour?.isPostRainWetTurf);
  const isHotOrSunny =
    selectedHour?.pawTier !== 'safe' ||
    (selectedHour?.weather.tempC ?? 18) >= 23 ||
    (selectedHour?.weather.uvIndex ?? 0) >= 8;

  if (rankIndex === 0) {
    if (isRainy || isPostRain) {
      return { label: zh ? '★ 最干爽步道' : '★ Cleanest Paws', tone: 'hero' };
    }
    if (sp.place.category === 'dog_beach') {
      return { label: zh ? '★ 最佳海滩' : '★ Best Beach', tone: 'hero' };
    }
    if (isHotOrSunny && sp.place.amenities.includes('shade')) {
      return { label: zh ? '★ 最凉树荫' : '★ Coolest Shade', tone: 'hero' };
    }
    return { label: zh ? '★ 最佳推荐' : '★ Best Pick', tone: 'hero' };
  }

  if (sp.place.category === 'dog_beach') {
    return { label: zh ? '狗狗海滩' : 'Dog Beach', tone: 'good' };
  }
  if (
    (isRainy || isPostRain) &&
    sp.place.amenities.includes('paved') &&
    !sp.isMuddyTurfRisk
  ) {
    return { label: zh ? '干爽步道' : 'Dry Paved', tone: 'good' };
  }
  if (isHotOrSunny && sp.place.amenities.includes('shade')) {
    return { label: zh ? '凉爽树荫' : 'Cool Canopy', tone: 'good' };
  }
  if (sp.place.leashPolicy === 'off_leash_fenced') {
    return { label: zh ? '围栏狗公园' : 'Fenced Run', tone: 'good' };
  }
  if (sp.place.distanceKm < 1.3) {
    return { label: zh ? '就在附近' : 'Great Nearby', tone: 'good' };
  }
  if (sp.place.amenities.includes('off_leash')) {
    return { label: zh ? '可松绳撒欢' : 'Off-Leash', tone: 'good' };
  }
  if (sp.place.category === 'trail') {
    return { label: zh ? '风景步道' : 'Scenic Walk', tone: 'good' };
  }
  return { label: zh ? '清静绿地' : 'Calm Green', tone: 'good' };
}

/**
 * Splits bilingual names (`English · 中文`) cleanly for headers.
 * When `language === 'zh'` and a Chinese name exists, prioritizes the Chinese title.
 */
export function splitSpotDisplayName(
  fullName: string,
  language: AppLanguage = 'en'
): {
  primary: string;
  secondary: string | null;
} {
  const parts = fullName.split(' · ');
  if (parts.length >= 2) {
    const first = parts[0].trim();
    const rest = parts.slice(1).join(' · ').trim();
    if (language === 'zh' && /[\u4e00-\u9fff]/.test(rest)) {
      return { primary: rest, secondary: first };
    }
    return { primary: first, secondary: rest };
  }
  return { primary: fullName, secondary: null };
}

const ZH_AMENITY_LABELS: Record<string, string> = {
  shade: '树荫',
  water: '饮水点',
  off_leash: '可松绳区域',
  fenced: '围栏',
  paved: '铺装步道',
  lit: '夜间照明',
  grass: '草坪',
  cafe: '宠物友好咖啡馆',
  beach: '狗狗海滩',
  parking: '方便停车',
};

/**
 * Builds the 3 concise Local Insider Guide cards + Exact Dog Gate metadata for a spot.
 */
export function getSpotInsiderGuide(
  sp: ScoredPlace,
  selectedHour: ScoredHour | null,
  dog: DogProfile,
  units: UnitSystem = 'metric',
  language: AppLanguage = 'en'
): SpotInsiderGuide {
  const zh = language === 'zh';
  const loc = getLocaleTag(language);
  const { primary, secondary } = splitSpotDisplayName(sp.place.name, language);
  const curated = SHANGHAI_CURATED_GUIDES[sp.place.id];

  const gateLabel =
    curated?.gateLabel ||
    sp.place.entryDetail ||
    `${sp.place.subtitle} · ${zh ? '主步行入口' : 'Main Pedestrian Gate'}`;

  const gateLatitude = curated?.gateLat ?? sp.place.latitude;
  const gateLongitude = curated?.gateLon ?? sp.place.longitude;

  // 1. Live Ground & Rules Summary
  const hasPaved = sp.place.amenities.includes('paved');
  const hasShade = sp.place.amenities.includes('shade');
  let surfacePhrase = zh ? '当前地面温度舒适' : 'Comfortable ground temperature';
  if (selectedHour) {
    const asphaltStr = formatTemperature(selectedHour.asphaltTempC, units, loc);
    if (selectedHour.weather.precipProb >= 40) {
      surfacePhrase = hasPaved
        ? zh
          ? '雨天推荐：排水顺畅的干爽步道，不易弄脏爪子'
          : 'Wet weather · Fast-draining paved path keeps paws cleaner'
        : zh
          ? '雨天提醒：草坪地面容易泥泞打滑'
          : 'Rainy · Unpaved lawn will be muddy today';
    } else if (selectedHour.isPostRainWetTurf) {
      surfacePhrase = hasPaved
        ? zh
          ? '干爽平路，可避开雨后湿滑草地'
          : 'Dry-draining paved surface (avoids post-rain muddy grass)'
        : zh
          ? `雨后草地较湿，建议给 ${dog.name} 带条擦爪毛巾`
          : `Damp post-rain turf — pack a paw & belly towel for ${dog.name}`;
    } else if (selectedHour.pawTier !== 'safe') {
      surfacePhrase = hasShade
        ? zh
          ? `树荫下较凉快，可避开 ${asphaltStr} 的暴晒路面`
          : `Tree canopy cools ground below ${asphaltStr} sunlit asphalt`
        : zh
          ? `暴晒地面约 ${asphaltStr}，出门前可用手背贴地试温 7 秒`
          : `Sunlit pavement reaches ${asphaltStr} — do a 7-sec hand check`;
    } else {
      surfacePhrase = zh
        ? `地面温度安全（${asphaltStr}），踩起来很舒服`
        : `Safe ground (${asphaltStr}) · Comfortable footing`;
    }
  }

  const leashStr = sp.place.leashPolicy
    ? zh
      ? sp.place.leashPolicy === 'off_leash_fenced'
        ? '全围栏可松绳'
        : sp.place.leashPolicy === 'off_leash_unfenced'
          ? '开放式可松绳'
          : '需全程牵绳'
      : LEASH_POLICY_LABELS[sp.place.leashPolicy]
    : sp.place.amenities.includes('off_leash')
      ? zh
        ? '围栏可松绳'
        : 'Fenced Off-Leash'
      : zh
        ? '牵绳漫步'
        : 'Leashed Walk';

  const isAustralianSpot =
    sp.place.id.startsWith('mel-') ||
    sp.place.id.startsWith('syd-') ||
    (sp.place.latitude < -10 && sp.place.longitude > 110 && sp.place.longitude < 155);

  const ruleExtras: string[] = [leashStr];
  if (sp.place.accessRule === 'booking_license') {
    ruleExtras.push(zh ? '需带狗证与微信预约码' : 'Bring 狗证 + WeChat QR');
  } else if (sp.place.accessRule === 'timed_beach') {
    ruleExtras.push(
      zh
        ? `分时段松绳（${sp.openStatus.hoursSummary}）`
        : `Timed Off-Leash (${sp.openStatus.hoursSummary})`
    );
  } else if (sp.place.accessRule === 'pet_ticket') {
    ruleExtras.push(zh ? '现场购宠物票' : 'Pet ticket at gate');
  } else {
    ruleExtras.push(
      zh
        ? isAustralianSpot
          ? '市政免费开放'
          : '免费免预约'
        : isAustralianSpot
          ? 'Council Free Access'
          : 'Free Walk-In'
    );
  }
  if (sp.place.maxDogWeightKg) {
    ruleExtras.push(
      zh
        ? `仅限 ≤${sp.place.maxDogWeightKg} kg 小型犬`
        : `≤${sp.place.maxDogWeightKg} kg only`
    );
  }

  const footingAndRulesNow = zh
    ? `${surfacePhrase} · ${ruleExtras.join(' · ')}。`
    : `${surfacePhrase} · ${ruleExtras.join(' · ')}.`;

  // 2. Perks Nearby
  const amenitySummary = sp.place.amenities
    .map((am) => (zh ? ZH_AMENITY_LABELS[am] || AMENITY_LABELS[am] : AMENITY_LABELS[am]))
    .join(zh ? '、' : ', ');
  const perksNearby =
    curated?.perks ||
    sp.place.petPerks ||
    (amenitySummary
      ? zh
        ? `园内配套：${amenitySummary}。`
        : `On-site facilities: ${amenitySummary}.`
      : zh
        ? '周边社区绿地，适合日常轻松遛弯。'
        : 'Open neighborhood green space for easy sniff walks.');

  // 3. Local Heads-Up
  const hoursNote = !sp.openStatus.isOpen
    ? zh
      ? `当前未开放（${sp.openStatus.hoursSummary}）。`
      : `${sp.openStatus.badgeText} (${sp.openStatus.hoursSummary}). `
    : sp.openStatus.closingSoon
      ? zh
        ? `即将闭园提醒：${sp.openStatus.badgeText}。`
        : `Heads-up: ${sp.openStatus.badgeText}. `
      : '';
  const localHeadsUp =
    hoursNote +
    (curated?.headsUp ||
      sp.place.crowdAndSurfaceTip ||
      (sp.place.category === 'dog_park'
        ? zh
          ? '松绳前请先确认围栏门已关紧；17:00–19:00 是狗狗社交高峰期。'
          : 'Check gate latch before unclipping leash; peak pup social window is 17:00–19:00.'
        : zh
          ? '早上 09:30 前和晚上 18:00 后最清静，过马路时请收短牵引绳。'
          : 'Calmest before 09:30 and after 18:00; keep leash short near street crossings.'));

  return {
    englishTitle: primary,
    localSubtitle: secondary
      ? `${secondary} · ${sp.openStatus.hoursSummary}`
      : `${sp.place.subtitle} · ${sp.openStatus.hoursSummary}`,
    gateLabel,
    gateLatitude,
    gateLongitude,
    footingAndRulesNow,
    perksNearby,
    localHeadsUp,
  };
}
