import { NextRequest } from 'next/server';
import { getCompletion } from '@/lib/azure-openai';

/**
 * API route to test Azure OpenAI connectivity
 * Call this endpoint to verify that Azure OpenAI is working properly
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error("AZURE_OPENAI_API_KEY environment variable is not set");
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error("AZURE_OPENAI_ENDPOINT environment variable is not set");
    }
    if (!process.env.AZURE_OPENAI_DEPLOYMENT) {
      throw new Error("AZURE_OPENAI_DEPLOYMENT environment variable is not set");
    }
    
    // Test Azure OpenAI connection
    const response = await getCompletion('Test connection to Azure OpenAI. Respond with "Connection successful!"');
    
    return Response.json({ 
      status: 'success',
      message: 'Azure OpenAI connection is working correctly',
      response: response
    });
  } catch (error: any) {
    console.error("Error testing Azure OpenAI connection:", error);
    return Response.json({ 
      status: 'error',
      message: 'Failed to connect to Azure OpenAI',
      error: error.message || "An error occurred"
    }, { status: 500 });
  }
}
