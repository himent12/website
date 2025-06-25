import React, { useState, useEffect } from 'react';
import TextTranslator from './TextTranslator';
import WebScraper from './WebScraper';
import Documents from './Documents';
import ApiKeySettings from './ApiKeySettings';

const TabContainer = () => {
  const [activeTab, setActiveTab] = useState('translation');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('mainSiteDarkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('mainSiteDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const tabs = [
    {
      id: 'translation',
      name: 'Translation',
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
        </svg>
      ),
      component: <ApiKeySettings />
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      {/* Mobile-Optimized Tab Navigation */}
      <div className={`shadow-sm border-b sticky top-0 z-10 transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <nav className="flex justify-center sm:justify-start overflow-x-auto scrollbar-hide flex-1" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? isDarkMode
                        ? 'border-blue-400 text-blue-400 bg-blue-900/30'
                        : 'border-blue-500 text-blue-600 bg-blue-50'
                      : isDarkMode
                        ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-600 hover:bg-gray-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                  flex-shrink-0 min-h-[44px] px-3 sm:px-4 py-2 sm:py-4
                  border-b-2 font-medium text-sm sm:text-base
                  flex items-center justify-center space-x-1 sm:space-x-2
                  transition-all duration-200 ease-in-out
                  touch-manipulation select-none
                  min-w-[80px] sm:min-w-auto
                  `}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                >
                  <span className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">
                    {tab.icon}
                  </span>
                  <span className="hidden xs:inline sm:inline truncate">{tab.name}</span>
                  <span className="xs:hidden sm:hidden text-xs font-semibold">
                    {tab.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </nav>
            
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className={`ml-4 p-2 rounded-lg transition-colors duration-200 ${
                isDarkMode
                  ? 'text-yellow-400 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div
        className="pb-4 sm:pb-8"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default TabContainer;
