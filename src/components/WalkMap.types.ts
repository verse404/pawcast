import {
  DoorstepLoopPlan,
  LocationPoint,
  ScoredPlace,
  StreetCorridor,
  UnitSystem,
} from '../types/walk';

export interface WalkMapProps {
  center: LocationPoint;
  places: ScoredPlace[];
  selectedPlaceId: string | null;
  corridors?: StreetCorridor[];
  selectedCorridorId?: string | null;
  showStreetsOverlay?: boolean;
  customLoop?: DoorstepLoopPlan | null;
  isLocating?: boolean;
  units: UnitSystem;
  /** Fills parent container edge-to-edge when true (used on the dedicated Map tab). */
  fullScreen?: boolean;
  /** Suppresses the built-in floating bottom bar when parent renders a custom carousel card. */
  hideBuiltInBottomBar?: boolean;
  /** Suppresses the built-in street-legend pill when parent renders a unified top HUD bar. */
  hideBuiltInStreetPill?: boolean;
  /** Extra top offset (px) for map controls when parent overlays top search/filter pills. */
  topControlsOffset?: number;
  /** Optional custom pin label formatter (e.g. Simple Tags instead of raw numeric scores). */
  pinLabelFormatter?: (place: ScoredPlace, rankIndex: number) => string;
  onSelectPlace: (id: string) => void;
  onInspectSelectedPlace?: (id: string) => void;
  onSelectCorridor?: (id: string) => void;
  onToggleStreetsOverlay?: () => void;
  onLocateMe?: () => void;
  onOpenDirections: (place: ScoredPlace) => void;
  onOpenLoopDirections?: (loop: DoorstepLoopPlan) => void;
}
