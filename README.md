# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file in the root directory and add your API keys:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   VITE_XAI_API_KEY=your_actual_xai_api_key_here
   AZURE_OPENAI_API_KEY=your_actual_azure_openai_api_key_here
   AZURE_OPENAI_ENDPOINT=your_azure_endpoint_here
   ```
3. Run the app:
   `npm run dev`

## Environment Variables

- `GEMINI_API_KEY` - Required for Gemini AI functionality
- `VITE_XAI_API_KEY` - Optional, for Grok/XAI functionality
- `AZURE_OPENAI_API_KEY` - Optional, for Azure OpenAI functionality
- `AZURE_OPENAI_ENDPOINT` - Optional, your Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT` - Optional, defaults to 'o3-mini'
- `AZURE_OPENAI_API_VERSION` - Optional, defaults to '2024-10-01-preview'
