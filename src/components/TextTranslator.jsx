import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTranslation } from '../utils/translationHistory';

const TextTranslator = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [translationStartTime, setTranslationStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Model selection state
  const [selectedModel, setSelectedModel] = useState('deepseek-reasoner');

  // Timer effect for real-time updates
  useEffect(() => {
    let interval = null;
    
    if (isLoading && translationStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - translationStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading, translationStartTime]);


  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setError('Please enter Chinese text to translate');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranslationStartTime(Date.now());
    setElapsedTime(0);

    try {
      // Prepare request payload with selected model
      const requestBody = {
        text: inputText.trim(),
        from: 'zh',
        to: 'en',
        model: selectedModel
      };

      // Make API request with session credentials
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translatedText || data.translation || '';
      
      setOutputText(translatedText);

      // Save to translation history if translation was successful
      if (translatedText && translatedText.trim().length > 0) {
        saveTranslation(inputText, translatedText);
      }
    } catch (err) {
      setError(`Translation error: ${err.message}`);
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
      setTranslationStartTime(null);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
    setTranslationStartTime(null);
    setElapsedTime(0);
  };

  const handleCopyOutput = async () => {
    if (outputText) {
      try {
        await navigator.clipboard.writeText(outputText);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleOpenReadingMode = () => {
    if (outputText) {
      navigate('/reading', {
        state: {
          translatedText: outputText,
          originalText: inputText
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-Optimized Header */}
      <div className="text-center px-4 py-6 sm:py-8 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Chinese to English Translator
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          AI-Powered Translation Service
        </p>
        <div className="w-16 sm:w-24 h-1 bg-blue-500 mx-auto mt-3 sm:mt-4 rounded-full"></div>
      </div>

      {/* Mobile-First Translation Interface */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* Input Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
              <span className="w-6 h-6 sm:w-7 sm:h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 sm:mr-3">
                ZH
              </span>
              <span className="hidden sm:inline">Chinese Input</span>
              <span className="sm:hidden">Chinese</span>
            </h2>
            <button
              onClick={handleClear}
              className="min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <span className="hidden sm:inline">Clear</span>
              <span className="sm:hidden">Clear</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter Chinese text to translate..."
              className="w-full h-48 sm:h-56 lg:h-64 p-4 sm:p-5
                         border-2 border-gray-200 rounded-xl
                         resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         focus:outline-none transition-all duration-200
                         text-base sm:text-lg leading-relaxed
                         touch-manipulation"
              disabled={isLoading}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-xs sm:text-sm text-gray-400 bg-white px-2 py-1 rounded">
              {inputText.length} characters
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
              <span className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 sm:mr-3">
                EN
              </span>
              <span className="hidden sm:inline">English Translation</span>
              <span className="sm:hidden">English</span>
            </h2>
            {outputText && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={handleCopyOutput}
                  className="min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center touch-manipulation"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={handleOpenReadingMode}
                  className="min-h-[44px] px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors flex items-center touch-manipulation"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="hidden sm:inline">Reading</span>
                  <span className="sm:hidden">Read</span>
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <textarea
              value={outputText}
              readOnly
              placeholder={isLoading ? "Translating..." : "Translation will appear here..."}
              className="w-full h-48 sm:h-56 lg:h-64 p-4 sm:p-5
                         border-2 border-gray-200 rounded-xl
                         resize-none bg-gray-50
                         text-base sm:text-lg leading-relaxed
                         touch-manipulation"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-xl">
                <div className="flex flex-col items-center space-y-3 p-4">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-500"></div>
                  <span className="text-gray-600 text-sm sm:text-base font-medium">Translating...</span>
                </div>
              </div>
            )}
            {outputText && (
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-xs sm:text-sm text-gray-400 bg-white px-2 py-1 rounded">
                {outputText.length} characters
              </div>
            )}
          </div>
        </div>

        {/* Translation Timer */}
        {isLoading && translationStartTime && (
          <div className="mb-6 flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700 text-sm font-medium">
                Translation time: {formatElapsedTime(elapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm sm:text-base leading-relaxed">{error}</span>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            {/* Model Selection */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
                className="min-h-[44px] px-3 py-2 border-2 border-gray-200 rounded-lg
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
                           text-sm font-medium bg-white disabled:bg-gray-100 disabled:cursor-not-allowed
                           touch-manipulation"
              >
                <option value="deepseek-reasoner">DeepSeek Reasoner</option>
                <option value="deepseek-chat">DeepSeek Chat</option>
              </select>
            </div>
          </div>

          {/* Model Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            {selectedModel === 'deepseek-reasoner' ? (
              <p><strong>DeepSeek Reasoner:</strong> Advanced reasoning model with enhanced logical thinking capabilities for complex translations.</p>
            ) : (
              <p><strong>DeepSeek Chat:</strong> Fast and efficient conversational model optimized for general translation tasks.</p>
            )}
          </div>
        </div>

        {/* Mobile-Optimized Action Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full sm:w-auto min-h-[56px] px-8 py-4
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       text-white font-semibold text-base sm:text-lg
                       rounded-xl shadow-lg hover:shadow-xl
                       transition-all duration-200 ease-in-out
                       flex items-center justify-center space-x-3
                       touch-manipulation transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Translating...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>Translate</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile-Optimized Footer */}
        <div className="text-center text-xs sm:text-sm text-gray-500 pb-4">
          <p>Powered by AI Translation • 由人工智能驱动</p>
        </div>
      </div>
    </div>
  );
};

export default TextTranslator;

