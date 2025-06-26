import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TouchUtils, PerformanceUtils } from '../utils/mobileUtils';

const MobileReadingMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);
  
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
      
      // Don't auto-hide controls when scrolling - let user control them
    }, 16);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);


  // BULLETPROOF PAGINATION WITH FORMATTING SUPPORT - NEVER SKIPS WORDS
  const createPerfectPaginationWithFormatting = useCallback((text) => {
    console.log('🔥 STARTING BULLETPROOF PAGINATION WITH FORMATTING');
    console.log('📝 Input text length:', text.length);
    
    const pages = [];
    
    // First page: Title page
    pages.push('TITLE_PAGE');
    
    // Split text into words while preserving paragraph breaks
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    console.log('📊 Total paragraphs:', paragraphs.length);
    
    // Target words per page for mobile (conservative to account for formatting)
    const wordsPerPage = 150; // Reduced to account for HTML formatting overhead
    
    let currentPageWords = [];
    let currentPageParagraphs = [];
    
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
      const paragraph = paragraphs[paragraphIndex].trim();
      const paragraphWords = paragraph.split(/\s+/).filter(word => word.length > 0);
      
      console.log(`📝 Processing paragraph ${paragraphIndex + 1} with ${paragraphWords.length} words`);
      
      // Check if adding this paragraph would exceed page limit
      if (currentPageWords.length + paragraphWords.length > wordsPerPage && currentPageWords.length > 0) {
        // Create page with current content
        const pageContent = currentPageParagraphs.join('\n\n');
        if (pageContent.trim().length > 0) {
          pages.push(pageContent);
          console.log(`📄 Page ${pages.length - 1} created with ${currentPageWords.length} words from ${currentPageParagraphs.length} paragraphs`);
        }
        
        // Reset for next page
        currentPageWords = [];
        currentPageParagraphs = [];
      }
      
      // Add current paragraph to page
      currentPageWords.push(...paragraphWords);
      currentPageParagraphs.push(paragraph);
      
      // If this is the last paragraph, create the final page
      if (paragraphIndex === paragraphs.length - 1) {
        const pageContent = currentPageParagraphs.join('\n\n');
        if (pageContent.trim().length > 0) {
          pages.push(pageContent);
          console.log(`📄 Final page ${pages.length - 1} created with ${currentPageWords.length} words from ${currentPageParagraphs.length} paragraphs`);
        }
      }
    }
    
    console.log('✅ PAGINATION COMPLETE');
    console.log('📚 Total pages created:', pages.length);
    console.log('🔍 Verifying no words were skipped...');
    
    // VERIFICATION: Check that all words are included
    const allPagesText = pages.slice(1).join('\n\n'); // Skip title page
    const originalText = paragraphs.join('\n\n');
    
    // Count words for verification (ignore formatting differences)
    const originalWords = originalText.split(/\s+/).filter(word => word.length > 0);
    const paginatedWords = allPagesText.split(/\s+/).filter(word => word.length > 0);
    
    if (originalWords.length === paginatedWords.length && allPagesText === originalText) {
      console.log('✅ VERIFICATION PASSED: All words and formatting preserved!');
      console.log(`📊 Word count: ${originalWords.length} words preserved`);
    } else {
      console.error('❌ VERIFICATION FAILED: Content mismatch!');
      console.log('Original words:', originalWords.length);
      console.log('Paginated words:', paginatedWords.length);
      console.log('Text match:', allPagesText === originalText);
    }
    
    return pages;
  }, []);

  // Page mode pagination logic - COMPLETELY REWRITTEN WITH FORMATTING
  useEffect(() => {
    if (viewMode !== 'page') return;
    
    console.log('🚀 INITIALIZING NEW PAGINATION SYSTEM WITH FORMATTING');
    
    // Combine all text content
    const fullText = paragraphs.join('\n\n');
    
    if (!fullText || fullText.trim().length === 0) {
      console.log('⚠️ No text to paginate');
      setPages(['TITLE_PAGE']);
      setTotalPages(1);
      return;
    }
    
    // Use the new bulletproof pagination system with formatting support
    const pagesArray = createPerfectPaginationWithFormatting(fullText);
    
    setPages(pagesArray);
    setTotalPages(pagesArray.length);
    
    // Update progress based on current page
    const pageProgress = pagesArray.length > 0 ? ((currentPage - 1) / (pagesArray.length - 1)) * 100 : 0;
    setReadingProgress(pageProgress);
    
    console.log('📊 Pagination complete:', {
      totalPages: pagesArray.length,
      currentPage,
      progress: pageProgress
    });
  }, [viewMode, paragraphs, currentPage, createPerfectPaginationWithFormatting]);

  // Touch gesture handling for page mode with scroll prevention
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
          TouchUtils.hapticFeedback('light');
        } else if (swipeDistance < 0 && currentPage > 1) {
          // Swipe right - previous page
          setCurrentPage(prev => prev - 1);
          TouchUtils.hapticFeedback('light');
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

  // Simple click handler for controls
  const handleScreenClick = (e) => {
    // Don't interfere with button clicks
    if (e.target.closest('button') || e.target.closest('[role="button"]')) {
      return;
    }
    
    // Toggle controls on any click in the content area
    setShowControls(prev => !prev);
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
    <div className={`min-h-screen transition-all duration-500 ${currentTheme.bg} ${viewMode === 'page' ? 'overflow-hidden touch-none' : ''}`}>
      {/* Enhanced Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-black/10 z-50 safe-area-inset-top">
        <div
          className={`h-full transition-all duration-300 ${currentTheme.accent.replace('text-', 'bg-')}`}
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* WebNovel-Style Floating Controls */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 safe-area-inset-top ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className={`flex items-center space-x-3 px-5 py-3 rounded-full ${currentTheme.controlsBg} ${currentTheme.shadow} backdrop-blur-xl border border-white/20`}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className={`p-2.5 rounded-full transition-all duration-200 ${currentTheme.buttonHover} hover:scale-105`}
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Progress Display */}
          <div className={`px-3 py-1.5 text-sm font-medium ${currentTheme.secondaryText} bg-black/5 rounded-full`}>
            {Math.round(readingProgress)}%
          </div>

          {/* Settings Widget Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-full transition-all duration-200 ${showSettings ? 'bg-blue-500 text-white' : currentTheme.buttonHover} hover:scale-105`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>

          {/* Favorite Button */}
          <button
            onClick={addBookmark}
            className={`p-2.5 rounded-full transition-all duration-200 ${currentTheme.buttonHover} hover:scale-105`}
            title="Add Bookmark"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Reading Content - Dual Mode Support */}
      <div className={viewMode === 'page' ? "pt-0 pb-0 px-0" : "pt-20 pb-16 px-4"} onClick={handleScreenClick}>
        <div className={viewMode === 'page' ? "max-w-none mx-0 h-screen flex flex-col" : "max-w-none mx-0"}>
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
              <div className={`${currentTheme.contentBg} h-full w-full flex flex-col`}>
                <div className="p-6 mobile-text-container flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

      {/* WebNovel-Style Settings Widget */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          
          {/* Settings Widget */}
          <div className={`relative ${currentTheme.controlsBg} rounded-2xl ${currentTheme.shadow} border border-white/20 backdrop-blur-xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-full ${currentTheme.buttonHover} transition-colors`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Reading Mode Toggle */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>Reading Mode</label>
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

            {/* Theme Selection */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>Theme</label>
              <div className="flex space-x-3">
                {Object.entries(themes).map(([mode, theme]) => (
                  <button
                    key={mode}
                    onClick={() => setReadingMode(mode)}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      readingMode === mode
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-full h-6 rounded ${theme.bg} mb-2`}></div>
                    <span className={`text-xs font-medium capitalize ${currentTheme.text}`}>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 ${currentTheme.text}`}>
                Font Size: {fontSize}px
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-sm">A</span>
                <input
                  type="range"
                  min="16"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-lg">A</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBookmarks(true)}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg ${currentTheme.buttonHover} transition-colors`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="text-sm font-medium">Bookmarks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bookmarks Panel */}
      {showBookmarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowBookmarks(false)}
          />
          
          {/* Bookmarks Widget */}
          <div className={`relative ${currentTheme.controlsBg} rounded-2xl ${currentTheme.shadow} border border-white/20 backdrop-blur-xl p-6 w-full max-w-md max-h-[80vh] animate-in zoom-in-95 duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>Bookmarks</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={addBookmark}
                  className={`p-2 rounded-full ${currentTheme.buttonHover} transition-colors`}
                  title="Add Bookmark"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowBookmarks(false)}
                  className={`p-2 rounded-full ${currentTheme.buttonHover} transition-colors`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bookmarks List */}
            <div className="space-y-3 overflow-y-auto max-h-96">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className={`${currentTheme.secondaryText} text-sm`}>
                    No bookmarks yet. Tap the + button to add one.
                  </p>
                </div>
              ) : (
                bookmarks.map(bookmark => (
                  <div
                    key={bookmark.id}
                    className={`p-4 rounded-lg border ${currentTheme.border} ${currentTheme.buttonHover} cursor-pointer group transition-all hover:shadow-md`}
                    onClick={() => jumpToBookmark(bookmark.position)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${currentTheme.text} mb-1`}>
                          {bookmark.position}% • {bookmark.timestamp}
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
                        className={`p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${currentTheme.buttonHover}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}
    </div>
  );
};

export default MobileReadingMode;