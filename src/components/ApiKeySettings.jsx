import React, { useState, useEffect, useCallback } from 'react';
import {
  saveUserApiKey,
  getUserApiKey,
  hasUserApiKey,
  getApiKeyMetadata,
  removeUserApiKey,
  clearAllApiKeys
} from '../utils/userApiKeyManager';

const ApiKeySettings = () => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [keyMetadata, setKeyMetadata] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const loadKeyData = useCallback(() => {
    if (hasUserApiKey('deepseek')) {
      const metadata = getApiKeyMetadata('deepseek');
      setKeyMetadata(metadata);
      setKeyStatus('saved');

      // Only load the actual key when editing
      if (isEditing) {
        setDeepseekKey(getUserApiKey('deepseek') || '');
      } else {
        setDeepseekKey(''); // Clear from state when not editing
      }
    } else {
      setKeyMetadata(null);
      setKeyStatus('');
      setDeepseekKey('');
    }
  }, [isEditing]);

  useEffect(() => {
    loadKeyData();
  }, [loadKeyData]);

  const handleSaveKey = () => {
    if (!deepseekKey.trim()) {
      setKeyStatus('error');
      return;
    }

    const result = saveUserApiKey('deepseek', deepseekKey);
    if (result.success) {
      setKeyStatus('saved');
      setIsEditing(false);
      setShowKey(false);
      setDeepseekKey(''); // Clear from state after saving
      loadKeyData(); // Reload metadata
    } else {
      setKeyStatus('error');
      console.error('Save error:', result.error);
    }
  };

  const handleEditKey = () => {
    setIsEditing(true);
    setDeepseekKey(getUserApiKey('deepseek') || '');
    setKeyStatus('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowKey(false);
    setDeepseekKey('');
    setKeyStatus(keyMetadata ? 'saved' : '');
  };

  const handleDeleteKey = () => {
    const result = removeUserApiKey('deepseek');
    if (result.success) {
      setKeyMetadata(null);
      setKeyStatus('deleted');
      setIsEditing(false);
      setShowKey(false);
      setDeepseekKey('');
      setShowDeleteConfirm(false);
    }
  };

  const handleClearAllKeys = () => {
    const result = clearAllApiKeys();
    if (result.success) {
      setKeyMetadata(null);
      setKeyStatus('cleared');
      setIsEditing(false);
      setShowKey(false);
      setDeepseekKey('');
      setShowClearAllConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Mobile-Optimized Header */}
          <div className="px-4 sm:px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">API Key Management</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage your personal API keys for translation services
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${keyMetadata ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-sm sm:text-base text-gray-600 font-medium">
                  {keyMetadata ? 'API Key Active' : 'No API Key'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile-Optimized DeepSeek API Key Section */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">DeepSeek API Key</h3>
                  <p className="text-sm sm:text-base text-gray-600">Required for AI-powered translations</p>
                </div>
              </div>

              {keyMetadata && !isEditing && (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={handleEditKey}
                    className="min-h-[44px] px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors touch-manipulation"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="min-h-[44px] px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors touch-manipulation"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Mobile-Optimized Key Status Display */}
            {keyMetadata && !isEditing && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <p className="text-sm sm:text-base font-medium text-green-800">API Key Configured</p>
                    <p className="text-xs sm:text-sm text-green-600">
                      Key: {keyMetadata.keyPrefix} •
                      Saved: {new Date(keyMetadata.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile-Optimized Key Input Form */}
            {(!keyMetadata || isEditing) && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                    API Key
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0">
                    <input
                      type={showKey ? "text" : "password"}
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                      className="flex-1 min-h-[48px] p-4 border border-gray-300
                                 rounded-xl sm:rounded-l-xl sm:rounded-r-none
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 font-mono text-sm sm:text-base
                                 touch-manipulation"
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="min-h-[48px] px-4 bg-gray-100 border border-gray-300
                                 rounded-xl sm:rounded-l-none sm:rounded-r-xl sm:border-l-0
                                 hover:bg-gray-200 transition-colors
                                 touch-manipulation flex items-center justify-center"
                      type="button"
                    >
                      {showKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500">
                    DeepSeek API keys start with "sk-" and are typically 48-64 characters long
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleSaveKey}
                    disabled={!deepseekKey.trim()}
                    className="min-h-[48px] px-6 py-3 bg-blue-600 text-white font-medium
                               rounded-xl hover:bg-blue-700
                               disabled:bg-gray-300 disabled:cursor-not-allowed
                               transition-colors touch-manipulation
                               flex items-center justify-center"
                  >
                    {keyMetadata ? 'Update Key' : 'Save Key'}
                  </button>

                  {isEditing && (
                    <button
                      onClick={handleCancelEdit}
                      className="min-h-[48px] px-6 py-3 bg-gray-200 text-gray-700 font-medium
                                 rounded-xl hover:bg-gray-300 transition-colors touch-manipulation
                                 flex items-center justify-center"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile-Optimized Status Messages */}
          {keyStatus === 'saved' && (
            <div className="mx-4 sm:mx-6 mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700 font-medium text-sm sm:text-base">API key saved successfully!</span>
              </div>
            </div>
          )}

          {keyStatus === 'error' && (
            <div className="mx-4 sm:mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium text-sm sm:text-base">Error saving API key. Please check the format and try again.</span>
              </div>
            </div>
          )}

          {keyStatus === 'deleted' && (
            <div className="mx-4 sm:mx-6 mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-orange-700 font-medium text-sm sm:text-base">API key deleted successfully.</span>
              </div>
            </div>
          )}

          {keyStatus === 'cleared' && (
            <div className="mx-4 sm:mx-6 mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-orange-700 font-medium text-sm sm:text-base">All API keys cleared successfully.</span>
              </div>
            </div>
          )}

          {/* Mobile-Optimized Security Information */}
          <div className="mx-4 sm:mx-6 mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-3 text-sm sm:text-base">Security & Privacy Information</h3>
                <ul className="text-xs sm:text-sm text-yellow-700 space-y-2">
                  <li>• Your API keys are stored locally in your browser only</li>
                  <li>• Keys are obfuscated (not encrypted) for basic protection</li>
                  <li>• We never send your API keys to our servers</li>
                  <li>• Translations are processed directly between your browser and the API provider</li>
                  <li>• Clear your browser data or use the delete button to remove stored keys</li>
                  <li>• Never share your API keys with others</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mobile-Optimized Danger Zone */}
          {keyMetadata && (
            <div className="mx-4 sm:mx-6 mb-6 bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2 text-sm sm:text-base">Danger Zone</h3>
                  <p className="text-xs sm:text-sm text-red-700 mb-4">
                    These actions cannot be undone. Please be careful.
                  </p>
                  <button
                    onClick={() => setShowClearAllConfirm(true)}
                    className="min-h-[44px] px-4 py-2 bg-red-600 text-white text-sm font-medium
                               rounded-xl hover:bg-red-700 transition-colors touch-manipulation
                               w-full sm:w-auto"
                  >
                    Clear All API Keys
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile-Optimized Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Delete API Key</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                Are you sure you want to delete your DeepSeek API key? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="min-h-[48px] px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100
                             rounded-xl transition-colors touch-manipulation
                             flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteKey}
                  className="min-h-[48px] px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700
                             transition-colors touch-manipulation
                             flex items-center justify-center"
                >
                  Delete Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-Optimized Clear All Confirmation Modal */}
        {showClearAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Clear All API Keys</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                Are you sure you want to clear all stored API keys? This will remove all your saved API keys and cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  className="min-h-[48px] px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100
                             rounded-xl transition-colors touch-manipulation
                             flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllKeys}
                  className="min-h-[48px] px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700
                             transition-colors touch-manipulation
                             flex items-center justify-center"
                >
                  Clear All Keys
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeySettings;