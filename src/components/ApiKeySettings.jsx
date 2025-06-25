import React, { useState, useEffect, useCallback } from 'react';
import {
  saveUserApiKey,
  hasUserApiKey,
  getApiKeyMetadata,
  removeUserApiKey,
  clearAllApiKeys,
  migrateFromLocalStorage
} from '../utils/userApiKeyManager';

const ApiKeySettings = () => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [keyMetadata, setKeyMetadata] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(true);

  const loadKeyData = useCallback(async () => {
    try {
      setLoading(true);
      const hasKey = await hasUserApiKey('deepseek');
      
      if (hasKey) {
        const metadata = await getApiKeyMetadata('deepseek');
        setKeyMetadata(metadata);
        setKeyStatus('saved');
        setServerConnected(true);

        // For editing, we don't load the actual key since it's stored server-side
        // We just show a placeholder
        if (isEditing) {
          setDeepseekKey(''); // Always start empty for security
        } else {
          setDeepseekKey(''); // Clear from state when not editing
        }
      } else {
        setKeyMetadata(null);
        setKeyStatus('');
        setDeepseekKey('');
        setServerConnected(true);
      }
    } catch (error) {
      console.error('Error loading key data:', error);
      setServerConnected(false);
      setKeyMetadata(null);
      setKeyStatus('error');
    } finally {
      setLoading(false);
    }
  }, [isEditing]);

  useEffect(() => {
    // Migrate old client-side keys on component mount
    migrateFromLocalStorage().then(() => {
      loadKeyData();
    });
  }, [loadKeyData]);

  const handleSaveKey = async () => {
    if (!deepseekKey.trim()) {
      setKeyStatus('error');
      return;
    }

    try {
      setLoading(true);
      const result = await saveUserApiKey('deepseek', deepseekKey);
      if (result.success) {
        setKeyStatus('saved');
        setIsEditing(false);
        setShowKey(false);
        setDeepseekKey(''); // Clear from state after saving
        await loadKeyData(); // Reload metadata
      } else {
        setKeyStatus('error');
        console.error('Save error:', result.error);
      }
    } catch (error) {
      setKeyStatus('error');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditKey = () => {
    setIsEditing(true);
    setDeepseekKey(''); // Always start with empty field for security
    setKeyStatus('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowKey(false);
    setDeepseekKey('');
    setKeyStatus(keyMetadata ? 'saved' : '');
  };

  const handleDeleteKey = async () => {
    try {
      setLoading(true);
      const result = await removeUserApiKey('deepseek');
      if (result.success) {
        setKeyMetadata(null);
        setKeyStatus('deleted');
        setIsEditing(false);
        setShowKey(false);
        setDeepseekKey('');
        setShowDeleteConfirm(false);
      } else {
        setKeyStatus('error');
        console.error('Delete error:', result.error);
      }
    } catch (error) {
      setKeyStatus('error');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllKeys = async () => {
    try {
      setLoading(true);
      const result = await clearAllApiKeys();
      if (result.success) {
        setKeyMetadata(null);
        setKeyStatus('cleared');
        setIsEditing(false);
        setShowKey(false);
        setDeepseekKey('');
        setShowClearAllConfirm(false);
      } else {
        setKeyStatus('error');
        console.error('Clear error:', result.error);
      }
    } catch (error) {
      setKeyStatus('error');
      console.error('Clear error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API key settings...</p>
        </div>
      </div>
    );
  }

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
            </svg>
          </div>
          <h1 className="text-mobile-xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 leading-tight">
            API Key Management
          </h1>
          <p className="text-mobile-base sm:text-lg text-gray-600 mb-4">
            Secure server-side session management for your API keys
          </p>
          <div className="w-20 sm:w-28 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full shadow-sm"></div>
          
          {/* Status Indicator */}
          <div className="mt-6 inline-flex items-center space-x-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200">
            <div className={`w-3 h-3 rounded-full animate-pulse-slow ${
              !serverConnected ? 'bg-red-500' : keyMetadata ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {!serverConnected ? 'Server Disconnected' : keyMetadata ? 'API Key Active' : 'No API Key'}
            </span>
          </div>
        </div>
      </div>

      <div className="mobile-container max-w-4xl mx-auto -mt-4 relative z-10">
        <div className="mobile-card overflow-hidden animate-slideInUp">

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
                    disabled={!deepseekKey.trim() || loading}
                    className="min-h-[48px] px-6 py-3 bg-blue-600 text-white font-medium
                               rounded-xl hover:bg-blue-700
                               disabled:bg-gray-300 disabled:cursor-not-allowed
                               transition-colors touch-manipulation
                               flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      keyMetadata ? 'Update Key' : 'Save Key'
                    )}
                  </button>

                  {isEditing && (
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="min-h-[48px] px-6 py-3 bg-gray-200 text-gray-700 font-medium
                                 rounded-xl hover:bg-gray-300 transition-colors touch-manipulation
                                 flex items-center justify-center disabled:opacity-50"
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
                  <li>• Your API keys are encrypted with AES-256-GCM and stored server-side in secure sessions</li>
                  <li>• Keys are automatically cleared when your session expires (1 hour)</li>
                  <li>• API keys never exist on the client-side - maximum security against XSS/extensions</li>
                  <li>• Server-side encryption with cryptographically secure session management</li>
                  <li>• Session tokens are HTTP-only cookies protected from JavaScript access</li>
                  <li>• Keys are stored in server memory only - no persistent disk storage</li>
                  <li>• Translations use your session-stored keys without exposing them to the client</li>
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