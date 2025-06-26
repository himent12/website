import { useState, useEffect } from 'react';
import { useMobile } from '../contexts/MobileContext';

// Enhanced mobile detection hook that integrates with MobileContext
export const useMobileDetection = () => {
  // Use the MobileContext for comprehensive mobile state
  const mobileContext = useMobile();
  
  // Return enhanced mobile detection data
  return {
    ...mobileContext,
    // Legacy compatibility
    screenSize: mobileContext.screenSize,
    isPortrait: mobileContext.isPortrait,
    isLandscape: mobileContext.isLandscape
  };
};

// Backward compatibility - keep original simple hook for components that need it
export const useSimpleMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    // Check on mount
    checkDevice();

    // Add resize listener
    window.addEventListener('resize', checkDevice);
    
    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
      // Delay to allow for orientation change to complete
      setTimeout(checkDevice, 100);
    });

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize,
    isPortrait: screenSize.height > screenSize.width,
    isLandscape: screenSize.width > screenSize.height
  };
};

// Custom hook for touch gestures
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

// Custom hook for keyboard handling on mobile
export const useMobileKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    const initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      
      // If height decreased by more than 150px, assume keyboard is open
      setIsKeyboardOpen(heightDifference > 150);
      setViewportHeight(currentHeight);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isKeyboardOpen,
    viewportHeight
  };
};

// Custom hook for safe area insets (for devices with notches)
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      if (CSS.supports('padding', 'env(safe-area-inset-top)')) {
        const computedStyle = getComputedStyle(document.documentElement);
        
        setSafeArea({
          top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
          bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
          left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0,
          right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0
        });
      }
    };

    updateSafeArea();
    window.addEventListener('orientationchange', updateSafeArea);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};

// Utility function to check if device supports touch
export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

// Utility function to get device type
export const getDeviceType = () => {
  const width = window.innerWidth;
  
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Utility function to check if device is iOS
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Utility function to check if device is Android
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

// Utility function to prevent zoom on iOS
export const preventIOSZoom = () => {
  if (isIOS()) {
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
  }
};

// Utility function to handle mobile viewport height issues
export const setMobileViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Initialize mobile optimizations
export const initializeMobileOptimizations = () => {
  preventIOSZoom();
  setMobileViewportHeight();
  
  window.addEventListener('resize', setMobileViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setMobileViewportHeight, 100);
  });
};
