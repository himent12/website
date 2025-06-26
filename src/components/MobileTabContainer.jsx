import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMobile } from '../contexts/MobileContext';
import { GestureHandler, TouchUtils } from '../utils/mobileUtils';
import TextTranslator from './TextTranslator';
import WebScraper from './WebScraper';
import Documents from './Documents';
import ApiKeySettings from './ApiKeySettings';

const MobileTabContainer = () => {
  const [activeTab, setActiveTab] = useState('translation');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const mobile = useMobile();
  const tabContainerRef = useRef(null);
  const gestureHandlerRef = useRef(null);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('mobileTabDarkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('mobileTabDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Memoize tabs array to prevent unnecessary re-renders
  const tabs = useMemo(() => [
    {
      id: 'translation',
      name: 'Translation',
      shortName: 'Translate',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      component: <TextTranslator />
    },
    {
      id: 'web-scraper',
      name: 'Web Scraper',
      shortName: 'Scraper',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      component: <WebScraper />
    },
    {
      id: 'documents',
      name: 'Documents',
      shortName: 'Docs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      component: <Documents />
    },
    {
      id: 'api-settings',
      name: 'API Settings',
      shortName: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1 17 21 9z" />
        </svg>
      ),
      component: <ApiKeySettings />
    }
  ], []);

  // Set up gesture handling for tab switching
  useEffect(() => {
    if (!tabContainerRef.current || !mobile.isMobile) return;

    const gestureHandler = new GestureHandler(tabContainerRef.current, {
      threshold: 50,
      velocity: 0.3,
      preventScroll: false
    });

    gestureHandler.onGestureEnd = (gesture) => {
      if (gesture.type === 'swipe' && gesture.direction === 'left') {
        // Swipe left to next tab
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
        TouchUtils.hapticFeedback('light');
      } else if (gesture.type === 'swipe' && gesture.direction === 'right') {
        // Swipe right to previous tab
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTab(tabs[prevIndex].id);
        TouchUtils.hapticFeedback('light');
      }
    };

    gestureHandlerRef.current = gestureHandler;

    return () => {
      gestureHandler.destroy();
    };
  }, [activeTab, mobile.isMobile, tabs]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    TouchUtils.hapticFeedback('light');
  };

  const toggleTabMenu = () => {
    setShowTabMenu(!showTabMenu);
    TouchUtils.hapticFeedback('light');
  };

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setShowTabMenu(false);
    TouchUtils.hapticFeedback('medium');
  };

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`min-h-screen transition-colors duration-300 mobile-full-height ${
      isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      {/* Mobile-Optimized Tab Navigation */}
      <div className={`shadow-lg border-b sticky top-0 z-50 transition-all duration-300 backdrop-blur-md safe-area-inset-top ${
        isDarkMode
          ? 'bg-gray-800/95 border-gray-700 shadow-gray-900/20'
          : 'bg-white/95 border-gray-200 shadow-blue-100/50'
      }`}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between">
            {/* Mobile Tab Navigation */}
            <div className="flex items-center flex-1">
              {/* Current Tab Display */}
              <button
                onClick={toggleTabMenu}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mobile-touch-sm ${
                  isDarkMode
                    ? 'bg-gray-700/50 text-gray-100 hover:bg-gray-600/50'
                    : 'bg-gray-100/50 text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                <span className="w-5 h-5 flex-shrink-0">
                  {currentTab?.icon}
                </span>
                <span className="font-medium text-sm mobile-text-sm">
                  {mobile.isMobile ? currentTab?.shortName : currentTab?.name}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showTabMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Tab Progress Indicator - Now Clickable */}
              <div className="flex items-center ml-4 space-x-1">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    className={`w-3 h-3 rounded-full transition-all mobile-touch-xs ${
                      tab.id === activeTab
                        ? isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                        : isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Switch to ${tab.name}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`ml-3 p-3 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 mobile-touch-sm ${
                isDarkMode
                  ? 'text-yellow-400 hover:bg-gray-700/50 bg-gray-800/50 shadow-lg shadow-gray-900/20'
                  : 'text-gray-600 hover:bg-gray-100/50 bg-white/50 shadow-lg shadow-gray-200/50'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 transition-transform duration-300 hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Menu Dropdown */}
      {showTabMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 mobile-modal-overlay">
          <div className={`w-full max-w-sm mx-4 rounded-2xl overflow-hidden mobile-slide-up ${
            isDarkMode
              ? 'bg-gray-800/95 border-gray-700'
              : 'bg-white/95 border-gray-200'
          } border backdrop-blur-xl shadow-xl`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mobile-title-text`}>
                  Select Tab
                </h3>
                <button
                  onClick={toggleTabMenu}
                  className={`p-2 rounded-lg mobile-touch-sm ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all mobile-touch-sm ${
                      activeTab === tab.id
                        ? isDarkMode
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700/50'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-5 h-5 flex-shrink-0">
                      {tab.icon}
                    </span>
                    <span className="font-medium text-left mobile-body-text">
                      {tab.name}
                    </span>
                    {activeTab === tab.id && (
                      <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content with Gesture Support */}
      <div
        ref={tabContainerRef}
        className={`pb-6 sm:pb-8 transition-colors duration-300 mobile-content-container ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}
        role="tabpanel"
        id={`mobile-tabpanel-${activeTab}`}
        aria-labelledby={`mobile-tab-${activeTab}`}
      >
        <div className="mobile-fade-in">
          {currentTab?.component}
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      {mobile.isMobile && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 safe-area-inset-bottom">
          <div className={`px-4 py-2 rounded-full backdrop-blur-md ${
            isDarkMode
              ? 'bg-gray-800/80 text-gray-300 border-gray-700'
              : 'bg-white/80 text-gray-600 border-gray-200'
          } border shadow-lg`}>
            <p className="text-xs text-center mobile-caption-text">
              Swipe left/right to switch tabs
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileTabContainer;