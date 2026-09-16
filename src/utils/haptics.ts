/**
 * Haptic Vibration Patterns and Web Vibration API Controller
 * Provides tactile confirmation and haptic feedback for Check-In, Check-Out,
 * biometric scans, and geofence alerts.
 */

export const HAPTIC_PATTERNS = {
  // Immediate button tap
  CLICK: 25,
  CHECK_IN_CLICK: [30],
  CHECK_OUT_CLICK: [35],

  // Distinctive success confirmation patterns
  // Check-In: Double ascending pulse affirming clock-in registration
  CHECK_IN_SUCCESS: [40, 60, 80],
  // Check-Out: Rich multi-beat pulse confirming completion of work hours
  CHECK_OUT_SUCCESS: [50, 60, 50, 60, 110],

  // Biometrics feedback
  BIOMETRIC_SCAN: [25, 40, 25],
  BIOMETRIC_SUCCESS: [35, 50, 70],

  // Alert, Warning, and Error patterns
  ERROR: [100, 60, 100],
  WARNING: [60, 70, 60],
  GEOFENCE_ALERT: [110, 70, 110],
} as const;

/**
 * Checks if the Web Vibration API is supported on the current device
 */
export function isHapticsSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Triggers a vibration pattern using the Web Vibration API
 */
export function triggerHaptic(pattern: number | number[] | readonly number[]): boolean {
  if (isHapticsSupported()) {
    try {
      return navigator.vibrate(pattern as VibratePattern);
    } catch (e) {
      console.debug('Haptic vibration failed or blocked by environment:', e);
    }
  }
  return false;
}

/**
 * Tactile feedback on initiating Check-In button click
 */
export function hapticCheckInClick(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.CHECK_IN_CLICK);
}

/**
 * Tactile confirmation on successful Check-In registration
 */
export function hapticCheckInSuccess(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.CHECK_IN_SUCCESS);
}

/**
 * Tactile feedback on initiating Check-Out button click
 */
export function hapticCheckOutClick(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.CHECK_OUT_CLICK);
}

/**
 * Tactile confirmation on successful Check-Out registration
 */
export function hapticCheckOutSuccess(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.CHECK_OUT_SUCCESS);
}

/**
 * Tactile feedback for biometric scan progress
 */
export function hapticBiometricScan(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.BIOMETRIC_SCAN);
}

/**
 * Tactile feedback for biometric scan success
 */
export function hapticBiometricSuccess(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.BIOMETRIC_SUCCESS);
}

/**
 * Tactile feedback for errors, rejected punches, or geofence boundary alerts
 */
export function hapticError(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.ERROR);
}

/**
 * Tactile feedback for warning states
 */
export function hapticWarning(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.WARNING);
}

/**
 * Tactile feedback for entering office geofence proximity (50m alert)
 */
export function hapticGeofenceAlert(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.GEOFENCE_ALERT);
}

/**
 * Distinctive tactile vibration pulse when within 50m of office geofence
 */
export function hapticProximityReminder(): boolean {
  return triggerHaptic([150, 80, 150, 80, 250]);
}

/**
 * General tactile tap for interactive elements
 */
export function hapticTap(): boolean {
  return triggerHaptic(HAPTIC_PATTERNS.CLICK);
}
