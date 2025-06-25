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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Mobile-First Header */}
      <div className="text-center mobile-container mobile-safe-top py-8 sm:py-12 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-indigo-100/20 to-purple-100/20"></div>
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <h1 className="text-mobile-xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 leading-tight">
            Chinese to English Translator
          </h1>
          <p className="text-mobile-base sm:text-lg text-gray-600 mb-4">
            AI-Powered Translation Service
          </p>
          <div className="w-20 sm:w-28 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full shadow-sm"></div>
        </div>
      </div>

      {/* Enhanced Mobile-First Translation Interface */}
      <div className="mobile-container max-w-6xl mx-auto -mt-4 relative z-10">

        {/* Enhanced Input Section */}
        <div className="mb-8 animate-slideInUp">
          <div className="mobile-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-mobile-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3 shadow-lg">
                  中
                </div>
                <span className="hidden sm:inline">Chinese Input</span>
                <span className="sm:hidden">Chinese</span>
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

            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter Chinese text to translate..."
                className="mobile-input w-full h-52 sm:h-60 lg:h-64 p-5 sm:p-6
                           resize-none text-mobile-base sm:text-lg leading-relaxed
                           placeholder-gray-400 mobile-scroll"
                disabled={isLoading}
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-500 font-medium shadow-sm">
                {inputText.length} characters
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Output Section */}
        <div className="mb-8 animate-slideInUp" style={{ animationDelay: '0.1s' }}>
          <div className="mobile-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-mobile-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3 shadow-lg">
                  EN
                </div>
                <span className="hidden sm:inline">English Translation</span>
                <span className="sm:hidden">English</span>
              </h2>
              {outputText && (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={handleCopyOutput}
                    className="min-h-[48px] px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center space-x-2 touch-manipulation hover:scale-105"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={handleOpenReadingMode}
                    className="min-h-[48px] px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 touch-manipulation hover:scale-105 shadow-lg"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="mobile-input w-full h-52 sm:h-60 lg:h-64 p-5 sm:p-6
                           resize-none bg-gray-50/80 text-mobile-base sm:text-lg leading-relaxed
                           placeholder-gray-400 mobile-scroll"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center space-y-4 p-6 animate-scaleIn">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <span className="text-gray-700 text-mobile-base font-semibold">Translating...</span>
                  </div>
                </div>
              )}
              {outputText && (
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-500 font-medium shadow-sm">
                  {outputText.length} characters
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Translation Timer */}
        {isLoading && translationStartTime && (
          <div className="mb-8 flex justify-center animate-scaleIn">
            <div className="mobile-card px-6 py-4 flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="relative">
                <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-blue-700 text-mobile-base font-semibold">
                Translation time: {formatElapsedTime(elapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Error Message */}
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
                  <h3 className="text-red-800 font-semibold mb-1">Translation Error</h3>
                  <p className="text-red-700 text-mobile-base leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Model Selection */}
        <div className="mb-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          <div className="mobile-card p-6 sm:p-8">
            <div className="flex flex-col space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-mobile-lg font-bold text-gray-800">AI Model Selection</h3>
                  <p className="text-sm text-gray-600">Choose the best model for your translation needs</p>
                </div>
              </div>

              <div className="space-y-4">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                  className="mobile-input w-full min-h-[52px] px-4 py-3 text-mobile-base font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="deepseek-reasoner">🧠 DeepSeek Reasoner - Advanced Reasoning</option>
                  <option value="deepseek-chat">⚡ DeepSeek Chat - Fast & Efficient</option>
                </select>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      {selectedModel === 'deepseek-reasoner' ? (
                        <p className="text-blue-700 text-sm leading-relaxed">
                          <strong>DeepSeek Reasoner:</strong> Advanced reasoning model with enhanced logical thinking capabilities for complex translations and nuanced content.
                        </p>
                      ) : (
                        <p className="text-blue-700 text-sm leading-relaxed">
                          <strong>DeepSeek Chat:</strong> Fast and efficient conversational model optimized for general translation tasks with quick response times.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Action Button */}
        <div className="flex justify-center mb-10 animate-slideInUp" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="mobile-button-primary w-full sm:w-auto min-h-[60px] px-10 py-4
                       text-mobile-lg font-bold
                       flex items-center justify-center space-x-3
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                       relative overflow-hidden group"
          >
            {/* Button background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10 flex items-center space-x-3">
              {isLoading ? (
                <>
                  <div className="relative">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30"></div>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent absolute top-0 left-0"></div>
                  </div>
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span>Translate Text</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center mobile-safe-bottom pb-6 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              Powered by AI Translation • 由人工智能驱动
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextTranslator;

