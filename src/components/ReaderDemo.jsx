import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReaderDemo = () => {
  const navigate = useNavigate();

  const sampleTranslatedText = `This is a test document to showcase the new reading mode interface.

**This text should display as italic** because it is surrounded by two asterisks.

****This text should display as bold**** because it is surrounded by four asterisks.

In the ancient East, there was a beautiful legend. It is said that long, long ago, a kind fairy lived in the sky. Every day, she would look down from the clouds and observe people's lives.

When she saw that people could not communicate because they did not speak the same language, her heart was filled with compassion. So she decided to use her magic to help people break down language barriers.

The fairy gently waved her magic wand and sprinkled glittering stardust. This stardust fell to the earth and became a magical power that allowed people of different languages to understand each other.

From then on, people were able to cross the language divide and share each other's stories and wisdom. This is the origin of translation magic, which connects hearts around the world.

**The power of understanding** transcends all boundaries. When we can communicate across languages, we discover that despite our different words, our hearts beat with the same hopes and dreams.

****In every translation, there is a bridge**** - a bridge that connects not just words, but souls. The fairy's gift continues to work its magic today, helping us understand that we are all part of one human story.

The ancient texts speak of wisdom that flows like water, finding its way into every corner of the world. **Through translation, this wisdom becomes accessible to all**, regardless of the language they speak.

And so the story continues, with each translated word adding another thread to the tapestry of human understanding. ****The fairy's legacy lives on**** in every act of translation, every moment of cross-cultural connection.`;

  const handleEnterReadingMode = () => {
    navigate('/reading', {
      state: {
        translatedText: sampleTranslatedText,
        title: 'The Legend of Translation Magic'
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Enhanced Reader Demo
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Experience the sophisticated dual-mode reading interface with scroll and page modes,
          customizable themes, typography settings, bookmarks, and markdown formatting.
        </p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features Include:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Dual-mode reading (Scroll & Page)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Touch gestures & keyboard navigation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Day/Night/Sepia reading modes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Customizable font sizes & families</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Adjustable line height & width</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Seamless mode switching</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Progress tracking & bookmarks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Markdown formatting (** italic, **** bold)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Smooth animations & transitions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Mobile-responsive design</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleEnterReadingMode}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                     text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg 
                     transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
        >
          Enter Reading Mode
        </button>
        
        <p className="text-sm text-gray-500 mt-4">
          Click above to experience the enhanced reader with sample content
        </p>
      </div>
    </div>
  );
};

export default ReaderDemo;