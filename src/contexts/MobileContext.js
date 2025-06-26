import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Mobile state management
const initialState = {
  // Device Detection
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  deviceType: 'desktop',
  
  // Screen Information
  screenSize: { width: 0, height: 0 },
  orientation: 'portrait',
  isPortrait: true,
  isLandscape: false,
  
  // Device Capabilities
  isTouchDevice: false,
  isIOS: false,
  isAndroid: false,
  hasNotch: false,
  
  // Viewport Management
  viewportHeight: 0,
  safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  isKeyboardOpen: false,
  
  // User Preferences
  preferredTextSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  darkMode: false,
  
  // App State
  isFullscreen: false,
  currentBreakpoint: 'desktop',
  
  // Performance
  connectionType: 'unknown',
  isLowEndDevice: false
};

// Action types
const MOBILE_ACTIONS = {
  SET_DEVICE_INFO: 'SET_DEVICE_INFO',
  SET_SCREEN_SIZE: 'SET_SCREEN_SIZE',
  SET_ORIENTATION: 'SET_ORIENTATION',
  SET_VIEWPORT_HEIGHT: 'SET_VIEWPORT_HEIGHT',
  SET_KEYBOARD_STATE: 'SET_KEYBOARD_STATE',
  SET_SAFE_AREA: 'SET_SAFE_AREA',
  SET_USER_PREFERENCES: 'SET_USER_PREFERENCES',
  SET_FULLSCREEN: 'SET_FULLSCREEN',
  SET_CONNECTION_TYPE: 'SET_CONNECTION_TYPE',
  UPDATE_BREAKPOINT: 'UPDATE_BREAKPOINT'
};

// Reducer
function mobileReducer(state, action) {
  switch (action.type) {
    case MOBILE_ACTIONS.SET_DEVICE_INFO:
      return {
        ...state,
        ...action.payload
      };
    
    case MOBILE_ACTIONS.SET_SCREEN_SIZE:
      const { width, height } = action.payload;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      return {
        ...state,
        screenSize: { width, height },
        isMobile,
        isTablet,
        isDesktop,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        currentBreakpoint: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl'
      };
    
    case MOBILE_ACTIONS.SET_ORIENTATION:
      return {
        ...state,
        orientation: action.payload,
        isPortrait: action.payload === 'portrait',
        isLandscape: action.payload === 'landscape'
      };
    
    case MOBILE_ACTIONS.SET_VIEWPORT_HEIGHT:
      return {
        ...state,
        viewportHeight: action.payload
      };
    
    case MOBILE_ACTIONS.SET_KEYBOARD_STATE:
      return {
        ...state,
        isKeyboardOpen: action.payload
      };
    
    case MOBILE_ACTIONS.SET_SAFE_AREA:
      return {
        ...state,
        safeAreaInsets: action.payload
      };
    
    case MOBILE_ACTIONS.SET_USER_PREFERENCES:
      return {
        ...state,
        ...action.payload
      };
    
    case MOBILE_ACTIONS.SET_FULLSCREEN:
      return {
        ...state,
        isFullscreen: action.payload
      };
    
    case MOBILE_ACTIONS.SET_CONNECTION_TYPE:
      return {
        ...state,
        connectionType: action.payload
      };
    
    case MOBILE_ACTIONS.UPDATE_BREAKPOINT:
      return {
        ...state,
        currentBreakpoint: action.payload
      };
    
    default:
      return state;
  }
}

// Context
const MobileContext = createContext();

