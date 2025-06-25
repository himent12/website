import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ReadingMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('text-lg');
  const [readingProgress, setReadingProgress] = useState(0);
  
  // Get the translated text from navigation state
  const translatedText = location.state?.translatedText || '';
  // const originalText = location.state?.originalText || ''; // Reserved for future use
  
  // Redirect if no text is provided
  useEffect(() => {
    if (!translatedText) {
      navigate('/');
    }
  }, [translatedText, navigate]);

  // Calculate reading progress based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setReadingProgress(Math.min(scrollPercent, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Format text into paragraphs
  const formatTextIntoParagraphs = (text) => {
    return text
      .split(/\n\s*\n/) // Split on double line breaks
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => paragraph.trim());
  };

  const paragraphs = formatTextIntoParagraphs(translatedText);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fontSizeOptions = [
    { label: 'Small', value: 'text-base', size: '16px' },
    { label: 'Medium', value: 'text-lg', size: '18px' },
    { label: 'Large', value: 'text-xl', size: '20px' },
    { label: 'Extra Large', value: 'text-2xl', size: '24px' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gray-900 text-gray-100'
        : 'bg-tan-100 text-gray-900'
    }`}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-blue-500 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Header Controls */}
      <div className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-tan-50 border-tan-300'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-tan-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Translator</span>
            </button>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Font Size Control */}
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Font:
                </span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className={`px-2 py-1 rounded border text-sm ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-tan-50 border-tan-300 text-gray-900'
                  }`}
                >
                  {fontSizeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-yellow-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-tan-200'
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

              {/* Progress Indicator */}
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {Math.round(readingProgress)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reading Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Document Info */}
        <div className={`mb-8 p-4 rounded-lg border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-tan-50 border-tan-300'
        }`}>
          <h1 className={`text-2xl font-bold mb-2 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Reading Mode
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Translated from Chinese • {paragraphs.length} paragraph{paragraphs.length !== 1 ? 's' : ''} • 
            Estimated reading time: {Math.ceil(translatedText.split(' ').length / 200)} min
          </p>
        </div>

        {/* Reading Content */}
        <article className="prose prose-lg max-w-none">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className={`mb-6 leading-relaxed font-lora ${fontSize} ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}
              style={{ lineHeight: '1.8' }}
            >
              {paragraph}
            </p>
          ))}
        </article>

        {/* End of Document */}
        <div className={`mt-12 pt-8 border-t text-center ${
          isDarkMode ? 'border-gray-700' : 'border-tan-300'
        }`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            End of document
          </p>
          <button
            onClick={() => navigate('/')}
            className={`mt-4 px-6 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Translate Another Document
          </button>
        </div>
      </div>

      {/* Floating Action Button - Scroll to Top */}
      {readingProgress > 10 && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 ${
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-tan-50 hover:bg-tan-100 text-gray-700 border border-tan-300'
          }`}
          title="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ReadingMode;
