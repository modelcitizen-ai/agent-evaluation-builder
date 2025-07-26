import { NextRequest } from 'next/server';
import { generateObject } from "ai";
import { z } from "zod";
import { azure } from "@/lib/azure-openai";

// Schema for suggested criteria
const criteriaSchema = z.object({
  criteria: z.array(
    z.object({
      name: z.string().describe("A short, descriptive name for this evaluation criterion. For yes-no type, this MUST be formatted as a question (e.g., 'Does the response...?', 'Is the content...?')"),
      description: z.string().describe("A clear explanation of what this criterion measures and how to evaluate it"),
      type: z.enum(["yes-no", "likert-scale", "custom-list", "text-input"]).describe("The type of input for this criterion"),
      required: z.boolean().describe("Whether this criterion is required for evaluation"),
      options: z.array(z.string()).optional().describe("For custom-list type, the available options"),
      likertLabels: z.object({
        low: z.string().describe("Label for the lowest value on the scale"),
        high: z.string().describe("Label for the highest value on the scale"),
      }).optional().describe("For likert-scale type, the labels for low and high values"),
    })
  )
});

export async function POST(request: NextRequest) {
  try {
    const { datasetSample, taskDescription, useFallback: useFallbackFromUI } = await request.json();
    
    // Validate environment variables
    // Check if we should use fallback analysis (from environment or UI toggle)
    if (process.env.USE_FALLBACK_ANALYSIS === 'true' || useFallbackFromUI === true) {
      return Response.json({
        useFallback: true,
        message: useFallbackFromUI 
          ? "Azure OpenAI criteria suggestion skipped due to UI fallback toggle" 
          : "Azure OpenAI criteria suggestion skipped due to USE_FALLBACK_ANALYSIS flag"
      });
    }
    
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error("AZURE_OPENAI_API_KEY environment variable is not set");
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error("AZURE_OPENAI_ENDPOINT environment variable is not set");
    }
    if (!process.env.AZURE_OPENAI_DEPLOYMENT) {
      throw new Error("AZURE_OPENAI_DEPLOYMENT environment variable is not set");
    }
    
    // Validate input
    if (!datasetSample || !Array.isArray(datasetSample) || datasetSample.length === 0) {
      throw new Error("Invalid datasetSample: must be a non-empty array");
    }
    
    if (!taskDescription || typeof taskDescription !== 'string') {
      throw new Error("Invalid taskDescription: must be a non-empty string");
    }
    
    // // // // // // // // // console.log removed for production
    
    const result = await generateObject({
      model: azure(""), // Empty string since the deployment is already in the baseURL
      schema: criteriaSchema,
      prompt: `
        You are an expert in creating evaluation criteria for human reviewers to assess content through evaluation forms.
        
        I have content samples with the following structure: 
        ${JSON.stringify(datasetSample, null, 2)}
        
        Evaluation Context: "${taskDescription}"
        
        Please suggest exactly 3 evaluation criteria that human reviewers should use to evaluate the content items presented to them through evaluation forms.
        
        IMPORTANT: Generate exactly 3 criteria with these specific types in this order:
        1. One LIKERT SCALE criterion (5-point scale) - for overall quality assessment (REQUIRED)
        2. One YES/NO criterion - The NAME field MUST be formatted as a clear question that can be answered with Yes/No (e.g., "Does the response accurately address the user's question?", "Is the content factually correct?", "Are the recommendations appropriate?") (REQUIRED)
        3. One TEXT INPUT criterion - for open-ended feedback and comments (OPTIONAL - set required: false)
        
        Focus on criteria that assess:
        - Quality of content items
        - Relevance of content to its context
        - Accuracy and factual correctness
        - Appropriateness and helpfulness
        - Any domain-specific content quality measures
        
        Each criterion should be relevant to evaluating content quality and should cover different aspects of content assessment.
        For each criterion, provide a clear name, description, and appropriate input type.
        
        Make the criteria contextual to the specific content domain while maintaining the required type structure.
        Make sure the criteria are focused on what humans should evaluate about the content items presented to them through the evaluation form interface.
      `,
    });
    
    return Response.json({ criteria: result.object.criteria });
  } catch (error: any) {
    console.error("Error in suggest-criteria route:", error);
    return Response.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
