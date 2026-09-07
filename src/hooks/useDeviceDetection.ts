import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  hasNotch: boolean;
  isLandscape: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    hasNotch: false,
    isLandscape: false,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Detectar SO
      const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /android/.test(userAgent);
      
      // Detectar tamaño de pantalla
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Detectar notch (iOS)
      const hasNotch = isIOS && 
                      (window.screen.height / window.screen.width > 1.8 ||
                       (window as any).devicePixelRatio > 2);
      
      // Detectar orientación
      const isLandscape = width > height;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        screenWidth: width,
        screenHeight: height,
        hasNotch,
        isLandscape,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// Utility hook para verificar si estamos en móvil
export const useIsMobile = (): boolean => {
  const device = useDeviceDetection();
  return device.isMobile;
};

// Utility hook para verificar plataforma específica
export const usePlatform = () => {
  const device = useDeviceDetection();
  return {
    isIOS: device.isIOS,
    isAndroid: device.isAndroid,
    hasNotch: device.hasNotch,
  };
};
