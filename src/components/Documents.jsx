import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-Optimized Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="mr-2">📚</span>
            <span className="hidden sm:inline">Translation Documents</span>
            <span className="sm:hidden">Documents</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage and access your previously translated documents
          </p>
        </div>

        {/* Mobile-Optimized Search and Actions Bar */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 py-3 border border-gray-300 rounded-xl
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-base touch-manipulation"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
            </div>
          </div>

          {documents.length > 0 && (
            <button
              onClick={clearAllDocuments}
              className="min-h-[48px] px-4 py-3 text-red-600 border border-red-300 rounded-xl
                         hover:bg-red-50 transition-colors touch-manipulation
                         flex items-center justify-center font-medium"
            >
              <span className="hidden sm:inline">Clear All</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          {documents.length === 0 ? (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-4">Start translating to build your document library</p>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {generateTitle(document.chineseText)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(document.timestamp)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => openInReadingMode(document)}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Read
                  </button>
                  
                  <button
                    onClick={() => deleteDocument(document.id)}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete document"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chinese Text Preview */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                      中
                    </span>
                    <span className="text-sm font-medium text-gray-700">Chinese</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-red-500">
                    <p className="text-sm text-gray-800 font-chinese line-clamp-3">
                      {document.chineseText.length > 150 
                        ? document.chineseText.substring(0, 150) + '...'
                        : document.chineseText
                      }
                    </p>
                  </div>
                </div>
                
                {/* English Text Preview */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                      EN
                    </span>
                    <span className="text-sm font-medium text-gray-700">English</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                    <p className="text-sm text-gray-800 line-clamp-3">
                      {document.englishText.length > 150 
                        ? document.englishText.substring(0, 150) + '...'
                        : document.englishText
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Document Stats */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <span>Chinese: {document.chineseText.length} characters</span>
                  <span>English: {document.englishText.length} characters</span>
                  <span>Words: ~{document.englishText.split(' ').length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Documents;
