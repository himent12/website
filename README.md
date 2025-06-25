# Chinese-to-English Translation Web Application

A modern, full-stack web application for translating Simplified Chinese text to English using AI-powered translation services.

## 🌟 Features

- **🎯 Tabbed Interface**: Organized workflow with Translation and Documents tabs
- **Beautiful, Modern UI**: Clean interface built with React and Tailwind CSS
- **Real-time Translation**: Powered by DeepSeek AI for high-quality translations
- **📖 Reading Mode**: Distraction-free reading interface for translated content
- **📚 Document Management**: History and management of translated documents
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Chinese Font Support**: Proper rendering of Chinese characters
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Copy Functionality**: Easy copying of translated text
- **Character Counting**: Real-time character count for both input and output
- **Loading States**: Visual feedback during translation process

### 🎯 Tabbed Interface
- **Translation Tab**: Main translation interface with Chinese-to-English conversion
- **Documents Tab**: Manage and access previously translated documents
- **Seamless Navigation**: Switch between tabs without losing work
- **Persistent State**: Tab preferences and content preserved during session

### 📚 Document Management Features
- **Translation History**: Automatic saving of all successful translations
- **Document Search**: Find documents by Chinese or English content
- **Quick Access**: Re-open any document directly in Reading Mode
- **Document Information**: Titles, timestamps, character/word counts
- **Bulk Operations**: Clear all history or delete individual documents
- **Local Storage**: Documents saved in browser for privacy

### 📖 Reading Mode Features
- **Clean Reading Layout**: Optimized for long-form content consumption
- **Adjustable Font Sizes**: Small, Medium, Large, Extra Large options
- **Dark/Light Mode Toggle**: Comfortable reading in any lighting
- **Reading Progress Tracking**: Visual progress bar and percentage indicator
- **Navigation Controls**: Scroll to top, back to translator
- **Document Information**: Paragraph count and estimated reading time
- **Responsive Reading**: Optimized for all screen sizes

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- DeepSeek API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   PORT=5000
   ```

4. **Start the application**

   **Option 1: Run both frontend and backend together**
   ```bash
   npm run dev
   ```

   **Option 2: Run separately**
   ```bash
   # Terminal 1 - Backend API
   npm run server

   # Terminal 2 - Frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000 (or next available port)
   - Backend API: http://localhost:5000

## 🎭 User Workflow

### Complete Translation + Document Management + Reading Workflow

#### Translation Tab
1. **Input Phase**: Paste Chinese text into the translation interface
2. **Translation Phase**: Click "翻译 Translate" to get English translation
3. **Auto-Save**: Translation automatically saved to Documents tab
4. **Reading Mode**: Click green "Reading Mode" button for distraction-free reading

#### Documents Tab
1. **Browse History**: View all previously translated documents
2. **Search Documents**: Find specific translations using search functionality
3. **Quick Access**: Click "Read" to open any document in Reading Mode
4. **Manage Documents**: Delete individual documents or clear all history

#### Reading Mode (from either tab)
1. **Immersive Reading**: Enjoy clean, distraction-free reading experience
2. **Customize Experience**: Adjust font size, toggle dark/light mode
3. **Track Progress**: Monitor reading progress with visual indicators
4. **Easy Navigation**: Return to main interface or scroll controls

## 📁 Project Structure

```
website/
├── public/                 # Static files
├── src/
│   ├── components/
│   │   └── TextTranslator.jsx  # Main translation component
│   ├── App.js             # Root component
│   ├── index.js           # React entry point
│   └── index.css          # Global styles with Tailwind
├── server/
│   └── index.js           # Express backend server
├── .env                   # Environment variables (create this)
├── package.json           # Dependencies and scripts
└── tailwind.config.js     # Tailwind CSS configuration
```

## 🔧 API Endpoints

### POST `/api/translate`
Translates Chinese text to English.

**Request:**
```json
{
  "text": "你好，世界！",
  "from": "zh",
  "to": "en"
}
```

**Response:**
```json
{
  "translatedText": "Hello, world!",
  "sourceLanguage": "zh",
  "targetLanguage": "en",
  "originalLength": 6,
  "translatedLength": 13
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-24T22:38:32.489Z",
  "uptime": 19.6043152,
  "environment": "development"
}
```

## 🛠️ Available Scripts

- `npm start` - Start the React frontend
- `npm run server` - Start the Express backend
- `npm run dev` - Start both frontend and backend concurrently
- `npm run build` - Build the React app for production
- `npm test` - Run tests

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key | Yes |
| `PORT` | Backend server port (default: 5000) | No |

## 🎨 Technology Stack

**Frontend:**
- React 19
- Tailwind CSS
- Modern JavaScript (ES6+)

**Backend:**
- Node.js
- Express.js
- OpenAI SDK (for DeepSeek API)
- dotenv for environment management

**AI Service:**
- DeepSeek API for translation

## 🔍 Testing

Test the API directly:
```bash
node test-api.js
```

Or use curl:
```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，世界！","from":"zh","to":"en"}'
```

## 🚨 Error Handling

The application includes comprehensive error handling for:
- Invalid input validation
- API rate limiting
- Network timeouts
- Authentication errors
- Service unavailability

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
