import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobile } from '../contexts/MobileContext';
import { GestureHandler, TouchUtils, PerformanceUtils } from '../utils/mobileUtils';

const MobileReadingMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);
  const pageContainerRef = useRef(null);
  const gestureHandlerRef = useRef(null);
  const mobile = useMobile();
  
  // Reading settings state
  const [readingMode, setReadingMode] = useState('day');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('lora');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);
  
  // Navigation and progress state
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  
  // Mobile-specific state
  const [showControls, setShowControls] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // Dual-mode reading state
  const [viewMode, setViewMode] = useState('scroll');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Get translated text from navigation state
  const translatedText = location.state?.translatedText || '';
  const originalTitle = location.state?.title || 'Translated Document';
  
  // Redirect if no text provided
  useEffect(() => {
    if (!translatedText) {
      navigate('/');
    }
  }, [translatedText, navigate]);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('mobileReaderSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setReadingMode(settings.readingMode || 'day');
      setFontSize(settings.fontSize || 18);
      setFontFamily(settings.fontFamily || 'lora');
      setLineHeight(settings.lineHeight || 1.8);
      setViewMode(settings.viewMode || 'scroll');
    }
    
    const savedBookmarks = localStorage.getItem('mobileReaderBookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    const settings = {
      readingMode,
      fontSize,
      fontFamily,
      lineHeight,
      viewMode
    };
    localStorage.setItem('mobileReaderSettings', JSON.stringify(settings));
  }, [readingMode, fontSize, fontFamily, lineHeight, viewMode]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Font options optimized for mobile
  const fontOptions = useMemo(() => [
    { name: 'Lora', value: 'lora', class: 'font-lora' },
    { name: 'System', value: 'system', class: 'font-sans' },
    { name: 'Serif', value: 'serif', class: 'font-serif' },
    { name: 'Chinese', value: 'chinese', class: 'font-chinese' }
  ], []);

  // Format text with mobile-optimized rendering
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

  // Enhanced scroll tracking for mobile
  useEffect(() => {
    if (viewMode !== 'scroll') return;
    
    const handleScroll = PerformanceUtils.throttle(() => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.min((scrollTop / docHeight) * 100, 100);
      
      setReadingProgress(scrollPercent);
      setLastActivityTime(Date.now());
      
      // Auto-hide controls when scrolling
      setShowControls(false);
      setShowSettings(false);
      setShowBookmarks(false);
    }, 16);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  // Page mode pagination logic - character-based to prevent text skipping
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    const pagesArray = [];
    
    // First page: Title and document info only
    pagesArray.push('TITLE_PAGE');
    
    // Combine all text content
    const fullText = paragraphs.join('\n\n');
    const charactersPerPage = 1200; // Adjust based on mobile screen size
    
    // Split text into pages by character count, preserving word boundaries
    let currentPosition = 0;
    
    while (currentPosition < fullText.length) {
      let endPosition = Math.min(currentPosition + charactersPerPage, fullText.length);
      
      // If we're not at the end, find the last space to avoid cutting words
      if (endPosition < fullText.length) {
        const lastSpace = fullText.lastIndexOf(' ', endPosition);
        const lastNewline = fullText.lastIndexOf('\n', endPosition);
        endPosition = Math.max(lastSpace, lastNewline);
        
        // If no space found within reasonable distance, just cut at character limit
        if (endPosition < currentPosition + charactersPerPage * 0.8) {
          endPosition = currentPosition + charactersPerPage;
        }
      }
      
      const pageContent = fullText.substring(currentPosition, endPosition).trim();
      if (pageContent.length > 0) {
        pagesArray.push(pageContent);
      }
      
      currentPosition = endPosition;
    }
    
    setPages(pagesArray);
    setTotalPages(pagesArray.length);
    
    // Update progress based on current page
    const pageProgress = pagesArray.length > 0 ? ((currentPage - 1) / (pagesArray.length - 1)) * 100 : 0;
    setReadingProgress(pageProgress);
  }, [viewMode, paragraphs, currentPage]);

  // Touch gesture handling for page mode
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
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
          TouchUtils.hapticFeedback('light');
        } else if (swipeDistance < 0 && currentPage > 1) {
          // Swipe right - previous page
          setCurrentPage(prev => prev - 1);
          TouchUtils.hapticFeedback('light');
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
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

  // Auto-show controls initially, then hide after activity
  useEffect(() => {
    setShowControls(true);
    
    const timer = setTimeout(() => {
      if (Date.now() - lastActivityTime > 3000) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [lastActivityTime]);

  // Show controls on tap/touch and hide menus
  const handleScreenTap = () => {
    setShowControls(true);
    setShowSettings(false);
    setShowBookmarks(false);
    setLastActivityTime(Date.now());
  };

  // Theme configurations optimized for mobile
  const themes = {
    day: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      contentBg: 'bg-white/90 backdrop-blur-md',
      text: 'text-gray-900',
      secondaryText: 'text-gray-600',
      border: 'border-gray-200',
      shadow: 'shadow-xl shadow-gray-200/50',
      controlsBg: 'bg-white/95 backdrop-blur-xl',
      buttonHover: 'hover:bg-gray-100 active:bg-gray-200',
      accent: 'text-amber-600'
    },
    night: {
      bg: 'bg-gradient-to-br from-gray-900 to-slate-900',
      contentBg: 'bg-gray-800/90 backdrop-blur-md',
      text: 'text-gray-100',
      secondaryText: 'text-gray-300',
      border: 'border-gray-700',
      shadow: 'shadow-xl shadow-black/50',
      controlsBg: 'bg-gray-800/95 backdrop-blur-xl',
      buttonHover: 'hover:bg-gray-700 active:bg-gray-600',
      accent: 'text-blue-400'
    },
    sepia: {
      bg: 'bg-gradient-to-br from-amber-100 to-yellow-100',
      contentBg: 'bg-amber-50/90 backdrop-blur-md',
      text: 'text-amber-900',
      secondaryText: 'text-amber-700',
      border: 'border-amber-200',
      shadow: 'shadow-xl shadow-amber-200/50',
      controlsBg: 'bg-amber-50/95 backdrop-blur-xl',
      buttonHover: 'hover:bg-amber-100 active:bg-amber-200',
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
    localStorage.setItem('mobileReaderBookmarks', JSON.stringify(updatedBookmarks));
    
    // Show success feedback
    TouchUtils.hapticFeedback('success');
  };

  const removeBookmark = (id) => {
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updatedBookmarks);
    localStorage.setItem('mobileReaderBookmarks', JSON.stringify(updatedBookmarks));
  };

  const jumpToBookmark = (position) => {
    const targetScroll = (document.documentElement.scrollHeight - window.innerHeight) * (position / 100);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setShowBookmarks(false);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${currentTheme.bg}`}>
      {/* Enhanced Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-black/10 z-50 safe-area-inset-top">
        <div
          className={`h-full transition-all duration-300 ${currentTheme.accent.replace('text-', 'bg-')}`}
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Mobile-Optimized Floating Controls */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 safe-area-inset-top ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className={`flex items-center space-x-2 px-4 py-3 rounded-full ${currentTheme.controlsBg} ${currentTheme.border} border ${currentTheme.shadow} mobile-touch-sm`}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className={`p-3 rounded-full transition-colors mobile-touch-sm ${currentTheme.buttonHover}`}
            title="Back to Translator"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Progress Display */}
          <div className={`px-3 py-2 text-sm font-medium ${currentTheme.secondaryText} mobile-text-sm`}>
            {Math.round(readingProgress)}%
          </div>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full transition-colors mobile-touch-sm ${currentTheme.buttonHover} ${showSettings ? currentTheme.accent : ''}`}
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
            className={`p-3 rounded-full transition-colors mobile-touch-sm ${currentTheme.buttonHover} ${showBookmarks ? currentTheme.accent : ''}`}
            title="Bookmarks"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Reading Content - Dual Mode Support */}
      <div className="pt-20 pb-16 px-4" onClick={handleScreenTap}>
        <div className="max-w-none mx-0">
          {/* Document Header - Only show in scroll mode */}
          {viewMode === 'scroll' && (
            <div className={`mb-6 p-6 mx-2 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
              <h1 className={`text-xl font-bold mb-3 ${currentTheme.text} mobile-title-text`}>
                {originalTitle}
              </h1>
              <div className={`flex flex-wrap items-center gap-2 text-sm ${currentTheme.secondaryText} mobile-caption-text`}>
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
                className={`${currentTheme.contentBg} ${currentTheme.shadow} rounded-xl mx-2 border ${currentTheme.border} overflow-hidden backdrop-blur-sm`}
              >
                <div className="p-6">
                  {paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className={`mb-6 ${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} leading-relaxed mobile-reading-text mobile-text-selection`}
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: Math.max(lineHeight, 1.6),
                        textAlign: 'left',
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
              <div className={`mt-8 text-center p-6 mx-2 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
                <div className={`text-lg font-medium mb-3 ${currentTheme.text} mobile-title-text`}>
                  End of Document
                </div>
                <p className={`mb-5 text-sm ${currentTheme.secondaryText} mobile-body-text`}>
                  Thank you for reading! Would you like to translate another document?
                </p>
                <button
                  onClick={() => navigate('/')}
                  className={`px-8 py-3 text-sm rounded-full font-medium transition-all transform hover:scale-105 mobile-btn mobile-btn-primary mobile-touch-sm ${
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
              <div className={`${currentTheme.contentBg} ${currentTheme.shadow} rounded-xl mx-2 border ${currentTheme.border} overflow-hidden backdrop-blur-sm mobile-page-content`}>
                <div className="p-6 mobile-text-container" style={{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {pages.length > 0 && (
                    <div
                      className={`${currentTheme.text} ${fontOptions.find(f => f.value === fontFamily)?.class || 'font-lora'} leading-relaxed mobile-reading-text mobile-text-selection flex-1`}
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: Math.max(lineHeight, 1.6),
                        textAlign: 'left',
                        wordBreak: 'normal',
                        hyphens: 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {currentPage === 1 ? (
                        // Title page content
                        <div className="flex flex-col justify-center items-center h-full text-center">
                          <h1 className={`text-3xl font-bold mb-6 ${currentTheme.text}`}>
                            {originalTitle}
                          </h1>
                          <div className={`text-lg ${currentTheme.secondaryText} space-y-2`}>
                            <p>Translated from Chinese</p>
                            <p>{pages.length - 1} pages</p>
                            <p>~{Math.ceil(translatedText.split(' ').length / 200)} min read</p>
                          </div>
                        </div>
                      ) : (
                        // Content pages
                        pages[currentPage - 1]?.split('\n\n').map((paragraph, index) => (
                          <p key={index} className="mb-4 last:mb-0">
                            {paragraph}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Page Navigation */}
                <div className={`flex items-center justify-between p-4 border-t ${currentTheme.border}`}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className={`p-3 rounded-full transition-colors mobile-touch-sm ${
                      currentPage <= 1
                        ? 'opacity-50 cursor-not-allowed'
                        : `${currentTheme.buttonHover} active:scale-95`
                    }`}
                    title="Previous Page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className={`text-sm font-medium ${currentTheme.secondaryText} mobile-caption-text`}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className={`p-3 rounded-full transition-colors mobile-touch-sm ${
                      currentPage >= totalPages
                        ? 'opacity-50 cursor-not-allowed'
                        : `${currentTheme.buttonHover} active:scale-95`
                    }`}
                    title="Next Page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* End of Document - Page Mode */}
              {currentPage === totalPages && (
                <div className={`mt-8 text-center p-6 mx-2 rounded-2xl ${currentTheme.contentBg} ${currentTheme.shadow} border ${currentTheme.border} backdrop-blur-sm`}>
                  <div className={`text-lg font-medium mb-3 ${currentTheme.text} mobile-title-text`}>
                    End of Document
                  </div>
                  <p className={`mb-5 text-sm ${currentTheme.secondaryText} mobile-body-text`}>
                    Thank you for reading! Would you like to translate another document?
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className={`px-8 py-3 text-sm rounded-full font-medium transition-all transform hover:scale-105 mobile-btn mobile-btn-primary mobile-touch-sm ${
                      readingMode === 'night'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    } shadow-lg`}
                  >
                    Translate Another Document
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile-Optimized Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className={`w-full max-w-md ${currentTheme.controlsBg} rounded-t-3xl ${currentTheme.shadow} border-t ${currentTheme.border} overflow-y-auto max-h-[90vh] mobile-slide-up safe-area-inset-bottom`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-semibold ${currentTheme.text} mobile-title-text`}>Reading Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`p-3 rounded-full mobile-touch-sm ${currentTheme.buttonHover}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6 mobile-stack">
                {/* Theme Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>Theme</label>
                  <div className="grid grid-cols-3 gap-3 mobile-grid-auto-sm">
                    {Object.entries(themes).map(([mode, theme]) => (
                      <button
                        key={mode}
                        onClick={() => setReadingMode(mode)}
                        className={`p-4 rounded-xl border-2 transition-all mobile-touch-sm ${
                          readingMode === mode
                            ? `${theme.border} ${theme.bg}`
                            : `border-transparent ${currentTheme.buttonHover}`
                        }`}
                      >
                        <div className={`w-full h-8 rounded-lg ${theme.bg} mb-2`}></div>
                        <span className={`text-xs font-medium capitalize ${currentTheme.text}`}>{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reading Mode Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>Reading Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setViewMode('scroll')}
                      className={`p-4 rounded-xl border-2 transition-all mobile-touch-sm ${
                        viewMode === 'scroll'
                          ? `${currentTheme.border} ${currentTheme.bg}`
                          : `border-transparent ${currentTheme.buttonHover}`
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className={`text-xs font-medium ${currentTheme.text}`}>Scroll</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode('page')}
                      className={`p-4 rounded-xl border-2 transition-all mobile-touch-sm ${
                        viewMode === 'page'
                          ? `${currentTheme.border} ${currentTheme.bg}`
                          : `border-transparent ${currentTheme.buttonHover}`
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className={`text-xs font-medium ${currentTheme.text}`}>Page</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full p-4 rounded-xl border ${currentTheme.border} ${currentTheme.controlsBg} ${currentTheme.text} mobile-input-field mobile-touch-sm`}
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full mobile-touch-sm"
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>
                    Line Height: {lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1.4"
                    max="2.0"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full mobile-touch-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-Optimized Bookmarks Panel */}
      {showBookmarks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center mobile-modal-overlay">
          <div className={`w-full max-w-md ${currentTheme.controlsBg} rounded-t-3xl ${currentTheme.shadow} border-t ${currentTheme.border} overflow-hidden mobile-slide-up safe-area-inset-bottom`}>
            <div className="p-6 mobile-content-spacing">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-semibold ${currentTheme.text} mobile-title-text`}>Bookmarks</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addBookmark}
                    className={`p-3 rounded-full mobile-touch-sm ${currentTheme.buttonHover}`}
                    title="Add Bookmark"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowBookmarks(false)}
                    className={`p-3 rounded-full mobile-touch-sm ${currentTheme.buttonHover}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto mobile-scrollable-content">
                {bookmarks.length === 0 ? (
                  <p className={`text-center py-8 ${currentTheme.secondaryText} mobile-body-text`}>
                    No bookmarks yet. Add one to save your reading position.
                  </p>
                ) : (
                  bookmarks.map(bookmark => (
                    <div
                      key={bookmark.id}
                      className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.buttonHover} cursor-pointer group mobile-card-base mobile-touch-sm`}
                      onClick={() => jumpToBookmark(bookmark.position)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${currentTheme.text} mb-2 mobile-caption-text`}>
                            {bookmark.position}% - {bookmark.timestamp}
                          </div>
                          <div className={`text-xs ${currentTheme.secondaryText} mobile-line-clamp-2`}>
                            {bookmark.preview}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmark(bookmark.id);
                          }}
                          className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity mobile-touch-sm ${currentTheme.buttonHover}`}
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

export default MobileReadingMode;