// Azure OpenAI client setup
import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';

// Initialize Azure OpenAI client (to be used server-side only)
export const azure = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT || ''}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT || ''}`,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
});

// Helper function for chat completions
export async function getCompletion(prompt: string) {
  if (!process.env.AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI API key not configured');
  }

  const result = await generateText({
    model: azure(''),
    prompt: prompt,
    system: 'You are a helpful assistant specialized in evaluating datasets and providing analysis.',
  });

  return result.text;
}

// Function to analyze dataset
export async function analyzeDataset(dataset: any, prompt: string) {
  if (!process.env.AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI API key not configured');
  }

  try {
    const result = await generateText({
      model: azure(''),
      prompt: `Analyze the following dataset:\n${JSON.stringify(dataset)}\n\n${prompt}`,
      system: 'You are a helpful assistant specialized in evaluating datasets and providing analysis.',
    });

    return result.text;
  } catch (error) {
    console.error('Error analyzing dataset:', error);
    throw error;
  }
}

// Function to suggest evaluation criteria
export async function suggestEvaluationCriteria(datasetSample: any, evaluationContext: string) {
  if (!process.env.AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI API key not configured');
  }

  try {
    const result = await generateText({
      model: azure(''),
      prompt: `Based on this content sample:\n${JSON.stringify(datasetSample)}\n\nAnd this evaluation context:\n"${evaluationContext}"\n\nSuggest 3-5 evaluation criteria that human reviewers should use to evaluate content items through evaluation forms. Ensure the criteria names are conversational and inclusive, focusing on the quality and relevance of the content. For each criterion, provide a name, description, and scoring scale (e.g. 1-5).`,
      system: 'You are a helpful assistant specialized in creating evaluation criteria for human content review through evaluation forms.',
    });

    return result.text;
  } catch (error) {
    console.error('Error suggesting criteria:', error);
    throw error;
  }
}
