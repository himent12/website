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

  // Auto-hide controls timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [lastActivityTime]);

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
    <div className={`min-h-screen transition-all duration-500 ${currentTheme.bg} mobile-full-height mobile-viewport-fix`}>
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

      {/* Main Reading Content - Scroll Mode Only for Mobile */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-none mx-0">
          {/* Document Header */}
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

          {/* Reading Content */}
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

          {/* End of Document */}
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
        </div>
      </div>

      {/* Mobile-Optimized Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center mobile-modal-overlay">
          <div className={`w-full max-w-md ${currentTheme.controlsBg} rounded-t-3xl ${currentTheme.shadow} border-t ${currentTheme.border} overflow-hidden mobile-slide-up safe-area-inset-bottom`}>
            <div className="p-6 mobile-content-spacing">
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
                {/* Reading Mode */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${currentTheme.text} mobile-label`}>Reading Mode</label>
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