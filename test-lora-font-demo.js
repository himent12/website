// Demo script to test the new Lora font and tan background in Reading Mode
// Run this in the browser console to add sample data and test the new design

console.log('🎨 Testing Lora Font & Tan Background in Reading Mode');
console.log('===================================================');

const addSampleForReadingMode = () => {
  console.log('\n📝 Adding sample translation for Reading Mode testing...');
  
  const sampleTranslation = {
    id: Date.now().toString(),
    chineseText: '人工智能技术正在快速发展，改变着我们的生活方式。从智能手机到自动驾驶汽车，AI技术无处不在。在教育领域，AI可以个性化学习体验，帮助学生更好地理解复杂概念。在医疗保健方面，AI辅助诊断正在提高疾病检测的准确性。\n\n然而，随着AI技术的发展，我们也面临着新的挑战。隐私保护、就业影响和伦理问题都需要我们认真考虑。如何确保AI技术的发展能够造福全人类，而不是加剧社会不平等，这是我们必须面对的重要问题。\n\n未来，人工智能将继续塑造我们的世界。通过合理的规划和负责任的开发，我们可以利用AI技术创造一个更加美好的未来。教育、医疗、交通、环境保护等各个领域都将受益于AI技术的进步。',
    englishText: 'Artificial intelligence technology is rapidly developing, changing our way of life. From smartphones to autonomous vehicles, AI technology is everywhere. In the field of education, AI can personalize learning experiences and help students better understand complex concepts. In healthcare, AI-assisted diagnosis is improving the accuracy of disease detection.\n\nHowever, as AI technology develops, we also face new challenges. Privacy protection, employment impacts, and ethical issues all require our serious consideration. How to ensure that the development of AI technology benefits all humanity, rather than exacerbating social inequality, is an important issue we must face.\n\nIn the future, artificial intelligence will continue to shape our world. Through proper planning and responsible development, we can use AI technology to create a better future. Various fields such as education, healthcare, transportation, and environmental protection will all benefit from advances in AI technology.',
    timestamp: new Date().toISOString(),
    wordCount: 142,
    characterCount: { chinese: 234, english: 789 }
  };

  try {
    // Get existing history
    const existingHistory = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    
    // Add new sample to beginning
    const updatedHistory = [sampleTranslation, ...existingHistory];
    
    // Save to localStorage
    localStorage.setItem('translationHistory', JSON.stringify(updatedHistory));
    
    console.log('✅ Sample translation added successfully!');
    console.log('📖 This sample includes multiple paragraphs to test the Lora font rendering');
    console.log('🎨 Perfect for testing the new tan background and font combination');
    
    return sampleTranslation;
  } catch (error) {
    console.error('❌ Error adding sample translation:', error);
    return null;
  }
};

const testFontLoading = () => {
  console.log('\n🔤 Testing Lora font loading...');
  
  // Check if Lora font is available
  const testElement = document.createElement('div');
  testElement.style.fontFamily = 'Lora, serif';
  testElement.style.position = 'absolute';
  testElement.style.visibility = 'hidden';
  testElement.textContent = 'Test';
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const fontFamily = computedStyle.fontFamily;
  
  document.body.removeChild(testElement);
  
  if (fontFamily.includes('Lora')) {
    console.log('✅ Lora font is loaded and available');
    console.log(`   Font family: ${fontFamily}`);
  } else {
    console.log('⚠️ Lora font may not be loaded yet');
    console.log(`   Current font family: ${fontFamily}`);
    console.log('   Font may still be loading - try again in a moment');
  }
};

const testTanColors = () => {
  console.log('\n🎨 Testing tan color scheme...');
  
  // Check if tan colors are available in Tailwind
  const testDiv = document.createElement('div');
  testDiv.className = 'bg-tan-100';
  document.body.appendChild(testDiv);
  
  const computedStyle = window.getComputedStyle(testDiv);
  const backgroundColor = computedStyle.backgroundColor;
  
  document.body.removeChild(testDiv);
  
  if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
    console.log('✅ Tan color scheme is working');
    console.log(`   tan-100 background color: ${backgroundColor}`);
  } else {
    console.log('⚠️ Tan colors may not be compiled yet');
    console.log('   Try refreshing the page if you just added the colors');
  }
};

const showReadingModeInstructions = () => {
  console.log('\n📖 How to Test Reading Mode with New Design:');
  console.log('==========================================');
  console.log('1. 📚 Switch to the "Documents" tab');
  console.log('2. 🔍 Look for the sample translation that was just added');
  console.log('3. 📖 Click the green "Read" button on the sample document');
  console.log('4. 🎨 Observe the new design features:');
  console.log('   • Light tan/cream background color');
  console.log('   • Lora serif font for the reading content');
  console.log('   • Improved readability and elegance');
  console.log('5. 🔧 Test the controls:');
  console.log('   • Font size adjustment (Small, Medium, Large, Extra Large)');
  console.log('   • Dark/Light mode toggle');
  console.log('   • Scroll progress indicator');
  console.log('   • Navigation controls');
  console.log('');
  console.log('🎯 What to Look For:');
  console.log('• Lora font should be elegant and readable');
  console.log('• Tan background should be warm and comfortable');
  console.log('• Good contrast between text and background');
  console.log('• Smooth transitions between light and dark modes');
};

const runFullTest = () => {
  console.log('🚀 Running Full Lora Font & Tan Background Test...\n');
  
  // Add sample data
  const sample = addSampleForReadingMode();
  
  // Test font loading
  testFontLoading();
  
  // Test color scheme
  testTanColors();
  
  // Show instructions
  showReadingModeInstructions();
  
  console.log('\n🎉 Test Setup Complete!');
  console.log('📱 Now switch to the Documents tab and click "Read" to see the new design');
  
  return sample;
};

// Make functions available globally
window.addSampleForReadingMode = addSampleForReadingMode;
window.testFontLoading = testFontLoading;
window.testTanColors = testTanColors;
window.showReadingModeInstructions = showReadingModeInstructions;
window.runFullTest = runFullTest;

// Show available commands
console.log('\n💡 Available Commands:');
console.log('- runFullTest() - Complete test setup and instructions');
console.log('- addSampleForReadingMode() - Add sample text for testing');
console.log('- testFontLoading() - Check if Lora font is loaded');
console.log('- testTanColors() - Check if tan colors are working');
console.log('- showReadingModeInstructions() - Show testing instructions');
console.log('\n🎯 Run runFullTest() to get started!');
