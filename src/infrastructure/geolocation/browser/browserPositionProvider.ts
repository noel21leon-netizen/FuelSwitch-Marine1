// Browser GPS adapter (FR-003). Wraps navigator.geolocation.watchPosition. Never fabricates SOG/COG: absent values stay null.
// Foreground only — it does not track after the page is suspended (BACKGROUND_GPS_LIMIT_TEXT).
import { metersPerSecondToKnots, toIsoUtc, type VesselPosition } from '../../../domain';
import type { PositionErrorKind, PositionListener, PositionProvider } from '../../../application/ports';

/** Structural subset of the DOM Geolocation API, so tests can pass a fake. */
export interface GeolocationLike {
  watchPosition(
    success: (p: GeolocationPositionLike) => void,
    error: (e: { code: number; message: string }) => void,
    options?: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number },
  ): number;
  clearWatch(id: number): void;
}
export interface GeolocationPositionLike {
  readonly coords: {
    readonly latitude: number; readonly longitude: number; readonly accuracy: number;
    readonly speed: number | null; readonly heading: number | null;
  };
  readonly timestamp: number;
}

const finiteOrNull = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Pure mapping. Returns null if the fix is unusable (non-finite coordinates/timestamp). Units are converted HERE via domain/units. */
export function mapBrowserFix(p: GeolocationPositionLike): VesselPosition | null {
  const lat = finiteOrNull(p.coords.latitude);
  const lon = finiteOrNull(p.coords.longitude);
  const ts = finiteOrNull(p.timestamp);
  if (lat === null || lon === null || ts === null) return null;

  // m/s → knots. Negative speed is invalid → null (never clamped to 0, which would read as "stationary").
  const speedMs = finiteOrNull(p.coords.speed);
  const sogKnots = speedMs !== null && speedMs >= 0 ? metersPerSecondToKnots(speedMs) : null;
  // Heading is only meaningful when moving; browsers report NaN/null otherwise. Out-of-range → null.
  const heading = finiteOrNull(p.coords.heading);
  const cog = heading !== null && heading >= 0 && heading <= 360 ? heading % 360 : null;
  const acc = finiteOrNull(p.coords.accuracy);

  return {
    latitudeDeg: lat, longitudeDeg: lon,
    accuracyMeters: acc !== null && acc >= 0 ? acc : null,
    // The FIX timestamp, not the time we received it (ADR-018).
    observedAtUtc: toIsoUtc(ts),
    source: 'browser-gps', sogKnots, cogDegreesTrue: cog, isSimulated: false,
  };
}

export function mapGeolocationError(e: { code: number; message: string }): { kind: PositionErrorKind; message: string } {
  switch (e.code) {
    case 1: return { kind: 'permission-denied', message: 'Location permission was denied. Allow location access for this site in the browser settings, then start again.' };
    case 2: return { kind: 'position-unavailable', message: 'The device could not determine its position (no GPS signal or location services off).' };
    case 3: return { kind: 'timeout', message: 'Timed out waiting for a GPS fix.' };
    default: return { kind: 'position-unavailable', message: e.message || 'Unknown geolocation error.' };
  }
}

export interface BrowserEnvironment {
  readonly geolocation: GeolocationLike | undefined;
  readonly isSecureContext: boolean;
}

export function detectBrowserEnvironment(): BrowserEnvironment {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    geolocation: nav && 'geolocation' in nav ? (nav.geolocation as unknown as GeolocationLike) : undefined,
    isSecureContext: typeof isSecureContext === 'boolean' ? isSecureContext : false,
  };
}

export class BrowserPositionProvider implements PositionProvider {
  readonly kind = 'browser-gps' as const;
  private watchId: number | null = null;

  constructor(private readonly env: BrowserEnvironment = detectBrowserEnvironment()) {}

  start(listener: PositionListener): void {
    if (this.watchId !== null) return; // never create two watchers
    if (!this.env.geolocation) {
      listener({ type: 'error', kind: 'unsupported', message: 'This browser does not support geolocation.' });
      return;
    }
    if (!this.env.isSecureContext) {
      listener({ type: 'error', kind: 'insecure-context', message: 'Geolocation needs a secure (HTTPS) page. Open the app over HTTPS or on localhost.' });
      return;
    }
    listener({ type: 'status', status: 'started' });
    this.watchId = this.env.geolocation.watchPosition(
      (p) => {
        const fix = mapBrowserFix(p);
        if (fix) listener({ type: 'position', position: fix });
        else listener({ type: 'error', kind: 'invalid-fix', message: 'The device reported a fix with invalid coordinates or time; it was ignored.' });
      },
      (e) => { const m = mapGeolocationError(e); listener({ type: 'error', kind: m.kind, message: m.message }); },
      // maximumAge 0: never accept a cached fix as new. timeout: report instead of waiting silently.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }

  stop(): void {
    if (this.watchId === null) return;
    this.env.geolocation?.clearWatch(this.watchId);
    this.watchId = null;
    // Listener intentionally not called after stop; the controller already knows.
  }
}
