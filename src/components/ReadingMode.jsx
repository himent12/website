import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

const ReadingMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const pageContainerRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const isMobile = useIsMobile();
  
  // Reading settings state
  const [readingMode, setReadingMode] = useState('day'); // day, night, sepia
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('lora');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [maxWidth, setMaxWidth] = useState(700);
  const [showSettings, setShowSettings] = useState(false);
  
  // Navigation and progress state
  const [readingProgress, setReadingProgress] = useState(0);
  // Removed unused currentChapter and setCurrentChapter
  // Removed unused totalChapters
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  
  // Animation and interaction state
  // Removed unused isScrolling, setIsScrolling, lastScrollTime, setLastScrollTime
  const [showControls, setShowControls] = useState(false); // Changed to false by default
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // Dual-mode reading state
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' or 'page'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Removed unused scrollPosition and pagePosition
  
  // Get the translated text from navigation state
  const translatedText = location.state?.translatedText || '';
  const originalTitle = location.state?.title || 'Translated Document';
  
  // Redirect if no text is provided
  useEffect(() => {
    if (!translatedText) {
      navigate('/');
    }
  }, [translatedText, navigate]);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('readerSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setReadingMode(settings.readingMode || 'day');
      setFontSize(settings.fontSize || 18);
      setFontFamily(settings.fontFamily || 'lora');
      setLineHeight(settings.lineHeight || 1.8);
      setMaxWidth(settings.maxWidth || 700);
      setViewMode(settings.viewMode || 'scroll');
    }
    
    const savedBookmarks = localStorage.getItem('readerBookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    const settings = {
      readingMode,
      fontSize,
      fontFamily,
      lineHeight,
      maxWidth,
      viewMode
    };
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [readingMode, fontSize, fontFamily, lineHeight, maxWidth, viewMode]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Enhanced scroll tracking with smooth progress updates (only for scroll mode)
  useEffect(() => {
    if (viewMode !== 'scroll') return;
    
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = Math.min((scrollTop / docHeight) * 100, 100);
          
          setReadingProgress(scrollPercent);
          setLastActivityTime(Date.now()); // Update activity time on scroll
          
          // Hide controls when scrolling
          setShowControls(false);
          setShowSettings(false);
          setShowBookmarks(false);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [viewMode]);

  // Inactivity timer to show controls after 45 seconds
  useEffect(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      setShowControls(true);
    }, 45000); // 45 seconds

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [lastActivityTime]);

  // Handle click on middle of screen to show/hide controls
  const handleScreenClick = useCallback((e) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Define middle area (center 1/3 of screen)
    const middleXStart = screenWidth * 0.33;
    const middleXEnd = screenWidth * 0.67;
    const middleYStart = screenHeight * 0.33;
    const middleYEnd = screenHeight * 0.67;
    
    if (clickX >= middleXStart && clickX <= middleXEnd &&
        clickY >= middleYStart && clickY <= middleYEnd) {
      setShowControls(!showControls);
      setLastActivityTime(Date.now());
    }
  }, [showControls]);

  // Add click event listener
  useEffect(() => {
    document.addEventListener('click', handleScreenClick);
    
    return () => {
      document.removeEventListener('click', handleScreenClick);
    };
  }, [handleScreenClick]);

  // Font options
  const fontOptions = useMemo(() => [
    { name: 'Lora', value: 'lora', class: 'font-lora' },
    { name: 'System', value: 'system', class: 'font-sans' },
    { name: 'Serif', value: 'serif', class: 'font-serif' },
    { name: 'Chinese', value: 'chinese', class: 'font-chinese' }
  ], []);

  // Format text with markdown-style formatting
  const formatText = useCallback((text) => {
    return text
      // Convert **** to bold
      .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<strong>$1</strong>')
      // Convert ** to italic
      .replace(/\*\*(.*?)\*\*/g, '<em>$1</em>')
      // Handle line breaks
      .replace(/\n/g, '<br />');
  }, []);

  // Split text into paragraphs - memoize to prevent infinite loops
  const paragraphs = useMemo(() => {
    return translatedText
      .split(/\n\s*\n/)
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => paragraph.trim());
  }, [translatedText]);

  // Pagination logic for page mode - optimized for mobile full-screen
  const paginateContent = useCallback(() => {
    if (!paragraphs.length || viewMode !== 'page') return;
    
    // Mobile full-screen optimized pagination calculation
    const headerHeight = isMobile ? 60 : 80; // Reduced header height for more content
    const paddingHeight = isMobile ? 16 : 80; // Minimal padding on mobile for maximum content space
    const availableHeight = window.innerHeight - headerHeight - paddingHeight;
    
    const lineHeightPx = fontSize * lineHeight;
    const paragraphMargin = isMobile ? 12 : 24; // Smaller margins on mobile for more content
    
    // Mobile full-screen optimized title height calculation
    const titleFontSize = isMobile ? fontSize * 1.1 : fontSize * 1.5; // Smaller title on mobile
    const metadataFontSize = isMobile ? fontSize * 0.7 : fontSize * 0.8;
    const titleHeight = titleFontSize * 1.2 + 8 + metadataFontSize * 1.2 + (isMobile ? 12 : 32);
    
    const newPages = [];
    let currentPageContent = [];
    let currentPageHeight = 0;
    let isFirstPage = true;
    
    // Add title height for first page
    if (isFirstPage) {
      currentPageHeight = titleHeight;
    }
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // Mobile full-screen optimized paragraph height estimation
      const words = paragraph.split(' ').length;
      const effectiveWidth = isMobile ? window.innerWidth - 24 : maxWidth; // Full width minus minimal padding
      const charWidth = isMobile ? fontSize * 0.5 : fontSize * 0.6; // Optimized character spacing for full-screen
      const charactersPerLine = Math.floor(effectiveWidth / charWidth);
      const wordsPerLine = Math.floor(charactersPerLine / 6); // Average word length ~5 chars + space
      const estimatedLines = Math.max(1, Math.ceil(words / wordsPerLine));
      const paragraphHeight = (estimatedLines * lineHeightPx) + paragraphMargin;
      
      // Check if adding this paragraph would exceed page height
      if (currentPageHeight + paragraphHeight > availableHeight && currentPageContent.length > 0) {
        // Save current page and start new one
        newPages.push({
          id: newPages.length + 1,
          content: [...currentPageContent],
          includeTitle: isFirstPage
        });
        
        currentPageContent = [paragraph];
        currentPageHeight = paragraphHeight;
        isFirstPage = false;
      } else {
        // Add paragraph to current page
        currentPageContent.push(paragraph);
        currentPageHeight += paragraphHeight;
      }
    }
    
    // Add the last page if it has content
    if (currentPageContent.length > 0) {
      newPages.push({
        id: newPages.length + 1,
        content: currentPageContent,
        includeTitle: isFirstPage
      });
    }
    
    setPages(newPages);
    setTotalPages(newPages.length);
    
    // Set current page to 1 if not set or invalid
    setCurrentPage(prev => {
      if (!prev || prev < 1 || prev > newPages.length) {
        return 1;
      }
      return prev;
    });
  }, [paragraphs, fontSize, lineHeight, maxWidth, viewMode, isMobile]);

  // Update pagination when relevant settings change
  useEffect(() => {
    if (viewMode === 'page') {
      paginateContent();
    }
  }, [paginateContent, viewMode]);

  // Page navigation functions
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentPage(prev => {
        const newPage = prev + 1;
        // Update reading progress using newPage to avoid stale closure
        const progress = (newPage / totalPages) * 100;
        setReadingProgress(progress);
        return newPage;
      });
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [totalPages, isTransitioning, currentPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentPage(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
      
      // Update reading progress
      const progress = ((currentPage - 2) / totalPages) * 100;
      setReadingProgress(Math.max(0, progress));
    }
  }, [currentPage, totalPages, isTransitioning]);

  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentPage(pageNumber);
      setTimeout(() => setIsTransitioning(false), 300);
      
      // Update reading progress
      const progress = ((pageNumber - 1) / totalPages) * 100;
      setReadingProgress(progress);
    }
  }, [currentPage, totalPages, isTransitioning]);

  // Mode switching functions
  const switchToScrollMode = useCallback(() => {
    if (viewMode === 'page') {
      // Calculate scroll position based on current page
      const scrollPercent = ((currentPage - 1) / totalPages) * 100;
      setViewMode('scroll');
      
      // Restore scroll position after mode switch
      setTimeout(() => {
        const targetScroll = (document.documentElement.scrollHeight - window.innerHeight) * (scrollPercent / 100);
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }, 100);
    }
  }, [viewMode, currentPage, totalPages]);

  const switchToPageMode = useCallback(() => {
    if (viewMode === 'scroll') {
      // Save current scroll position as a percentage
      const currentScrollPercent = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      setViewMode('page');
      
      // Reset to page 1 initially, then calculate proper page after pagination
      setCurrentPage(1);
      
      // Calculate current page based on scroll position after pagination completes
      setTimeout(() => {
        // Re-run pagination to get updated totalPages
        if (paragraphs.length > 0) {
          // Use the scroll percentage to determine target page after pagination
          const targetPage = Math.max(1, Math.ceil((currentScrollPercent / 100) * pages.length));
          if (pages.length > 0 && targetPage <= pages.length) {
            setCurrentPage(targetPage);
          }
        }
      }, 200);
    }
  }, [viewMode, paragraphs.length, pages.length]);

  // Enhanced touch gesture handling for page mode - optimized for mobile full-screen
  const handleTouchStart = useCallback((e) => {
    if (viewMode !== 'page') return;
    
    // Prevent default to avoid scrolling issues on mobile
    if (isMobile) {
      e.preventDefault();
    }
    
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, [viewMode, isMobile]);

  const handleTouchEnd = useCallback((e) => {
    if (viewMode !== 'page' || !touchStartRef.current) return;
    
    touchEndRef.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time;
    
    // Mobile full-screen optimized swipe detection
    const minSwipeDistance = isMobile ? 25 : 50; // Even lower threshold for full-screen mobile
    const maxSwipeTime = isMobile ? 500 : 300; // More generous time allowance for mobile
    const minSwipeVelocity = isMobile ? 0.1 : 0.2; // Minimum swipe velocity (pixels/ms)
    
    const swipeVelocity = Math.abs(deltaX) / deltaTime;
    
    // Enhanced swipe detection for full-screen mobile reading
    if ((Math.abs(deltaX) > minSwipeDistance || swipeVelocity > minSwipeVelocity) &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && // More lenient horizontal detection for full-screen
        deltaTime < maxSwipeTime) {
      
      // Add haptic feedback for mobile (if supported)
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(10); // Short vibration for page turn feedback
      }
      
      if (deltaX > 0) {
        // Swipe right - previous page
        goToPreviousPage();
      } else {
        // Swipe left - next page
        goToNextPage();
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [viewMode, goToPreviousPage, goToNextPage, isMobile]);

  // Keyboard navigation for page mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'page') return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToPreviousPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        default:
          // No action for other keys
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, totalPages, goToNextPage, goToPreviousPage, goToPage]);

  // Theme configurations
  const themes = {
    day: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      contentBg: 'bg-white/80 backdrop-blur-sm',
      text: 'text-gray-900',
      secondaryText: 'text-gray-600',
      border: 'border-gray-200',
      shadow: 'shadow-lg shadow-gray-200/50',
      controlsBg: 'bg-white/95 backdrop-blur-md',
      buttonHover: 'hover:bg-gray-100',
      accent: 'text-amber-600'
    },
    night: {
      bg: 'bg-gradient-to-br from-gray-900 to-slate-900',
      contentBg: 'bg-gray-800/80 backdrop-blur-sm',
      text: 'text-gray-100',
      secondaryText: 'text-gray-300',
      border: 'border-gray-700',
      shadow: 'shadow-lg shadow-black/50',
      controlsBg: 'bg-gray-800/95 backdrop-blur-md',
      buttonHover: 'hover:bg-gray-700',
      accent: 'text-blue-400'
    },
    sepia: {
      bg: 'bg-gradient-to-br from-amber-100 to-yellow-100',
      contentBg: 'bg-amber-50/80 backdrop-blur-sm',
      text: 'text-amber-900',
      secondaryText: 'text-amber-700',
      border: 'border-amber-200',
      shadow: 'shadow-lg shadow-amber-200/50',
      controlsBg: 'bg-amber-50/95 backdrop-blur-md',
      buttonHover: 'hover:bg-amber-100',
      accent: 'text-amber-700'
    }
  };

  const currentTheme = themes[readingMode];

  // Navigation functions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Bookmark functions
  const addBookmark = () => {
    const scrollPercent = Math.round(readingProgress);
    const newBookmark = {
      id: Date.now(),
      position: scrollPercent,
      timestamp: new Date().toLocaleString(),
      preview: paragraphs[Math.floor(paragraphs.length * (scrollPercent / 100))]?.substring(0, 100) + '...'
    };
    
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    localStorage.setItem('readerBookmarks', JSON.stringify(updatedBookmarks));
  };

  const removeBookmark = (id) => {
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updatedBookmarks);
    localStorage.setItem('readerBookmarks', JSON.stringify(updatedBookmarks));
  };

  const jumpToBookmark = (position) => {
    const targetScroll = (document.documentElement.scrollHeight - window.innerHeight) * (position / 100);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setShowBookmarks(false);
  };


  return (
    <div className={`min-h-screen transition-all duration-500 ${currentTheme.bg} ${isMobile ? 'mobile-full-height mobile-viewport-fix' : ''}`}>
      {/* Enhanced Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-black/10 z-50">
        <div
          className={`h-full transition-all duration-300 ${currentTheme.accent.replace('text-', 'bg-')}`}
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Controls Header */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${currentTheme.controlsBg} ${currentTheme.border} border ${currentTheme.shadow}`}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-full transition-colors ${currentTheme.buttonHover}`}
            title="Back to Translator"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Removed unused chapter navigation */}

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1">
            <button
              onClick={switchToScrollMode}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'scroll' ? currentTheme.accent : currentTheme.buttonHover
              }`}
              title="Scroll Mode"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <button
              onClick={switchToPageMode}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'page' ? currentTheme.accent : currentTheme.buttonHover
              }`}
              title="Page Mode"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>

          {/* Progress Display */}
          <div className={`px-3 py-1 text-sm font-medium ${currentTheme.secondaryText}`}>
            {viewMode === 'page' ? `${currentPage}/${totalPages}` : `${Math.round(readingProgress)}%`}
          </div>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${currentTheme.buttonHover} ${showSettings ? currentTheme.accent : ''}`}
            title="Reading Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Bookmarks Toggle */}
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`p-2 rounded-full transition-colors ${currentTheme.buttonHover} ${showBookmarks ? currentTheme.accent : ''}`}
            title="Bookmarks"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md ${currentTheme.controlsBg} rounded-2xl ${currentTheme.shadow} border ${currentTheme.border} overflow-hidden`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold ${currentTheme.text}`}>Reading Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`p-2 rounded-full ${currentTheme.buttonHover}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Reading Mode */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>Reading Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(themes).map(([mode, theme]) => (
                      <button
                        key={mode}
                        onClick={() => setReadingMode(mode)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          readingMode === mode 
                            ? `${theme.border} ${theme.bg}` 
                            : `border-transparent ${currentTheme.buttonHover}`
                        }`}
                      >
                        <div className={`w-full h-8 rounded ${theme.bg} mb-2`}></div>
                        <span className={`text-xs font-medium capitalize ${currentTheme.text}`}>{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${currentTheme.border} ${currentTheme.controlsBg} ${currentTheme.text}`}
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>
                    Line Height: {lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Max Width - Mobile Optimized */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>
                    Content Width: {isMobile ? 'Full Screen' : `${maxWidth}px`}
                  </label>
                  {!isMobile && (
                    <input
                      type="range"
                      min="600"
                      max="900"
                      step="50"
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(Number(e.target.value))}
                      className="w-full"
                    />
                  )}
                  {isMobile && (
                    <div className={`p-3 rounded-lg border ${currentTheme.border} ${currentTheme.controlsBg}`}>
                      <p className={`text-sm ${currentTheme.secondaryText}`}>
                        Mobile uses full-screen width for optimal reading experience
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md ${currentTheme.controlsBg} rounded-2xl ${currentTheme.shadow} border ${currentTheme.border} overflow-hidden`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold ${currentTheme.text}`}>Bookmarks</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addBookmark}
                    className={`p-2 rounded-full ${currentTheme.buttonHover}`}
                    title="Add Bookmark"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowBookmarks(false)}
                    className={`p-2 rounded-full ${currentTheme.buttonHover}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <p className={`text-center py-8 ${currentTheme.secondaryText}`}>
                    No bookmarks yet. Add one to save your reading position.
                  </p>
                ) : (
                  bookmarks.map(bookmark => (
                    <div
                      key={bookmark.id}
                      className={`p-3 rounded-lg border ${currentTheme.border} ${currentTheme.buttonHover} cursor-pointer group`}
                      onClick={() => jumpToBookmark(bookmark.position)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${currentTheme.text} mb-1`}>
                            {bookmark.position}% - {bookmark.timestamp}
                          </div>
                          <div className={`text-xs ${currentTheme.secondaryText} line-clamp-2`}>
                            {bookmark.preview}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmark(bookmark.id);
                          }}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${currentTheme.buttonHover}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Content */}
      {viewMode === 'scroll' ? (
        // Scroll Mode Content - Mobile Full-Screen Optimized
        <div className={`pt-20 pb-16 ${isMobile ? 'mobile-full-screen-scroll' : ''}`}>
          <div className={`${isMobile ? 'mobile-edge-to-edge' : 'max-w-4xl mx-auto px-4 sm:px-6'}`}>
            {/* Document Header - Mobile Optimized */}
            <div className={`${isMobile ? 'mb-4 p-3 mx-1' : 'mb-8 p-6'} rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border}`}>
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold ${isMobile ? 'mb-2' : 'mb-4'} ${currentTheme.text}`}>
                {originalTitle}
              </h1>
              <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'} ${currentTheme.secondaryText}`}>
                <span>Translated from Chinese</span>
                <span>•</span>
                <span>{paragraphs.length} paragraphs</span>
                <span>•</span>
                <span>~{Math.ceil(translatedText.split(' ').length / 200)} min read</span>
              </div>
            </div>

            {/* Reading Content - Mobile Full-Width */}
            <article
              ref={contentRef}
              className={`${currentTheme.contentBg} ${currentTheme.shadow} ${isMobile ? 'rounded-lg mx-1' : 'rounded-2xl'} border ${currentTheme.border} overflow-hidden`}
              style={{
                maxWidth: isMobile ? 'none' : `${maxWidth}px`,
                margin: isMobile ? '0' : '0 auto',
                width: isMobile ? 'calc(100% - 8px)' : 'auto'
              }}
            >
              <div className={`${isMobile ? 'p-3 mobile-reading-padding' : 'p-8 sm:p-12'}`}>
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={`${isMobile ? 'mb-4' : 'mb-8'} ${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} mobile-reading-text`}
                    style={{
                      fontSize: `${isMobile ? Math.max(fontSize - 1, 14) : fontSize}px`,
                      lineHeight: isMobile ? Math.max(lineHeight - 0.1, 1.5) : lineHeight,
                      textAlign: isMobile ? 'left' : 'justify',
                      textJustify: isMobile ? 'auto' : 'inter-word',
                      wordBreak: isMobile ? 'break-word' : 'normal',
                      hyphens: isMobile ? 'auto' : 'none'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: formatText(paragraph)
                    }}
                  />
                ))}
              </div>
            </article>

            {/* End of Document - Mobile Optimized */}
            <div className={`${isMobile ? 'mt-6 text-center p-4 mx-1' : 'mt-12 text-center p-8'} rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border}`}>
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-medium ${isMobile ? 'mb-2' : 'mb-4'} ${currentTheme.text}`}>
                End of Document
              </div>
              <p className={`${isMobile ? 'mb-4 text-sm' : 'mb-6'} ${currentTheme.secondaryText}`}>
                Thank you for reading! Would you like to translate another document?
              </p>
              <button
                onClick={() => navigate('/')}
                className={`${isMobile ? 'px-6 py-2 text-sm' : 'px-8 py-3'} rounded-full font-medium transition-all transform hover:scale-105 ${
                  readingMode === 'night'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                } shadow-lg touch-target`}
              >
                Translate Another Document
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Page Mode Content - Mobile Full-Screen Optimized
        <div
          className={`fixed inset-0 overflow-hidden ${isMobile ? 'mobile-content-container mobile-full-screen-page' : ''}`}
          style={{
            paddingTop: isMobile ? '60px' : '80px',
            paddingBottom: isMobile ? '8px' : '64px',
            paddingLeft: isMobile ? '4px' : '16px',
            paddingRight: isMobile ? '4px' : '16px'
          }}
          ref={pageContainerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`h-full flex items-stretch justify-center ${isMobile ? 'mobile-page-wrapper' : 'px-4 sm:px-6'}`}>
            <div className="relative w-full h-full" style={{ maxWidth: isMobile ? '100%' : '1024px' }}>
              {/* Page Content Container - Full Screen Mobile */}
              <div className={`relative h-full overflow-hidden ${isMobile ? 'mobile-page-content mobile-edge-to-edge-page' : ''}`}>
                {pages.length > 0 && currentPage >= 1 && currentPage <= pages.length && pages[currentPage - 1] && (
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      isTransitioning ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'
                    }`}
                  >
                    <article
                      className={`h-full ${currentTheme.contentBg} ${currentTheme.shadow} ${isMobile ? 'mobile-page-article' : 'rounded-2xl'} border ${currentTheme.border} overflow-hidden`}
                      style={{
                        maxWidth: '100%',
                        margin: '0',
                        height: '100%',
                        borderRadius: isMobile ? '8px' : '16px'
                      }}
                    >
                      <div className={`h-full flex flex-col ${isMobile ? 'mobile-page-inner' : 'p-8 sm:p-12'}`}>
                        {/* Page Header - Mobile Full-Screen Optimized */}
                        {pages[currentPage - 1]?.includeTitle && (
                          <div className={`${isMobile ? 'mb-3 px-3 pt-3' : 'mb-8'} flex-shrink-0`}>
                            <h1 className={`${isMobile ? 'text-lg' : 'text-2xl sm:text-3xl'} font-bold ${isMobile ? 'mb-1' : 'mb-4'} ${currentTheme.text}`}>
                              {originalTitle}
                            </h1>
                            <div className={`flex flex-wrap items-center gap-1 ${isMobile ? 'text-xs' : 'text-sm'} ${currentTheme.secondaryText} ${isMobile ? 'mb-2' : 'mb-8'}`}>
                              <span>Translated from Chinese</span>
                              <span>•</span>
                              <span>{paragraphs.length} paragraphs</span>
                              <span>•</span>
                              <span>~{Math.ceil(translatedText.split(' ').length / 200)} min read</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Page Content - Mobile Full-Screen Reading */}
                        <div className={`flex-1 overflow-y-auto ${isMobile ? 'mobile-text-container mobile-full-width-text px-3' : ''} scrollbar-hide`} style={{ minHeight: 0 }}>
                          <div className={`${isMobile ? 'pb-2' : 'pb-8'}`}>
                            {pages[currentPage - 1]?.content.map((paragraph, index) => (
                              <p
                                key={`${currentPage}-${index}`}
                                className={`${isMobile ? 'mb-3' : 'mb-6'} ${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} mobile-reading-text`}
                                style={{
                                  fontSize: `${isMobile ? Math.max(fontSize - 1, 14) : fontSize}px`,
                                  lineHeight: isMobile ? Math.max(lineHeight - 0.05, 1.5) : lineHeight,
                                  textAlign: isMobile ? 'left' : 'justify',
                                  textJustify: isMobile ? 'auto' : 'inter-word',
                                  wordBreak: isMobile ? 'break-word' : 'normal',
                                  hyphens: isMobile ? 'auto' : 'none',
                                  marginLeft: 0,
                                  marginRight: 0
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: formatText(paragraph)
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* End of Document on Last Page - Mobile Optimized */}
                        {currentPage === totalPages && (
                          <div className={`${isMobile ? 'mt-3 px-3 pb-3' : 'mt-8'} text-center flex-shrink-0`}>
                            <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-medium ${isMobile ? 'mb-1' : 'mb-4'} ${currentTheme.text}`}>
                              End of Document
                            </div>
                            <p className={`${isMobile ? 'mb-3 text-xs' : 'mb-6'} ${currentTheme.secondaryText}`}>
                              Thank you for reading! Would you like to translate another document?
                            </p>
                            <button
                              onClick={() => navigate('/')}
                              className={`${isMobile ? 'px-4 py-2 text-xs' : 'px-8 py-3'} rounded-full font-medium transition-all transform hover:scale-105 ${
                                readingMode === 'night'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              } shadow-lg touch-target`}
                            >
                              Translate Another Document
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                )}
              </div>
              
              {/* Page Navigation Arrows - Only show when controls are visible */}
              {showControls && (
                <>
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage <= 1}
                      className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                        currentPage <= 1
                          ? 'opacity-30 cursor-not-allowed'
                          : `${currentTheme.controlsBg} ${currentTheme.shadow} border ${currentTheme.border} hover:opacity-100`
                      }`}
                      title="Previous Page"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages}
                      className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                        currentPage >= totalPages
                          ? 'opacity-30 cursor-not-allowed'
                          : `${currentTheme.controlsBg} ${currentTheme.shadow} border ${currentTheme.border} hover:opacity-100`
                      }`}
                      title="Next Page"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons - Only show when controls are visible and in scroll mode */}
      {showControls && viewMode === 'scroll' && (
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
          {/* Scroll to Top */}
          {readingProgress > 10 && (
            <button
              onClick={scrollToTop}
              className={`w-12 h-12 rounded-full ${currentTheme.controlsBg} ${currentTheme.shadow} border ${currentTheme.border} flex items-center justify-center transition-all transform hover:scale-110`}
              title="Scroll to Top"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          )}

          {/* Scroll to Bottom */}
          {readingProgress < 90 && (
            <button
              onClick={scrollToBottom}
              className={`w-12 h-12 rounded-full ${currentTheme.controlsBg} ${currentTheme.shadow} border ${currentTheme.border} flex items-center justify-center transition-all transform hover:scale-110`}
              title="Scroll to Bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Page Mode Instructions - Show briefly when first entering page mode */}
      {viewMode === 'page' && showControls && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className={`px-4 py-2 rounded-full ${currentTheme.controlsBg} ${currentTheme.shadow} border ${currentTheme.border}`}>
            <p className={`text-sm ${currentTheme.secondaryText} text-center`}>
              Use arrow keys, swipe, or click arrows to navigate pages
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingMode;
