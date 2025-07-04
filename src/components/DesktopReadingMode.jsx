import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Mobile detection hook for backward compatibility
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

const DesktopReadingMode = () => {
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
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  
  // Animation and interaction state
  const [showControls, setShowControls] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // Dual-mode reading state
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' or 'page'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
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
          setLastActivityTime(Date.now());
          
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

  // Page mode pagination logic - fixed to prevent text skipping
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    const pagesArray = [];
    
    // First page: Title and document info only
    pagesArray.push('TITLE_PAGE');
    
    // Combine all text content
    const fullText = paragraphs.join('\n\n');
    const charactersPerPage = 2000; // Larger for desktop screens
    
    // Fixed pagination algorithm to prevent text skipping
    let currentIndex = 0;
    
    while (currentIndex < fullText.length) {
      let endIndex = Math.min(currentIndex + charactersPerPage, fullText.length);
      
      // Only adjust for word boundaries if we're not at the end
      if (endIndex < fullText.length) {
        // Look for the last space within the last 150 characters to avoid cutting words
        const searchStart = Math.max(endIndex - 150, currentIndex);
        const lastSpace = fullText.lastIndexOf(' ', endIndex);
        
        if (lastSpace > searchStart) {
          endIndex = lastSpace;
        }
      }
      
      const pageContent = fullText.substring(currentIndex, endIndex).trim();
      
      if (pageContent.length > 0) {
        pagesArray.push(pageContent);
      }
      
      // CRITICAL FIX: Use the actual endIndex instead of fixed increment
      // This prevents text skipping when word boundaries are adjusted
      currentIndex = endIndex;
      
      // Safety check to prevent infinite loops
      if (currentIndex === endIndex && endIndex < fullText.length) {
        // If no progress is made, move forward by at least one character
        currentIndex++;
      }
    }
    
    setPages(pagesArray);
    setTotalPages(pagesArray.length);
    
    // Update progress based on current page
    const pageProgress = pagesArray.length > 0 ? ((currentPage - 1) / (pagesArray.length - 1)) * 100 : 0;
    setReadingProgress(pageProgress);
  }, [viewMode, paragraphs, currentPage]);

  // Touch gesture handling for page mode (desktop with touch support)
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    
    const handleTouchMove = (e) => {
      // Prevent scrolling in page mode
      e.preventDefault();
    };
    
    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      const swipeThreshold = 50;
      const swipeDistance = touchStartX - touchEndX;
      
      if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0 && currentPage < totalPages) {
          // Swipe left - next page
          setCurrentPage(prev => prev + 1);
        } else if (swipeDistance < 0 && currentPage > 1) {
          // Swipe right - previous page
          setCurrentPage(prev => prev - 1);
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewMode, currentPage, totalPages]);

  // Keyboard navigation for page mode
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPage, totalPages]);

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
      .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<strong>$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  }, []);

  // Split text into paragraphs
  const paragraphs = useMemo(() => {
    return translatedText
      .split(/\n\s*\n/)
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => paragraph.trim());
  }, [translatedText]);

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
    <div className={`min-h-screen transition-all duration-500 ${currentTheme.bg}`}>
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

          {/* Progress Display */}
          <div className={`px-3 py-1 text-sm font-medium ${currentTheme.secondaryText}`}>
            {Math.round(readingProgress)}%
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

      {/* Main Reading Content - Dual Mode Support */}
      <div className={viewMode === 'page' ? "pt-0 pb-0 px-0 h-screen flex flex-col" : "pt-20 pb-16"}>
        <div className={viewMode === 'page' ? "max-w-none mx-0 h-full flex flex-col" : "max-w-4xl mx-auto px-4 sm:px-6"}>
          {/* Document Header - Only show in scroll mode */}
          {viewMode === 'scroll' && (
            <div className={`mb-8 p-6 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
              <h1 className={`text-2xl sm:text-3xl font-bold mb-4 ${currentTheme.text}`}>
                {originalTitle}
              </h1>
              <div className={`flex flex-wrap items-center gap-2 text-sm ${currentTheme.secondaryText}`}>
                <span>Translated from Chinese</span>
                <span>•</span>
                <span>{paragraphs.length} paragraphs</span>
                <span>•</span>
                <span>~{Math.ceil(translatedText.split(' ').length / 200)} min read</span>
              </div>
            </div>
          )}

          {/* Scroll Mode Content */}
          {viewMode === 'scroll' && (
            <>
              <article
                ref={contentRef}
                className={`${currentTheme.contentBg} ${currentTheme.shadow} rounded-2xl border ${currentTheme.border} overflow-hidden backdrop-blur-sm`}
                style={{
                  maxWidth: `${maxWidth}px`,
                  margin: '0 auto'
                }}
              >
                <div className="p-8 sm:p-12">
                  {paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className={`mb-8 ${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} leading-relaxed`}
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        textAlign: 'justify',
                        textJustify: 'inter-word',
                        wordBreak: 'normal',
                        hyphens: 'auto'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: formatText(paragraph)
                      }}
                    />
                  ))}
                </div>
              </article>

              {/* End of Document - Scroll Mode */}
              <div className={`mt-12 text-center p-8 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
                <div className={`text-lg font-medium mb-6 ${currentTheme.text}`}>
                  End of Document
                </div>
                <p className={`mb-6 ${currentTheme.secondaryText}`}>
                  Thank you for reading! Would you like to translate another document?
                </p>
                <button
                  onClick={() => navigate('/')}
                  className={`px-8 py-3 rounded-full font-medium transition-all transform hover:scale-105 ${
                    readingMode === 'night'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  } shadow-lg`}
                >
                  Translate Another Document
                </button>
              </div>
            </>
          )}

          {/* Page Mode Content */}
          {viewMode === 'page' && (
            <>
              <div className={`${currentTheme.contentBg} h-full w-full flex flex-col`}>
                <div className="p-8 sm:p-12 flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {pages.length > 0 && (
                    <div
                      className={`${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} leading-relaxed flex-1`}
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        textAlign: 'justify',
                        textJustify: 'inter-word',
                        wordBreak: 'normal',
                        hyphens: 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {currentPage === 1 ? (
                        // Title page content
                        <div className="flex flex-col justify-center items-center h-full text-center">
                          <h1 className={`text-4xl sm:text-5xl font-bold mb-8 ${currentTheme.text}`}>
                            {originalTitle}
                          </h1>
                          <div className={`text-xl ${currentTheme.secondaryText} space-y-3`}>
                            <p>Translated from Chinese</p>
                            <p>{pages.length - 1} pages</p>
                            <p>~{Math.ceil(translatedText.split(' ').length / 200)} min read</p>
                          </div>
                        </div>
                      ) : (
                        // Content pages
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatText(pages[currentPage - 1] || '')
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Page Navigation */}
                <div className={`flex items-center justify-between p-6 border-t ${currentTheme.border}`}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      currentPage <= 1
                        ? 'opacity-50 cursor-not-allowed'
                        : `${currentTheme.buttonHover} hover:scale-105`
                    }`}
                    title="Previous Page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className={`text-lg font-medium ${currentTheme.secondaryText}`}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      currentPage >= totalPages
                        ? 'opacity-50 cursor-not-allowed'
                        : `${currentTheme.buttonHover} hover:scale-105`
                    }`}
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* End of Document - Page Mode */}
              {currentPage === totalPages && (
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center p-4 mx-8 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
                  <div className={`text-sm font-medium mb-2 ${currentTheme.text}`}>
                    End of Document
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className={`px-6 py-2 text-sm rounded-full font-medium transition-all transform hover:scale-105 ${
                      readingMode === 'night'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    } shadow-lg`}
                  >
                    Translate Another
                  </button>
                </div>
              )}
            </>
          )}
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
                {/* View Mode Toggle */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>View Mode</label>
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('scroll')}
                      className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'scroll'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Scroll
                    </button>
                    <button
                      onClick={() => setViewMode('page')}
                      className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'page'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Page
                    </button>
                  </div>
                </div>

                {/* Reading Mode */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>Theme</label>
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

                {/* Max Width */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>
                    Content Width: {maxWidth}px
                  </label>
                  <input
                    type="range"
                    min="600"
                    max="900"
                    step="50"
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(Number(e.target.value))}
                    className="w-full"
                  />
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
    </div>
  );
};

export default DesktopReadingMode;