// Enhanced Mobile Utility Functions
// Comprehensive gesture handling, viewport management, and mobile optimizations

// Gesture Detection and Handling
export class GestureHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: 50,
      velocity: 0.3,
      preventScroll: false,
      ...options
    };
    
    this.startPoint = null;
    this.currentPoint = null;
    this.isTracking = false;
    this.startTime = null;
    
    this.init();
  }
  
  init() {
    if (!this.element) return;
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: !this.options.preventScroll });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: !this.options.preventScroll });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
  }
  
  handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    this.startPoint = { x: touch.clientX, y: touch.clientY };
    this.currentPoint = { ...this.startPoint };
    this.isTracking = true;
    this.startTime = Date.now();
    
    if (this.options.preventScroll) {
      e.preventDefault();
    }
    
    this.onGestureStart?.(this.startPoint);
  }
  
  handleTouchMove(e) {
    if (!this.isTracking || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    this.currentPoint = { x: touch.clientX, y: touch.clientY };
    
    const deltaX = this.currentPoint.x - this.startPoint.x;
    const deltaY = this.currentPoint.y - this.startPoint.y;
    
    if (this.options.preventScroll) {
      e.preventDefault();
    }
    
    this.onGestureMove?.(deltaX, deltaY, this.currentPoint);
  }
  
  handleTouchEnd(e) {
    if (!this.isTracking) return;
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const deltaX = this.currentPoint.x - this.startPoint.x;
    const deltaY = this.currentPoint.y - this.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;
    
    // Determine gesture type
    const gesture = this.analyzeGesture(deltaX, deltaY, distance, velocity, duration);
    
    this.onGestureEnd?.(gesture, deltaX, deltaY);
    this.reset();
  }
  
  handleTouchCancel() {
    this.onGestureCancel?.();
    this.reset();
  }
  
  analyzeGesture(deltaX, deltaY, distance, velocity, duration) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Tap detection
    if (distance < 10 && duration < 300) {
      return { type: 'tap', point: this.startPoint };
    }
    
    // Long press detection
    if (distance < 10 && duration > 500) {
      return { type: 'longpress', point: this.startPoint };
    }
    
    // Swipe detection
    if (distance > this.options.threshold && velocity > this.options.velocity) {
      if (absX > absY) {
        return {
          type: 'swipe',
          direction: deltaX > 0 ? 'right' : 'left',
          distance: absX,
          velocity
        };
      } else {
        return {
          type: 'swipe',
          direction: deltaY > 0 ? 'down' : 'up',
          distance: absY,
          velocity
        };
      }
    }
    
    // Pan detection
    if (distance > 10) {
      return {
        type: 'pan',
        deltaX,
        deltaY,
        distance,
        velocity
      };
    }
    
    return { type: 'unknown' };
  }
  
  reset() {
    this.startPoint = null;
    this.currentPoint = null;
    this.isTracking = false;
    this.startTime = null;
  }
  
  destroy() {
    if (!this.element) return;
    
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}

// Viewport Management Utilities
export class ViewportManager {
  constructor() {
    this.callbacks = new Set();
    this.isInitialized = false;
    this.currentViewport = this.getViewportInfo();
    
    this.init();
  }
  
  init() {
    if (this.isInitialized) return;
    
    this.updateViewportHeight();
    this.setupEventListeners();
    this.isInitialized = true;
  }
  
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      availableHeight: window.screen.availHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    };
  }
  
  updateViewportHeight() {
    // Set CSS custom properties for mobile viewport handling
    const vh = window.innerHeight * 0.01;
    const vw = window.innerWidth * 0.01;
    
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vw', `${vw}px`);
    
    // Handle safe area insets
    this.updateSafeAreaInsets();
  }
  
  updateSafeAreaInsets() {
    if (CSS.supports('padding', 'env(safe-area-inset-top)')) {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const safeAreaTop = computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px';
      const safeAreaBottom = computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px';
      const safeAreaLeft = computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px';
      const safeAreaRight = computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px';
      
      root.style.setProperty('--safe-area-top', safeAreaTop);
      root.style.setProperty('--safe-area-bottom', safeAreaBottom);
      root.style.setProperty('--safe-area-left', safeAreaLeft);
      root.style.setProperty('--safe-area-right', safeAreaRight);
    }
  }
  
  setupEventListeners() {
    const handleResize = () => {
      this.updateViewportHeight();
      const newViewport = this.getViewportInfo();
      this.notifyCallbacks('resize', newViewport);
      this.currentViewport = newViewport;
    };
    
    const handleOrientationChange = () => {
      setTimeout(() => {
        this.updateViewportHeight();
        const newViewport = this.getViewportInfo();
        this.notifyCallbacks('orientationchange', newViewport);
        this.currentViewport = newViewport;
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Visual viewport API support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.notifyCallbacks('visualviewport', {
          ...this.currentViewport,
          visualHeight: window.visualViewport.height,
          visualWidth: window.visualViewport.width
        });
      });
    }
  }
  
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  notifyCallbacks(event, data) {
    this.callbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Viewport callback error:', error);
      }
    });
  }
}

