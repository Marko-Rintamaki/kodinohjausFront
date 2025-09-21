/**
 * Device detection utilities for responsive design
 */

export const isMobileDevice = (): boolean => {
  // Check screen width
  const screenWidth = window.innerWidth;
  if (screenWidth <= 768) return true;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent.toLowerCase());
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getScreenSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024
  };
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width <= 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};