// Provider component
export function MobileProvider({ children }) {
  const [state, dispatch] = useReducer(mobileReducer, initialState);

  // Device detection utilities
  const detectDevice = () => {
    const userAgent = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const deviceInfo = {
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isIOS: /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream,
      isAndroid: /Android/.test(userAgent),
      hasNotch: CSS.supports('padding', 'env(safe-area-inset-top)') && 
                parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) > 0,
      isLowEndDevice: navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2
    };
    
    dispatch({ type: MOBILE_ACTIONS.SET_DEVICE_INFO, payload: deviceInfo });
    dispatch({ type: MOBILE_ACTIONS.SET_SCREEN_SIZE, payload: { width, height } });
  };

  // Orientation detection
  const detectOrientation = () => {
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    dispatch({ type: MOBILE_ACTIONS.SET_ORIENTATION, payload: orientation });
  };

  // Viewport height management
  const updateViewportHeight = () => {
    const vh = window.innerHeight;
    dispatch({ type: MOBILE_ACTIONS.SET_VIEWPORT_HEIGHT, payload: vh });
    
    // Set CSS custom property for mobile viewport
    document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
  };

  // Keyboard detection
  const detectKeyboard = () => {
    const initialHeight = window.innerHeight;
    let currentHeight = window.innerHeight;
    
    const checkKeyboard = () => {
      currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      const isKeyboardOpen = heightDifference > 150;
      
      dispatch({ type: MOBILE_ACTIONS.SET_KEYBOARD_STATE, payload: isKeyboardOpen });
    };
    
    return checkKeyboard;
  };

  // Safe area detection
  const updateSafeArea = () => {
    if (CSS.supports('padding', 'env(safe-area-inset-top)')) {
      const computedStyle = getComputedStyle(document.documentElement);
      
      const safeArea = {
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0,
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0
      };
      
      dispatch({ type: MOBILE_ACTIONS.SET_SAFE_AREA, payload: safeArea });
    }
  };

  // User preferences detection
  const detectUserPreferences = () => {
    const preferences = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };
    
    dispatch({ type: MOBILE_ACTIONS.SET_USER_PREFERENCES, payload: preferences });
  };

  // Connection type detection
  const detectConnection = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      dispatch({ type: MOBILE_ACTIONS.SET_CONNECTION_TYPE, payload: connection.effectiveType || 'unknown' });
    }
  };

  // Initialize and set up event listeners
  useEffect(() => {
    // Initial detection
    detectDevice();
    detectOrientation();
    updateViewportHeight();
    updateSafeArea();
    detectUserPreferences();
    detectConnection();

    // Event listeners
    const handleResize = () => {
      detectDevice();
      detectOrientation();
      updateViewportHeight();
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        detectOrientation();
        updateViewportHeight();
        updateSafeArea();
      }, 100);
    };

    const keyboardDetector = detectKeyboard();

    // Media query listeners for user preferences
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handlePreferenceChange = () => {
      detectUserPreferences();
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', keyboardDetector);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    reducedMotionQuery.addEventListener('change', handlePreferenceChange);
    highContrastQuery.addEventListener('change', handlePreferenceChange);
    darkModeQuery.addEventListener('change', handlePreferenceChange);

    // Connection change listener
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      connection.addEventListener('change', detectConnection);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', keyboardDetector);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      reducedMotionQuery.removeEventListener('change', handlePreferenceChange);
      highContrastQuery.removeEventListener('change', handlePreferenceChange);
      darkModeQuery.removeEventListener('change', handlePreferenceChange);

      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        connection.removeEventListener('change', detectConnection);
      }
    };
  }, []);

  // Context value with actions
  const contextValue = {
    ...state,
    actions: {
      setFullscreen: (isFullscreen) => {
        dispatch({ type: MOBILE_ACTIONS.SET_FULLSCREEN, payload: isFullscreen });
      },
      setTextSize: (size) => {
        dispatch({ type: MOBILE_ACTIONS.SET_USER_PREFERENCES, payload: { preferredTextSize: size } });
      },
      updateBreakpoint: (breakpoint) => {
        dispatch({ type: MOBILE_ACTIONS.UPDATE_BREAKPOINT, payload: breakpoint });
      }
    }
  };

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
    </MobileContext.Provider>
  );
}

// Custom hook to use mobile context
export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

// Utility hooks for specific mobile features
export function useMobileBreakpoint() {
  const { currentBreakpoint, isMobile, isTablet, isDesktop } = useMobile();
  return { currentBreakpoint, isMobile, isTablet, isDesktop };
}

export function useMobileOrientation() {
  const { orientation, isPortrait, isLandscape } = useMobile();
  return { orientation, isPortrait, isLandscape };
}

export function useMobileViewport() {
  const { screenSize, viewportHeight, isKeyboardOpen, safeAreaInsets } = useMobile();
  return { screenSize, viewportHeight, isKeyboardOpen, safeAreaInsets };
}

export function useMobileCapabilities() {
  const { isTouchDevice, isIOS, isAndroid, hasNotch, isLowEndDevice, connectionType } = useMobile();
  return { isTouchDevice, isIOS, isAndroid, hasNotch, isLowEndDevice, connectionType };
}

export function useMobilePreferences() {
  const { preferredTextSize, reducedMotion, highContrast, darkMode, actions } = useMobile();
  return { 
    preferredTextSize, 
    reducedMotion, 
    highContrast, 
    darkMode,
    setTextSize: actions.setTextSize
  };
}