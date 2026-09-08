import { useState, useEffect } from 'react';

/**
 * Hook to determine whether the user is viewing on a mobile phone vs. desktop site.
 * - Mobile: viewport width < 768px, or mobile user-agent on small/medium screen (< 1024px)
 * - Desktop: viewport width >= 768px on standard desktop/laptop browsers
 */
export function useDeviceType(): {
  isMobile: boolean;
  isDesktop: boolean;
  screenWidth: number;
} {
  const getIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

    // If screen width is less than 768px (standard Tailwind 'md' breakpoint), it is definitely mobile
    if (width < 768) return true;

    // If mobile UA and width < 1024px (phone or small tablet in portrait), consider mobile
    if (isMobileUA && width < 1024) return true;

    return false;
  };

  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);
  const [screenWidth, setScreenWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = getIsMobile();
      setIsMobile(mobile);
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile,
    screenWidth,
  };
}
