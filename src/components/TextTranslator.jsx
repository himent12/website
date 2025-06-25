import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTranslation } from '../utils/translationHistory';
import { getUserApiKey, hasUserApiKey } from '../utils/userApiKeyManager';

const TextTranslator = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setError('请输入要翻译的中文文本 (Please enter Chinese text to translate)');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Check if user has their own API key
    const userHasApiKey = hasUserApiKey('deepseek');

    try {
      let response;

      if (userHasApiKey) {
        // Send user's API key to server for secure processing
        const apiKey = getUserApiKey('deepseek');
        response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: inputText,
            from: 'zh',
            to: 'en',
            userApiKey: apiKey // Send securely to server
          }),
        });
      } else {
        // Use server's default API key
        response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: inputText,
            from: 'zh',
            to: 'en'
          }),
        });
      }

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
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
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
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          中英翻译器
        </h1>
        <p className="text-lg text-gray-600">
          Chinese to English Translator
        </p>
        <div className="w-24 h-1 bg-primary-500 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Translation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center">
              <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                中
              </span>
              简体中文 (Simplified Chinese)
            </h2>
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              清除 Clear
            </button>
          </div>
          
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入要翻译的中文文本..."
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-primary-500 focus:outline-none transition-colors font-chinese text-lg"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 text-sm text-gray-400">
              {inputText.length} 字符
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                EN
              </span>
              English
            </h2>
            {outputText && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyOutput}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={handleOpenReadingMode}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Reading Mode
                </button>
              </div>
            )}
          </div>
          
          <div className="relative">
            <textarea
              value={outputText}
              readOnly
              placeholder={isLoading ? "Translating..." : "Translation will appear here..."}
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg resize-none bg-gray-50 text-lg"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                  <span className="text-gray-600">Translating...</span>
                </div>
              </div>
            )}
            {outputText && (
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {outputText.length} characters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Translating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>翻译 Translate</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Powered by AI Translation • 由人工智能驱动</p>
      </div>
    </div>
  );
};

export default TextTranslator;

