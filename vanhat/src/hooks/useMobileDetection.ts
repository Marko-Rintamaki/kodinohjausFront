import { useState, useEffect } from 'react';
import { isMobileDevice, getDeviceType } from '../utils/deviceDetection';

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(isMobileDevice());
      setDeviceType(getDeviceType());
    };

    // Check on mount
    checkDevice();

    // Listen for resize events
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    deviceType,
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop'
  };
};
