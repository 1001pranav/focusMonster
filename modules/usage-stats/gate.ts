import { requireOptionalNativeModule } from 'expo';

/** Native side: modules/usage-stats/android (FocusGateModule, FocusAccessibilityService, GateActivity). */
interface FocusGateNative {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppDetails(): void;
  configure(json: string): void;
  drainLog(): string;
  shortVideoDays(): string;
  detectionInfo(): string;
  scheduleBackground(): void;
}

const native = requireOptionalNativeModule<FocusGateNative>('FocusGate');

export const gateAvailable = () => Boolean(native);

/** Whether the user has turned on the accessibility service that opens the gate. */
export const gateServiceEnabled = () => native?.isServiceEnabled() ?? false;

export const openAccessibilitySettings = () => native?.openAccessibilitySettings();

export const openAppDetails = () => native?.openAppDetails();

export interface GateConfig {
  enabled: boolean;
  /** Epoch ms when the gate turns itself off; 0 for never. */
  offAt: number;
  wasted: string[];
  /** Wasted apps on their way out, with the epoch ms they stop being gated. */
  releaseAt: Record<string, number>;
  shorts: { mode: string; limit: number };
  /** A weaker Reels/Shorts policy and the epoch ms it starts. */
  shortsNext: { mode: string; limit: number; at: number } | null;
  /** Epoch ms the running focus session ends; 0 when none runs. */
  focusUntil: number;
  focusTask: string | null;
  /** Replacement habits offered on the gate. */
  instead: { id: string; title: string }[];
  /** The day targetMin is for, and tomorrow's target after a hit or a miss. */
  day: string;
  targetMin: number;
  ifHitMin: number;
  ifMissMin: number;
  /** 'HH:MM' of the morning plan and nightly recap, posted by the background worker. */
  morningAt: string;
  nightAt: string;
  bedtime: { enabled: boolean; start: string; end: string; morningFreeMin: number };
  bedtimeNext: { enabled: boolean; start: string; end: string; morningFreeMin: number; at: number } | null;
  nextTask: string | null;
  why: string | null;
}

export const configureGate = (config: GateConfig) => native?.configure(JSON.stringify(config));

export interface RawGateEvent {
  at: number;
  package: string;
  reason: string | null;
  choice: string;
  waitSec: number;
  /** Missing in entries logged before breaks existed. */
  kind?: string;
  habitId?: string | null;
}

/** Gate decisions since the last call, oldest first. */
export const drainGateLog = (): RawGateEvent[] => (native ? (JSON.parse(native.drainLog()) as RawGateEvent[]) : []);

/** Reels/Shorts per day and app: {day: {package: {count, ms, blocked}}}, the last two weeks. */
export const shortVideoDays = (): Record<string, Record<string, { count: number; ms: number; blocked: number }>> =>
  native ? JSON.parse(native.shortVideoDays()) : {};

/** Starts the background worker (budget warnings, morning plan, nightly recap). Safe to call often. */
export const scheduleBackground = () => native?.scheduleBackground();

export interface DetectionApp {
  opened?: number;
  lastOpened?: number;
  playerSeen?: number;
  lastPlayerSeen?: number;
  /** Recent scrolls as view-id chains, scrolled view first: "(no id) < clips_viewer_view_pager". */
  scrolls?: string[];
}

/** What Reels/Shorts detection saw today, for the detection check screen. */
export const detectionInfo = (): { day?: string; apps?: Record<string, DetectionApp> } => (native ? JSON.parse(native.detectionInfo()) : {});