// Touch and Interaction Utilities
export const TouchUtils = {
  // Prevent iOS zoom on double tap
  preventZoom(element) {
    if (!element) return;
    
    let lastTouchEnd = 0;
    element.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  },
  
  // Improve touch responsiveness
  optimizeTouchResponse(element) {
    if (!element) return;
    
    element.style.touchAction = 'manipulation';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
  },
  
  // Add haptic feedback (if supported)
  hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        error: [50, 100, 50]
      };
      
      navigator.vibrate(patterns[type] || patterns.light);
    }
  },
  
  // Check if element is in touch-friendly size
  isTouchFriendly(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const minSize = 44; // Apple's recommended minimum touch target size
    
    return rect.width >= minSize && rect.height >= minSize;
  }
};

// Performance Optimization Utilities
export const PerformanceUtils = {
  // Throttle function for scroll/resize events
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Debounce function for input events
  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },
  
  // Request animation frame with fallback
  requestAnimationFrame(callback) {
    return (window.requestAnimationFrame || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame || 
            function(callback) { setTimeout(callback, 16); })(callback);
  },
  
  // Check if device is low-end
  isLowEndDevice() {
    return (navigator.hardwareConcurrency <= 2) || 
           (navigator.deviceMemory <= 2) ||
           (navigator.connection && navigator.connection.effectiveType === 'slow-2g');
  }
};

// Mobile-specific DOM utilities
export const MobileDOMUtils = {
  // Add mobile-optimized classes
  addMobileClasses(element) {
    if (!element) return;
    
    element.classList.add('touch-manipulation');
    
    if (this.isMobileDevice()) {
      element.classList.add('mobile-optimized');
    }
  },
  
  // Check if current device is mobile
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  },
  
  // Optimize images for mobile
  optimizeImagesForMobile() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // Add mobile-friendly attributes
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    });
  },
  
  // Set up mobile-friendly focus management
  setupMobileFocus() {
    // Remove focus outline on touch devices
    document.addEventListener('touchstart', () => {
      document.body.classList.add('using-touch');
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-touch');
      }
    });
  }
};

// Accessibility utilities for mobile
export const MobileA11yUtils = {
  // Announce to screen readers
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
  
  // Check if user prefers reduced motion
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  // Set up skip links for mobile navigation
  setupSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      border-radius: 4px;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
};

// Initialize mobile optimizations
export function initializeMobileOptimizations() {
  // Set up viewport manager
  const viewportManager = new ViewportManager();
  
  // Optimize DOM for mobile
  MobileDOMUtils.setupMobileFocus();
  MobileDOMUtils.optimizeImagesForMobile();
  
  // Set up accessibility features
  MobileA11yUtils.setupSkipLinks();
  
  // Prevent zoom on iOS
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    TouchUtils.preventZoom(document.body);
    
    // Prevent zoom on form inputs
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.style.fontSize === '' || parseFloat(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
  }
  
  return viewportManager;
}

// Export singleton instances
export const viewportManager = new ViewportManager();

// Named export for the utilities object
const MobileUtilities = {
  GestureHandler,
  ViewportManager,
  TouchUtils,
  PerformanceUtils,
  MobileDOMUtils,
  MobileA11yUtils,
  initializeMobileOptimizations,
  viewportManager
};

export default MobileUtilities;