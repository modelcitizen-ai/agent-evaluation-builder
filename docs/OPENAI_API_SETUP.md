# Setting Up Azure OpenAI API Keys

This guide will help you set up your Azure OpenAI API keys for the Human Evaluation Builder application.

## Prerequisites

1. An Azure account with access to Azure OpenAI Service
2. An Azure OpenAI resource created in your Azure portal
3. A deployment of a model (like GPT-4 or GPT-3.5 Turbo) in your Azure OpenAI resource

## Configuration Steps

1. **Get your Azure OpenAI API Key**:
   - Go to your Azure OpenAI resource in the Azure portal
   - Navigate to "Keys and Endpoint" in the left sidebar
   - Copy one of the keys (either Key 1 or Key 2)

2. **Get your Azure OpenAI Endpoint**:
   - From the same "Keys and Endpoint" page
   - Copy the "Endpoint" URL (looks like `https://your-resource-name.openai.azure.com/`)

3. **Get your Deployment Name**:
   - Go to "Deployments" in your Azure OpenAI resource
   - Note the name of the deployment you want to use

4. **Update the `.env.local` file**:
   - Open the `.env.local` file in the root of this project
   - Replace the placeholder values with your actual values:

   ```
   AZURE_OPENAI_API_KEY=your_actual_api_key
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_VERSION=2023-05-15  # Or the latest version available
   AZURE_OPENAI_DEPLOYMENT_NAME=your_actual_deployment_name
   ```

5. **Restart the development server**:
   - If the server is running, stop it with Ctrl+C
   - Start it again with `npm run dev`

## Troubleshooting

If you encounter errors:

1. **Check your API key and endpoint**: Make sure they are correctly copied from the Azure portal.
2. **Verify your deployment name**: Ensure the deployment name exactly matches what's in your Azure OpenAI resource.
3. **Check API version**: Make sure the API version is supported.

## Fallback Mechanism

This application has a built-in fallback mechanism that will use heuristic analysis if the Azure OpenAI API is not available or encounters errors. This ensures the application works even when the API is not configured.

## Using OpenAI API Instead of Azure OpenAI

If you want to use the regular OpenAI API instead:

1. Get your API key from [OpenAI's platform](https://platform.openai.com/api-keys)
2. Update the `.env.local` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```
3. You'll need to modify the API endpoint code in `/app/api/analyze-data/route.ts` and `/app/api/suggest-criteria/route.ts` to use the OpenAI API instead of Azure OpenAI.

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your API keys secure and do not share them
- Consider using Azure Key Vault or similar services for production deployments
