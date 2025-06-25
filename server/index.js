const { createApp } = require('./app');
const serverConfig = require('../lib/config/serverConfig');

// Create and start the server
const app = createApp();

app.listen(serverConfig.port, () => {
  console.log(`🚀 Translation API Server running on port ${serverConfig.port}`);
  console.log(`📡 Health check: http://localhost:${serverConfig.port}/api/health`);
  console.log(`🔧 API endpoint: http://localhost:${serverConfig.port}/api/translate`);
  console.log(`🔑 DeepSeek API configured: ${serverConfig.deepseekApiKey ? 'Yes' : 'No'}`);
  console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
});
