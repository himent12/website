import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReaderDemo from './ReaderDemo';
import { useMobile } from '../contexts/MobileContext';
import { GestureHandler, TouchUtils, PerformanceUtils } from '../utils/mobileUtils';

const Documents = () => {
  const navigate = useNavigate();
  const mobile = useMobile();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mobile-specific state
  const [mobileViewMode, setMobileViewMode] = useState('grid'); // grid, list, compact
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, alphabetical
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);

  // Refs for mobile optimization
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);
  const gestureHandlerRef = useRef(null);

  // Load documents from localStorage on component mount
  useEffect(() => {
    const savedDocuments = localStorage.getItem('translationHistory');
    if (savedDocuments) {
      try {
        const parsedDocuments = JSON.parse(savedDocuments);
        setDocuments(parsedDocuments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      }
    }
  }, []);

  // Generate document title from Chinese text (responsive length)
  const generateTitle = (chineseText, isMobile = false) => {
    if (!chineseText) return 'Untitled Document';
    const maxLength = isMobile ? 20 : 30;
    return chineseText.length > maxLength ? chineseText.substring(0, maxLength) + '...' : chineseText;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Delete a document
  const deleteDocument = (documentId) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    localStorage.setItem('translationHistory', JSON.stringify(updatedDocuments));
  };

  // Open document in Reading Mode
  const openInReadingMode = (document) => {
    navigate('/reading', {
      state: {
        translatedText: document.englishText,
        originalText: document.chineseText
      }
    });
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc =>
    doc.chineseText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.englishText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear all documents
  const clearAllDocuments = () => {
    if (window.confirm('Are you sure you want to delete all translation history? This action cannot be undone.')) {
      setDocuments([]);
      localStorage.removeItem('translationHistory');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Enhanced Mobile-First Header */}
      <div className="text-center mobile-container mobile-safe-top py-8 sm:py-12 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/20 via-purple-100/20 to-pink-100/20"></div>
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-indigo-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-purple-200/30 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-mobile-xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 leading-tight">
            <span className="hidden sm:inline">Translation Documents</span>
            <span className="sm:hidden">Documents</span>
          </h1>
          <p className="text-mobile-base sm:text-lg text-gray-600 mb-4">
            Manage and access your previously translated documents
          </p>
          <div className="w-20 sm:w-28 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full shadow-sm"></div>
        </div>
      </div>

      <div className="mobile-container max-w-6xl mx-auto -mt-4 relative z-10">
        {/* Enhanced Search and Actions Bar */}
        <div className="mb-8 animate-slideInUp">
          <div className="mobile-card p-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mobile-input w-full pl-12 pr-4 py-4 text-mobile-base"
                    style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  />
                </div>
              </div>

              {documents.length > 0 && (
                <button
                  onClick={clearAllDocuments}
                  className="min-h-[52px] px-6 py-3 text-red-600 border-2 border-red-300 rounded-xl
                             hover:bg-red-50 hover:border-red-400 transition-all duration-200 touch-manipulation
                             flex items-center justify-center font-semibold space-x-2 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reading Mode Demo */}
        <div className="mb-8 animate-slideInUp">
          <ReaderDemo />
        </div>

        {/* Enhanced Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16 animate-fadeIn">
            <div className="mobile-card p-12 max-w-md mx-auto">
              {documents.length === 0 ? (
                <div>
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-mobile-lg font-bold text-gray-900 mb-3">No documents yet</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">Start translating to build your document library and access your translations anytime</p>
                  <div className="inline-flex items-center space-x-2 text-sm text-indigo-600 font-medium">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse-slow"></div>
                    <span>Ready to translate</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-mobile-lg font-bold text-gray-900 mb-3">No documents found</h3>
                  <p className="text-gray-600 leading-relaxed">Try adjusting your search terms or clear the search to see all documents</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 animate-slideInUp">
            {filteredDocuments.map((document, index) => (
              <div
                key={document.id}
                className="mobile-card p-6 sm:p-8 hover:scale-[1.02] transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-mobile-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {generateTitle(document.chineseText, window.innerWidth < 640)}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatDate(document.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openInReadingMode(document)}
                      className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 touch-manipulation hover:scale-105 shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="hidden sm:inline">Read</span>
                    </button>
                    
                    <button
                      onClick={() => deleteDocument(document.id)}
                      className="min-h-[44px] w-11 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 touch-manipulation hover:scale-105"
                      title="Delete document"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Enhanced Chinese Text Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-7 h-7 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xs font-bold mr-3">
                        中
                      </div>
                      <span className="text-mobile-base font-semibold text-gray-700">Chinese</span>
                    </div>
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl border-l-4 border-red-400">
                      <p className="text-mobile-base text-gray-800 leading-relaxed line-clamp-3">
                        {document.chineseText.length > 150
                          ? document.chineseText.substring(0, 150) + '...'
                          : document.chineseText
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced English Text Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold mr-3">
                        EN
                      </div>
                      <span className="text-mobile-base font-semibold text-gray-700">English</span>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-400">
                      <p className="text-mobile-base text-gray-800 leading-relaxed line-clamp-3">
                        {document.englishText.length > 150
                          ? document.englishText.substring(0, 150) + '...'
                          : document.englishText
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Document Stats */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span>Chinese: {document.chineseText.length} chars</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>English: {document.englishText.length} chars</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>~{document.englishText.split(' ').length} words</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Enhanced Footer */}
        <div className="text-center mobile-safe-bottom pt-8 pb-6 animate-fadeIn">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse-slow"></div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} • Translation History
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
