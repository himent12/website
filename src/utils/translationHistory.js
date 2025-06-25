// Utility functions for managing translation history in localStorage

export const saveTranslation = (chineseText, englishText) => {
  try {
    // Get existing history
    const existingHistory = getTranslationHistory();
    
    // Create new document
    const newDocument = {
      id: Date.now().toString(), // Simple ID generation
      chineseText: chineseText.trim(),
      englishText: englishText.trim(),
      timestamp: new Date().toISOString(),
      wordCount: englishText.split(' ').length,
      characterCount: {
        chinese: chineseText.length,
        english: englishText.length
      }
    };
    
    // Add to beginning of array (most recent first)
    const updatedHistory = [newDocument, ...existingHistory];
    
    // Limit to last 50 translations to prevent localStorage bloat
    const limitedHistory = updatedHistory.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem('translationHistory', JSON.stringify(limitedHistory));
    
    return newDocument;
  } catch (error) {
    console.error('Error saving translation:', error);
    return null;
  }
};

export const getTranslationHistory = () => {
  try {
    const history = localStorage.getItem('translationHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error loading translation history:', error);
    return [];
  }
};

export const deleteTranslation = (documentId) => {
  try {
    const history = getTranslationHistory();
    const updatedHistory = history.filter(doc => doc.id !== documentId);
    localStorage.setItem('translationHistory', JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error deleting translation:', error);
    return false;
  }
};

export const clearAllTranslations = () => {
  try {
    localStorage.removeItem('translationHistory');
    return true;
  } catch (error) {
    console.error('Error clearing translation history:', error);
    return false;
  }
};

export const getTranslationById = (documentId) => {
  try {
    const history = getTranslationHistory();
    return history.find(doc => doc.id === documentId) || null;
  } catch (error) {
    console.error('Error finding translation:', error);
    return null;
  }
};

// Get statistics about translation history
export const getTranslationStats = () => {
  try {
    const history = getTranslationHistory();
    
    if (history.length === 0) {
      return {
        totalDocuments: 0,
        totalWords: 0,
        totalCharacters: { chinese: 0, english: 0 },
        averageWordsPerDocument: 0,
        oldestDocument: null,
        newestDocument: null
      };
    }
    
    const totalWords = history.reduce((sum, doc) => sum + doc.wordCount, 0);
    const totalChineseChars = history.reduce((sum, doc) => sum + doc.characterCount.chinese, 0);
    const totalEnglishChars = history.reduce((sum, doc) => sum + doc.characterCount.english, 0);
    
    // Sort by timestamp to find oldest and newest
    const sortedByDate = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return {
      totalDocuments: history.length,
      totalWords,
      totalCharacters: {
        chinese: totalChineseChars,
        english: totalEnglishChars
      },
      averageWordsPerDocument: Math.round(totalWords / history.length),
      oldestDocument: sortedByDate[0],
      newestDocument: sortedByDate[sortedByDate.length - 1]
    };
  } catch (error) {
    console.error('Error calculating translation stats:', error);
    return null;
  }
};
