// Test O3 API connection independently
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  endpoint: process.env.VITE_AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.VITE_AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
  deploymentName: process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'o3',
  apiVersion: process.env.VITE_AZURE_OPENAI_API_VERSION || '2025-04-01-preview'
};

console.log('🔧 O3 API Test Configuration:', {
  endpoint: config.endpoint,
  deployment: config.deploymentName,
  apiVersion: config.apiVersion,
  hasApiKey: !!config.apiKey
});

async function testO3Connection() {
  // First try standard chat completion endpoint
  console.log('\n🔍 Testing standard chat completion endpoint...');
  await testChatCompletion();
}

async function testChatCompletion() {
  const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
  
  const requestBody = {
    messages: [{
      role: "user",
      content: "What is 2+2? Provide a simple, direct answer."
    }],
    max_tokens: 100,
    temperature: 0
  };
  
  console.log('URL:', url);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response:', JSON.stringify(data.choices?.[0]?.message || data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ Error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
  
  const duration = Date.now() - startTime;
  console.log(`⏱️ Request duration: ${duration}ms`);
}

// Run the test
testO3Connection();