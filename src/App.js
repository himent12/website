
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from 'react';
import { MobileProvider, useMobile } from './contexts/MobileContext';
import { initializeMobileOptimizations } from './utils/mobileUtils';
import TabContainer from './components/TabContainer';
import ReadingMode from './components/ReadingMode';
import ReaderDemo from './components/ReaderDemo';
import './App.css';

// Device-aware app wrapper component
function AppContent() {
  const {
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
    orientation,
    isKeyboardOpen,
    safeAreaInsets,
    preferredTextSize,
    reducedMotion,
    darkMode,
    isLowEndDevice,
    connectionType
  } = useMobile();

  // Apply device-specific classes to body
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // Clear existing device classes
    body.classList.remove('mobile-device', 'tablet-device', 'desktop-device');
    body.classList.remove('portrait-orientation', 'landscape-orientation');
    body.classList.remove('keyboard-open', 'keyboard-closed');
    body.classList.remove('reduced-motion', 'low-end-device');
    body.classList.remove('dark-mode', 'light-mode');
    
    // Add current device classes
    body.classList.add(`${deviceType}-device`);
    body.classList.add(`${orientation}-orientation`);
    body.classList.add(isKeyboardOpen ? 'keyboard-open' : 'keyboard-closed');
    
    if (reducedMotion) body.classList.add('reduced-motion');
    if (isLowEndDevice) body.classList.add('low-end-device');
    if (darkMode) body.classList.add('dark-mode');
    else body.classList.add('light-mode');
    
    // Set CSS custom properties for safe areas
    html.style.setProperty('--safe-area-inset-top', `${safeAreaInsets.top}px`);
    html.style.setProperty('--safe-area-inset-bottom', `${safeAreaInsets.bottom}px`);
    html.style.setProperty('--safe-area-inset-left', `${safeAreaInsets.left}px`);
    html.style.setProperty('--safe-area-inset-right', `${safeAreaInsets.right}px`);
    
    // Set text size preference
    html.style.setProperty('--preferred-text-size', preferredTextSize);
    
    // Add connection type class for performance optimizations
    body.classList.remove('connection-slow', 'connection-fast');
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      body.classList.add('connection-slow');
    } else if (connectionType === '4g' || connectionType === '5g') {
      body.classList.add('connection-fast');
    }
    
  }, [
    deviceType,
    orientation,
    isKeyboardOpen,
    safeAreaInsets,
    preferredTextSize,
    reducedMotion,
    darkMode,
    isLowEndDevice,
    connectionType
  ]);

  // Device-specific route rendering
  const renderRoutes = () => {
    return (
      <Routes>
        <Route path="/" element={<TabContainer />} />
        <Route path="/reading" element={<ReadingMode />} />
        <Route path="/demo" element={<ReaderDemo />} />
      </Routes>
    );
  };

  return (
    <div
      className={`
        app-container
        ${isMobile ? 'mobile-layout' : ''}
        ${isTablet ? 'tablet-layout' : ''}
        ${isDesktop ? 'desktop-layout' : ''}
        ${isKeyboardOpen ? 'keyboard-active' : ''}
        ${reducedMotion ? 'reduce-motion' : ''}
      `}
      style={{
        paddingTop: `max(0px, ${safeAreaInsets.top}px)`,
        paddingBottom: `max(0px, ${safeAreaInsets.bottom}px)`,
        paddingLeft: `max(0px, ${safeAreaInsets.left}px)`,
        paddingRight: `max(0px, ${safeAreaInsets.right}px)`,
      }}
    >
      {renderRoutes()}
      
      {/* Performance monitoring for low-end devices */}
      {!isLowEndDevice && <SpeedInsights />}
      {!isLowEndDevice && <Analytics />}
      
      {/* Mobile-specific accessibility announcements */}
      <div
        id="mobile-announcements"
        aria-live="polite"
        aria-atomic="true"
        className="mobile-sr-only"
      />
    </div>
  );
}

function App() {
  // Initialize mobile optimizations on app start
  useEffect(() => {
    // Initialize mobile utilities and optimizations
    initializeMobileOptimizations();
    
    // Add app-level mobile optimizations
    document.body.classList.add('mobile-optimized');
    
    // Prevent zoom on iOS double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // Cleanup function
    return () => {
      document.body.classList.remove('mobile-optimized');
    };
  }, []);

  return (
    <MobileProvider>
      <Router>
        <AppContent />
      </Router>
    </MobileProvider>
  );
}

export default App;

