import { requireOptionalNativeModule } from 'expo';

/** Native side: modules/usage-stats/android (FocusGateModule, FocusAccessibilityService, GateActivity). */
interface FocusGateNative {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppDetails(): void;
  configure(json: string): void;
  drainLog(): string;
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
}

/** Gate decisions since the last call, oldest first. */
export const drainGateLog = (): RawGateEvent[] => (native ? (JSON.parse(native.drainLog()) as RawGateEvent[]) : []);
