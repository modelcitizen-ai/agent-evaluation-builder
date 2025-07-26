import { NextRequest } from 'next/server';
import { generateObject } from "ai";
import { z } from "zod";
import { azure } from "@/lib/azure-openai";

// Schema for evaluation summary
const summarySchema = z.object({
  overallInsights: z.string().describe("Overall insights and patterns discovered from the reviews"),
  criteriaBreakdown: z.array(
    z.object({
      criterionName: z.string(),
      averageScore: z.number().optional(),
      keyPatterns: z.string(),
      improvementSuggestions: z.string(),
    })
  ),
  dataQualityIssues: z.array(z.string()).describe("Any data quality issues identified from reviewer feedback"),
  recommendedActions: z.array(z.string()).describe("Recommended actions based on the evaluation results"),
});

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, reviewerFeedback, evaluationCriteria } = await request.json();
    
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
    
    // Validate input
    if (!evaluationId) {
      throw new Error("Invalid evaluationId: must be provided");
    }
    
    if (!reviewerFeedback || !Array.isArray(reviewerFeedback) || reviewerFeedback.length === 0) {
      throw new Error("Invalid reviewerFeedback: must be a non-empty array");
    }
    
    if (!evaluationCriteria || !Array.isArray(evaluationCriteria)) {
      throw new Error("Invalid evaluationCriteria: must be an array");
    }
    
    // // // // // // // // // console.log removed for production
    
    const result = await generateObject({
      model: azure(""), // Empty string since the deployment is already in the baseURL
      schema: summarySchema,
      prompt: `
        You are an expert in analyzing human evaluation data.
        
        I have collected feedback from reviewers for evaluation ID: ${evaluationId}
        
        The evaluation criteria were:
        ${JSON.stringify(evaluationCriteria, null, 2)}
        
        The reviewer feedback is:
        ${JSON.stringify(reviewerFeedback, null, 2)}
        
        Please analyze this feedback and provide a comprehensive summary that includes:
        1. Overall insights and patterns
        2. Breakdown by criteria
        3. Any data quality issues identified
        4. Recommended actions based on the evaluation results
      `,
    });
    
    return Response.json({ summary: result });
  } catch (error: any) {
    console.error("Error in summarize-evaluation route:", error);
    return Response.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
