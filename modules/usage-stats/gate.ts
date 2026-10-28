import { requireOptionalNativeModule } from 'expo';

/** Native side: modules/usage-stats/android (FocusGateModule, FocusAccessibilityService, GateActivity). */
interface FocusGateNative {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppDetails(): void;
  configure(json: string): void;
  drainLog(): string;
  shortVideoDays(): string;
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
  targetMin: number;
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
