import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTranslation } from '../utils/translationHistory';
import { getUserApiKey, hasUserApiKey } from '../utils/userApiKeyManager';
import { useMobile } from '../contexts/MobileContext';
import { GestureHandler, TouchUtils, PerformanceUtils } from '../utils/mobileUtils';

// Timer component to show elapsed translation time
const TranslationTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span>
      {(elapsed / 1000).toFixed(1)}s elapsed
    </span>
  );
};

const WebScraper = () => {
  const navigate = useNavigate();
  const mobile = useMobile();
  const [url, setUrl] = useState('');
  const [scrapedData, setScrapedData] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [isTranslatingLoading, setIsTranslatingLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [translationStartTime, setTranslationStartTime] = useState(null);
  const [translationDuration, setTranslationDuration] = useState(null);

  // Mobile-specific state
  const [showMobileKeyboard, setShowMobileKeyboard] = useState(false);
  const [mobileContentExpanded, setMobileContentExpanded] = useState(false);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState('compact'); // compact, expanded

  // Refs for mobile optimization
  const urlInputRef = useRef(null);
  const containerRef = useRef(null);
  const contentPreviewRef = useRef(null);
  const gestureHandlerRef = useRef(null);

  // Mobile-specific effects
  useEffect(() => {
    if (mobile.isMobile && containerRef.current) {
      // Set up gesture handling for mobile
      const gestureHandler = new GestureHandler(containerRef.current, {
        threshold: 40,
        velocity: 0.3,
        preventScroll: false
      });

      gestureHandler.onGestureEnd = (gesture) => {
        if (!isSwipeEnabled) return;
        
        if (gesture.type === 'swipe' && gesture.direction === 'right' && url && !isScrapingLoading) {
          // Swipe right to scrape
          handleScrape();
          TouchUtils.hapticFeedback('medium');
        } else if (gesture.type === 'swipe' && gesture.direction === 'left' && scrapedData && !isTranslatingLoading) {
          // Swipe left to translate
          handleTranslate();
          TouchUtils.hapticFeedback('medium');
        } else if (gesture.type === 'swipe' && gesture.direction === 'down') {
          // Swipe down to clear
          handleClear();
          TouchUtils.hapticFeedback('light');
        }
      };

      gestureHandlerRef.current = gestureHandler;

      return () => {
        gestureHandler.destroy();
      };
    }
  }, [mobile.isMobile, url, scrapedData, isScrapingLoading, isTranslatingLoading, isSwipeEnabled]);

  // Handle mobile keyboard visibility
  useEffect(() => {
    if (mobile.isMobile) {
      setShowMobileKeyboard(mobile.isKeyboardOpen);
    }
  }, [mobile.isKeyboardOpen, mobile.isMobile]);

  // Optimize URL input for mobile
  const debouncedUrlChange = PerformanceUtils.debounce((value) => {
    setUrl(value);
  }, mobile.isLowEndDevice ? 300 : 150);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to scrape');
      return;
    }

    setIsScrapingLoading(true);
    setError('');
    setScrapedData(null);
    setTranslatedText('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      // Get response text first to avoid double JSON parsing
      const responseText = await response.text();

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }

      // Parse JSON once
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing failed. Raw response:', responseText.substring(0, 200));
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Scraping failed: ${response.status}`);
      }

      // Validate response structure
      if (!data.success || !data.data) {
        throw new Error('Invalid response structure from server');
      }

      setScrapedData(data.data);
    } catch (err) {
      // Ensure error message is properly serialized
      let errorMessage = 'Unknown error occurred';

      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (err.toString && typeof err.toString === 'function') {
          errorMessage = err.toString();
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(`Scraping error: ${errorMessage}`);
      console.error('Scraping error details:', {
        error: err,
        message: errorMessage,
        type: typeof err
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!scrapedData?.content) {
      setError('No content to translate');
      return;
    }

    setIsTranslatingLoading(true);
    setError('');
    setTranslationStartTime(Date.now());
    setTranslationDuration(null);
    
    // Check if user has their own API key
    const userHasApiKey = hasUserApiKey('deepseek');

    try {
      // Prepare request payload
      const requestBody = {
        text: scrapedData.content,
        from: 'zh',
        to: 'en',
        model: selectedModel
      };

      // Add user API key if available
      if (userHasApiKey) {
        const apiKey = getUserApiKey('deepseek');
        if (apiKey) {
          requestBody.userApiKey = apiKey;
        }
      }

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Get response text first to avoid double JSON parsing
      const responseText = await response.text();

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from translation server');
      }

      // Parse JSON once
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Translation JSON parsing failed. Raw response:', responseText.substring(0, 200));
        // Check if this looks like an HTML error page (common with proxy errors)
        if (responseText.toLowerCase().includes('<html') || responseText.toLowerCase().includes('proxy error')) {
          throw new Error('Translation service is temporarily unavailable. Please try again later.');
        }
        throw new Error('Invalid JSON response from translation server');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Translation failed: ${response.status}`);
      }
      const translated = data.translatedText || data.translation || '';
      
      // Calculate translation duration
      const duration = Date.now() - translationStartTime;
      setTranslationDuration(duration);
      
      setTranslatedText(translated);

      // Save to translation history if translation was successful
      if (translated && translated.trim().length > 0) {
        saveTranslation(scrapedData.content, translated);
      }
    } catch (err) {
      // Ensure error message is properly serialized
      let errorMessage = 'Unknown error occurred';

      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (err.toString && typeof err.toString === 'function') {
          errorMessage = err.toString();
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(`Translation error: ${errorMessage}`);
      console.error('Translation error details:', {
        error: err,
        message: errorMessage,
        type: typeof err
      });
    } finally {
      setIsTranslatingLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setScrapedData(null);
    setTranslatedText('');
    setError('');
    setTranslationDuration(null);
    setSelectedModel('deepseek-chat');
  };

  const handleCopyTranslation = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleOpenReadingMode = () => {
    if (translatedText) {
      navigate('/reading', {
        state: {
          translatedText: translatedText,
          originalText: scrapedData.content,
          title: scrapedData.title,
          sourceUrl: scrapedData.url
        }
      });
    }
  };

  // Mobile-specific handlers
  const handleMobileUrlFocus = () => {
    if (mobile.isMobile && urlInputRef.current) {
      // Scroll URL input into view on mobile
      setTimeout(() => {
        urlInputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }
  };

  const handleMobileContentToggle = () => {
    setMobileContentExpanded(!mobileContentExpanded);
    TouchUtils.hapticFeedback('light');
  };

  const handleMobileViewModeChange = (mode) => {
    setMobileViewMode(mode);
    TouchUtils.hapticFeedback('light');
  };

  const handleSwipeToggle = () => {
    setIsSwipeEnabled(!isSwipeEnabled);
    TouchUtils.hapticFeedback('medium');
  };

  // Mobile-optimized copy function with feedback
  const handleMobileCopyTranslation = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        TouchUtils.hapticFeedback('success');
      } catch (err) {
        console.error('Failed to copy text:', err);
        TouchUtils.hapticFeedback('error');
      }
    }
  };

  // Render mobile-specific controls
  const renderMobileControls = () => {
    if (!mobile.isMobile) return null;

    return (
      <div className="mobile-card p-4 mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mobile Controls
        </h3>
        
        <div className="space-y-3">
          {/* View Mode Control */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">View Mode:</span>
            <div className="flex space-x-1">
              {['compact', 'expanded'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleMobileViewModeChange(mode)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all mobile-touch-xs ${
                    mobileViewMode === mode
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Gesture Control */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Swipe Gestures:</span>
            <button
              onClick={handleSwipeToggle}
              className={`px-3 py-1 text-xs rounded-lg transition-all mobile-touch-xs ${
                isSwipeEnabled
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {isSwipeEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Gesture Hints */}
          {isSwipeEnabled && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">
              <p>• Swipe right to scrape content</p>
              <p>• Swipe left to translate</p>
              <p>• Swipe down to clear</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen transition-colors duration-300 ${
        mobile.isMobile
          ? 'mobile-full-height bg-gradient-to-br from-green-50 via-white to-blue-50'
          : 'bg-gradient-to-br from-green-50 via-white to-blue-50'
      }`}
    >
      {/* Enhanced Mobile-First Header */}
      <div className={`text-center py-8 sm:py-12 bg-gradient-to-r from-green-50 via-emerald-50 to-blue-50 relative overflow-hidden ${
        mobile.isMobile ? 'mobile-container safe-area-inset-top' : 'mobile-container mobile-safe-top'
      }`}>
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-100/20 via-emerald-100/20 to-blue-100/20"></div>
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h1 className="text-mobile-xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 leading-tight">
            Web Scraper & Translator
          </h1>
          <p className="text-mobile-base sm:text-lg text-gray-600 mb-4">
            Extract and Translate Web Content
          </p>
          <div className="w-20 sm:w-28 h-1.5 bg-gradient-to-r from-green-500 to-blue-600 mx-auto rounded-full shadow-sm"></div>
        </div>
      </div>

      {/* Enhanced Mobile-First Interface */}
      <div className={`max-w-6xl mx-auto -mt-4 relative z-10 ${
        mobile.isMobile ? 'mobile-container mobile-content-spacing' : 'mobile-container'
      }`}>

        {/* Mobile Controls */}
        {renderMobileControls()}

        {/* Enhanced URL Input Section */}
        <div className="mb-8 animate-slideInUp">
          <div className="mobile-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-mobile-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3 shadow-lg">
                  🌐
                </div>
                <span className="hidden sm:inline">Website URL</span>
                <span className="sm:hidden">URL</span>
              </h2>
              <button
                onClick={handleClear}
                className="min-h-[48px] px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 touch-manipulation flex items-center space-x-2 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    if (mobile.isLowEndDevice) {
                      debouncedUrlChange(e.target.value);
                    } else {
                      setUrl(e.target.value);
                    }
                  }}
                  onFocus={handleMobileUrlFocus}
                  placeholder="Enter URL (e.g., https://www.69shuba.com/...)"
                  className={`mobile-input w-full pl-12 pr-4 py-4 text-mobile-base transition-all duration-200 ${
                    mobile.isMobile ? 'mobile-touch-base' : ''
                  }`}
                  disabled={isScrapingLoading}
                  style={{
                    fontSize: mobile.isMobile ? '16px' : undefined,
                    touchAction: mobile.isMobile ? 'manipulation' : undefined
                  }}
                />
              </div>

              <button
                onClick={handleScrape}
                disabled={isScrapingLoading || !url.trim()}
                className={`mobile-button-primary w-full font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group ${
                  mobile.isMobile
                    ? 'min-h-[52px] text-base mobile-touch-base'
                    : 'min-h-[56px] text-mobile-lg'
                }`}
              >
                {/* Button background animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  {isScrapingLoading ? (
                    <>
                      <div className="relative">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30"></div>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent absolute top-0 left-0"></div>
                      </div>
                      <span>Scraping Content...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span>Scrape Content</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-8 animate-slideInUp">
            <div className="mobile-card p-6 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-800 font-semibold mb-1">Scraping Error</h3>
                  <p className="text-red-700 text-mobile-base leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Scraped Content Display */}
        {scrapedData && (
          <div className="mb-8 animate-slideInUp" style={{ animationDelay: '0.1s' }}>
            <div className="mobile-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-mobile-lg sm:text-xl font-bold text-gray-800 flex items-center">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3 shadow-lg">
                    📄
                  </div>
                  <span className="hidden sm:inline">Scraped Content</span>
                  <span className="sm:hidden">Content</span>
                </h2>
              </div>

              {/* Enhanced Model Selection and Translation Controls */}
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex flex-col space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-mobile-base font-bold text-gray-800">Translation Model</h3>
                      <p className="text-sm text-gray-600">Choose the best model for your content</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isTranslatingLoading}
                        className="mobile-input w-full min-h-[52px] px-4 py-3 text-mobile-base font-medium
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="deepseek-chat">⚡ Chat Model - Fast & Efficient</option>
                        <option value="deepseek-reasoner">🧠 Reasoner Model - Advanced Reasoning</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        {selectedModel === 'deepseek-chat'
                          ? 'Quick and efficient translation for general content'
                          : 'Advanced reasoning for complex and nuanced content'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2">
                      <button
                        onClick={handleTranslate}
                        disabled={isTranslatingLoading || !scrapedData.content}
                        className="mobile-button-primary min-h-[52px] px-8 py-3 text-mobile-base font-bold
                                   disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                                   relative overflow-hidden group w-full sm:w-auto"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative z-10 flex items-center justify-center space-x-2">
                          {isTranslatingLoading ? (
                            <>
                              <div className="relative">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30"></div>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent absolute top-0 left-0"></div>
                              </div>
                              <span>Translating...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                              </svg>
                              <span>Translate</span>
                            </>
                          )}
                        </div>
                      </button>
                      
                      {/* Enhanced Translation Timer */}
                      {isTranslatingLoading && translationStartTime && (
                        <div className="text-xs text-blue-600 font-semibold bg-blue-100 px-3 py-1 rounded-full animate-pulse-slow">
                          <TranslationTimer startTime={translationStartTime} />
                        </div>
                      )}
                      
                      {translationDuration && !isTranslatingLoading && (
                        <div className="text-xs text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
                          ✓ Completed in {(translationDuration / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Content Display */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200 rounded-xl p-6 mb-4">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-bold text-gray-800 mb-2 line-clamp-2 ${
                          mobile.isMobile ? 'text-sm' : 'text-mobile-base sm:text-lg'
                        }`}>
                          {scrapedData.title}
                        </h3>
                        <div className={`flex flex-wrap items-center gap-2 text-gray-500 mb-3 ${
                          mobile.isMobile ? 'text-xs' : 'text-xs sm:text-sm'
                        }`}>
                          <span className="bg-white px-2 py-1 rounded-lg">📍 {new URL(scrapedData.url).hostname}</span>
                          <span className="bg-white px-2 py-1 rounded-lg">📊 {scrapedData.wordCount} words</span>
                        </div>
                      </div>
                      
                      {/* Mobile expand/collapse button */}
                      {mobile.isMobile && (
                        <button
                          onClick={handleMobileContentToggle}
                          className="ml-2 p-2 text-gray-500 hover:text-gray-700 rounded-lg mobile-touch-xs"
                        >
                          <svg className={`w-4 h-4 transition-transform ${mobileContentExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div
                  ref={contentPreviewRef}
                  className={`overflow-y-auto mobile-scroll bg-white rounded-lg p-4 border transition-all duration-300 ${
                    mobile.isMobile
                      ? mobileContentExpanded
                        ? 'max-h-96'
                        : mobileViewMode === 'compact'
                          ? 'max-h-32'
                          : 'max-h-48'
                      : 'max-h-72'
                  }`}
                >
                  <p className={`text-gray-700 leading-relaxed whitespace-pre-wrap mobile-text-selection ${
                    mobile.isMobile ? 'text-sm' : 'text-mobile-base'
                  }`}>
                    {scrapedData.content}
                  </p>
                </div>
                
                {/* Mobile content indicator */}
                {mobile.isMobile && scrapedData.content.length > 500 && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {mobileContentExpanded ? 'Tap arrow to collapse' : 'Tap arrow to expand content'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Translation Output */}
        {translatedText && (
          <div className="mb-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <div className="mobile-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-mobile-lg sm:text-xl font-bold text-gray-800 flex items-center">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3 shadow-lg">
                    EN
                  </div>
                  <span className="hidden sm:inline">English Translation</span>
                  <span className="sm:hidden">Translation</span>
                </h2>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={mobile.isMobile ? handleMobileCopyTranslation : handleCopyTranslation}
                    className={`min-h-[48px] px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center space-x-2 touch-manipulation ${
                      mobile.isMobile ? 'mobile-touch-sm' : 'hover:scale-105'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={handleOpenReadingMode}
                    className={`min-h-[48px] px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 touch-manipulation shadow-lg ${
                      mobile.isMobile ? 'mobile-touch-sm' : 'hover:scale-105'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="hidden sm:inline">Reading Mode</span>
                    <span className="sm:hidden">Read</span>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <div className={`overflow-y-auto mobile-scroll bg-white rounded-lg p-4 mb-4 border transition-all duration-300 ${
                  mobile.isMobile
                    ? mobileViewMode === 'compact'
                      ? 'max-h-48'
                      : 'max-h-72'
                    : 'max-h-96'
                }`}>
                  <p className={`text-gray-800 leading-relaxed whitespace-pre-wrap mobile-text-selection ${
                    mobile.isMobile ? 'text-sm' : 'text-mobile-base'
                  }`}>
                    {translatedText}
                  </p>
                </div>
                <div className={`flex flex-wrap items-center gap-3 text-purple-600 font-medium ${
                  mobile.isMobile ? 'text-xs' : 'text-xs sm:text-sm'
                }`}>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Translation completed</span>
                  </div>
                  <span>•</span>
                  <span>{translatedText.split(/\s+/).length} words</span>
                  {translationDuration && (
                    <>
                      <span>•</span>
                      <span>{(translationDuration / 1000).toFixed(1)}s</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Model: {selectedModel === 'deepseek-chat' ? 'Chat' : 'Reasoner'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-specific footer with status */}
        {mobile.isMobile && (
          <div className="text-center safe-area-inset-bottom pt-4 pb-6">
            <div className="inline-flex items-center space-x-2 px-3 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
              <p className="text-xs text-gray-600 font-medium">
                Web Scraper • {mobile.deviceType} • {mobile.connectionType}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebScraper;
