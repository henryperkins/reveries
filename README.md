# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file in the root directory and add your API keys:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   XAI_API_KEY=your_actual_xai_api_key_here
   AZURE_OPENAI_API_KEY=your_actual_azure_openai_api_key_here
   AZURE_OPENAI_ENDPOINT=your_azure_endpoint_here
   AZURE_OPENAI_DEPLOYMENT=o3-mini
   AZURE_OPENAI_API_VERSION=2024-10-01-preview
   ```
   **Note:** Do not put real API keys in the `.env` file - use `.env.local` instead to keep them private.
3. Run the app:
   `npm run dev`

## Environment Variables

- `GEMINI_API_KEY` - Required for Gemini AI functionality
- `XAI_API_KEY` - Optional, for Grok/XAI functionality (get a new key from https://console.x.ai/)
- `AZURE_OPENAI_API_KEY` - Optional, for Azure OpenAI functionality
- `AZURE_OPENAI_ENDPOINT` - Optional, your Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT` - Optional, defaults to 'o3-mini'
- `AZURE_OPENAI_API_VERSION` - Optional, defaults to '2024-10-01-preview'

## Security

- Always use `.env.local` for real API keys (this file is gitignored)
- Never commit actual API keys to version control
- The `.env` file contains only placeholder values for reference
- If you receive a "blocked API key" error, obtain a new key from the provider
