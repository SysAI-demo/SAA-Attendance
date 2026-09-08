import { EmployeeDeviceBinding } from '../types';

const DEVICE_STORAGE_KEY = 'saata_enterprise_device_uid_v1';
const DEVICE_SIMULATION_KEY = 'saata_simulated_device_name_v1';

/**
 * Generates a unique, persistent hardware/terminal device ID.
 */
export function getOrCreateCurrentDeviceId(): string {
  try {
    let devId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!devId || devId.trim().length === 0) {
      const entropy = Math.random().toString(36).substring(2, 10);
      const timestamp = Date.now().toString(36);
      devId = `DEV_${timestamp.toUpperCase()}_${entropy.toUpperCase()}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, devId);
    }
    return devId;
  } catch {
    return 'DEV_FALLBACK_DEFAULT';
  }
}

/**
 * Resets the current browser's device ID to simulate a fresh/different device (useful for HR testing).
 */
export function resetCurrentClientDeviceId(customPrefix?: string): string {
  const entropy = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  const prefix = customPrefix || 'DEV';
  const newDevId = `${prefix}_${timestamp.toUpperCase()}_${entropy.toUpperCase()}`;
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, newDevId);
  } catch {
    // ignore
  }
  return newDevId;
}

export interface DevicePlatformDetails extends EmployeeDeviceBinding {
  isMobile: boolean;
  platformType: 'mobile' | 'desktop';
}

/**
 * Checks if the current client is a mobile device (iOS / Android / mobile screen).
 */
export function isMobileClientDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
  return isMobileUA || (isTouch && isSmallScreen);
}

/**
 * Detects friendly OS, Browser, Device Model, and Mobile vs Desktop classification.
 */
export function getCurrentDeviceDetails(): DevicePlatformDetails {
  const deviceId = getOrCreateCurrentDeviceId();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Agent';

  let os = 'Unknown OS';
  let deviceName = 'Workstation Terminal';
  let browser = 'Browser';
  let isMobile = false;

  if (typeof navigator !== 'undefined') {
    // OS Detection
    if (/iPhone/i.test(userAgent)) {
      os = 'iOS';
      deviceName = 'Apple iPhone';
      isMobile = true;
    } else if (/iPad/i.test(userAgent)) {
      os = 'iPadOS';
      deviceName = 'Apple iPad';
      isMobile = true;
    } else if (/Android/i.test(userAgent)) {
      os = 'Android';
      isMobile = true;
      if (/Samsung/i.test(userAgent) || /SM-/i.test(userAgent)) {
        deviceName = 'Samsung Galaxy Device';
      } else if (/Pixel/i.test(userAgent)) {
        deviceName = 'Google Pixel Device';
      } else {
        deviceName = 'Android Mobile Device';
      }
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
      os = 'macOS';
      deviceName = 'Apple MacBook / Mac';
      isMobile = false;
    } else if (/Windows NT 10.0/i.test(userAgent)) {
      os = 'Windows 11/10';
      deviceName = 'Windows PC Workstation';
      isMobile = false;
    } else if (/Windows/i.test(userAgent)) {
      os = 'Windows';
      deviceName = 'Windows PC';
      isMobile = false;
    } else if (/Linux/i.test(userAgent)) {
      os = 'Linux';
      deviceName = 'Linux Workstation';
      isMobile = false;
    }

    // Touch & Small screen fallback
    if (!isMobile && typeof window !== 'undefined' && window.innerWidth <= 768 && (('ontouchstart' in window) || navigator.maxTouchPoints > 1)) {
      isMobile = true;
      deviceName = 'Mobile Device';
    }

    // Browser Detection
    if (/Edg\//i.test(userAgent)) {
      browser = 'Microsoft Edge';
    } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
      browser = 'Google Chrome';
    } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
      browser = 'Apple Safari';
    } else if (/Firefox\//i.test(userAgent)) {
      browser = 'Mozilla Firefox';
    } else if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
      browser = 'Opera';
    }
  }

  // Check if simulated device name is set
  try {
    const simName = localStorage.getItem(DEVICE_SIMULATION_KEY);
    if (simName) {
      deviceName = simName;
      if (/iPhone|Android|Pixel|Galaxy|Mobile/i.test(simName)) {
        isMobile = true;
      }
    }
  } catch {
    // ignore
  }

  const fullDeviceName = `${deviceName} (${browser})`;

  return {
    deviceId,
    deviceName: fullDeviceName,
    os,
    browser,
    isMobile,
    platformType: isMobile ? 'mobile' : 'desktop',
    boundAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    userAgent: userAgent.slice(0, 200),
  };
}
