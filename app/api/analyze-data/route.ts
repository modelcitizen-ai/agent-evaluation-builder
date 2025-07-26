// The fallback analysis logic is now imported from /lib/analysis/fallback.ts
// This is the single source of truth for all naming, fallback, and criteria logic.
// Do not duplicate this logic elsewhere. Only update in the module.

import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { azure } from "@/lib/azure-openai"
import { intelligentSample, SamplingOptions, SampleMetadata } from "@/lib/utils/intelligent-sampling"
import { generateFallbackAnalysis } from "@/lib/analysis/fallback"

// Function to calculate confidence
function calculateConfidence(columnName: string, sampleValues: any[]): number {
  // Simple confidence calculation based on column name length
  return columnName.length > 10 ? 90 : 70
}

// Schema for AI analysis response (consolidated to include criteria)
const analysisSchema = z.object({
  evaluationName: z.string().describe("A descriptive name for this evaluation based on the content domain"),
  instructions: z.string().describe("Clear instructions for human evaluators that refer to evaluating 'content', 'items', or 'examples' rather than 'rows' or 'data entries'"),
  columnAnalysis: z.array(
    z.object({
      columnName: z.string(),
      suggestedRole: z.enum(["Input Data", "Model Output", "Excluded Data", "Metadata", "Segment"]),
      confidence: z.number().min(0).max(100),
      reasoning: z.string(),
    }),
  ),
  suggestedMetrics: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["yes-no", "likert-scale", "custom-list", "text-input"]),
      options: z.array(z.string()),
      reasoning: z.string(),
      confidence: z.number().min(0).max(100),
      required: z.boolean(),
      likertLabels: z
        .object({
          low: z.string(),
          high: z.string(),
        })
        .optional(),
    }),
  ),
  // Additional criteria field for backward compatibility
  suggestedCriteria: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      type: z.enum(["yes-no", "likert-scale", "custom-list", "text-input"]),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
      likertLabels: z.object({
        low: z.string(),
        high: z.string(),
      }).optional(),
    })
  ).optional(),
})

/**
 * Naming and fallback logic single source of truth:
 * - All naming, cleaning, and fallback logic is here in the API.
 * - The API always returns a clean, ready-to-display evaluationName (from AI or heuristic fallback).
 * - The UI and frontend hooks must NOT generate, clean, or fallback the evaluation name.
 * - Fallback hierarchy:
 *    1. If AI is enabled and succeeds, use its result.
 *    2. If AI fails or is disabled, use the smart heuristic fallback.
 *    3. If both fail, return a hardcoded "Content Quality".
 */

export async function POST(request: NextRequest) {
  let data: any[] = [], columns: string[] = [], samplingMetadata: SampleMetadata | undefined;

  try {
    const body = await request.json();
    data = body.data;
    columns = body.columns;
    samplingMetadata = body.samplingMetadata; // Optional sampling metadata from hook
    const useFallbackFromUI = body.useFallback === true;

    // Log the raw value of report_text after parsing
    console.log("RAW report_text value (first row):", data?.[0]?.report_text);

    // Always use smart heuristic fallback as the default
    let fallbackResult = generateFallbackAnalysis(data || [], columns || [], samplingMetadata);
    // Use the sampled data from fallbackResult.samplingMetadata if available, else from data
    const sampledData: any[] = (samplingMetadata && Array.isArray(data)) ? data : data;

    // If AI is enabled and not explicitly bypassed, try AI analysis
    let aiResult: any = null;
    let aiSuccess = false;
    if (!useFallbackFromUI && process.env.USE_FALLBACK_ANALYSIS !== 'true') {
      try {
        // Try AI analysis
        aiResult = await generateObject({
          model: azure(""), // Empty string since the deployment is already in the baseURL
          schema: analysisSchema,
          prompt: `Analyze this dataset for human evaluation setup using intelligently sampled data:\n\nDataset Structure:\n${JSON.stringify({
            columns: columns,
            sampleRows: sampledData,
            totalRows: data.length,
            samplingInfo: fallbackResult.samplingMetadata || {},
            columnTypes: columns.map((col: string) => {
              const sampleValues = sampledData.map((row: any) => row[col]).filter((val: any) => val != null && val !== "");
              return {
                name: col,
                sampleValues: sampleValues.slice(0, 3),
                uniqueCount: new Set(sampleValues).size,
                hasLongText: sampleValues.some((val: any) => String(val).length > 50),
                isNumeric: sampleValues.every((val: any) => !isNaN(Number(val)) && String(val).trim() !== ""),
                avgLength: sampleValues.length > 0 ? sampleValues.reduce((sum: number, val: any) => sum + String(val).length, 0) / sampleValues.length : 0,
              };
            }),
          }, null, 2)}\n\nSAMPLING CONTEXT:\n- Sampling Strategy: ${fallbackResult.samplingMetadata?.strategy}\n- Diversity Score: ${fallbackResult.samplingMetadata?.diversityScore?.toFixed(2)} (0-1, higher is more diverse)\n- Completeness Score: ${fallbackResult.samplingMetadata?.completenessScore?.toFixed(2)} (0-1, higher is more complete)\n- Content Patterns Detected: ${(fallbackResult.samplingMetadata?.contentPatterns || []).join(', ') || 'none'}\n- Total Dataset Size: ${data.length} rows\n- Selected Sample: ${sampledData.length} rows\n\nThe provided sample was intelligently selected to be representative of the full dataset's diversity and content patterns. Use this context to make more accurate role assignments and generate appropriate evaluation criteria.\n\nPlease analyze this intelligently sampled data and provide:\n\n1. **Evaluation Name**: Generate a concise, descriptive name for this evaluation based on what is actually being evaluated in the data. IMPORTANT: Do NOT use the words "Review", "Evaluation", "Assessment", "Analysis", "Human Evaluation", or "Evaluation of" in the name, as these will be added by the UI. Focus on the actual content/domain being evaluated, not assumptions about whether it's AI-generated.\n\nUse the content patterns detected in sampling: ${fallbackResult.samplingMetadata?.contentPatterns.join(', ') || 'standard content'} to inform the domain analysis.\n\nAnalyze the column names and sample data to determine the actual domain and content type:\n- If evaluating customer support interactions: "Customer Support Quality", "Support Response Effectiveness"\n- If evaluating educational content: "Learning Content Quality", "Educational Material Effectiveness" \n- If evaluating product descriptions: "Product Description Quality", "Marketing Copy Effectiveness"\n- If evaluating medical advice: "Medical Response Accuracy", "Clinical Guidance Quality"\n- If evaluating legal documents: "Legal Document Clarity", "Contract Language Quality"\n- If evaluating AI outputs: "AI Response Quality", "Model Output Accuracy"\n- If evaluating human-written content: Use domain-specific terms, not "AI" or "Model"\n- If content patterns include 'urls' or 'media': "Media Content Quality", "Visual Content Analysis"\n- If content patterns include 'long-text': "Text Content Quality", "Document Quality"\n- If content patterns include 'structured': "Structured Data Quality", "Format Compliance"\n\nBase the name on ACTUAL CONTENT patterns detected in the intelligent sample, not assumptions about who wrote it.\n\n2. **Column Analysis**: For each column, determine if it should be:\n   - "Input Data": Context, prompts, questions, or information that provides the basis for what's being evaluated\n   - "Model Output": The primary content to be evaluated (could be AI responses, human-written content, expert advice, etc.)\n   - "Excluded Data": Data that should not be used in the evaluation (PII, irrelevant information, etc.)\n   - "Metadata": Additional context information (IDs, timestamps, categories, etc.)\n   - "Segment": Columns used for organizing data into groups or segments (for research purposes only, should not be mentioned in instructions)\n\nUse the sampling diversity score (${fallbackResult.samplingMetadata?.diversityScore.toFixed(2)}) to adjust confidence:\n- High diversity (>0.7): Increase confidence by 10%\n- Moderate diversity (0.4-0.7): Standard confidence\n- Low diversity (<0.4): Decrease confidence by 5%\n\n3. **Instructions**: Generate clear, concise instructions for human evaluators based on the detected content patterns. Use straightforward language like "Evaluate each item..." rather than verbose phrases like "You will evaluate...". Refer to evaluating "content" or "items" rather than "dataset rows" or "data entries". \n\nTailor instructions to the content patterns:\n${fallbackResult.samplingMetadata?.contentPatterns.map(pattern => {
  switch(pattern) {
    case 'urls': return '- For URL/media content: Focus on link validity, content relevance, and appropriateness';
    case 'long-text': return '- For text content: Focus on clarity, coherence, and completeness';
    case 'structured': return '- For structured content: Focus on format compliance and data accuracy';
    case 'categorical': return '- For categorical content: Focus on categorization accuracy and consistency';
    case 'numerical': return '- For numerical content: Focus on accuracy and reasonableness';
    default: return `- For ${pattern} content: Focus on quality and appropriateness`;
  }
}).join('\n') || '- Focus on overall content quality and appropriateness'}\n\nKeep instructions brief and focused only on what's needed for the specific evaluation criteria. IMPORTANT: Do not reference or mention segment columns, groups, categories, or any segmentation information in the instructions.\n\n4. **Evaluation Metrics and Criteria**: Suggest exactly 3 evaluation criteria with these specific types in this order:\n   - First metric: LIKERT SCALE (5-point scale) - for overall quality assessment (REQUIRED)\n   - Second metric: YES/NO - The NAME field MUST be formatted as a clear question that can be answered with Yes/No (REQUIRED)\n   - Third metric: TEXT INPUT - for open-ended feedback and comments (OPTIONAL - set required: false)\n\nCustomize criteria based on content patterns:\n${fallbackResult.samplingMetadata?.contentPatterns.map(pattern => {
  switch(pattern) {
    case 'urls': return '- Include criteria for link functionality and content appropriateness';
    case 'long-text': return '- Include criteria for text clarity and completeness';
    case 'structured': return '- Include criteria for structural accuracy and format compliance';
    case 'categorical': return '- Include criteria for categorization accuracy';
    case 'numerical': return '- Include criteria for numerical accuracy and reasonableness';
    default: return `- Include criteria relevant to ${pattern} content`;
  }
}).join('\n') || '- Include standard quality and relevance criteria'}\n\n   Focus on criteria that assess:\n   - Quality of the content/responses to be evaluated\n   - Accuracy and appropriateness for the domain (informed by sampling patterns)\n   - Specific aspects relevant to the detected content patterns\n   - Open-ended feedback opportunity\n\n   Make each criterion contextual to the specific content domain and detected patterns while maintaining the required type structure.\n\n   IMPORTANT: Populate BOTH suggestedMetrics (for current system) AND suggestedCriteria (for backward compatibility) with the same 3 criteria. The suggestedCriteria should include a 'description' field explaining what each criterion measures.\n\nGuidelines:\n- Prioritize columns with content to be evaluated (responses, outputs, content, recommendations, etc.) as "Model Output"\n- Prioritize columns with context or inputs (user questions, prompts, scenarios, etc.) as "Input Data"\n- Mark columns containing PII or sensitive information as Excluded Data\n- Identify columns used for grouping, segmentation, or categorization as "Segment"\n- Consider IDs, timestamps, and categorical metadata as Metadata\n- Use the intelligent sampling insights to improve role detection accuracy\n- Suggest evaluation metrics that align with detected content patterns\n- Provide confidence scores adjusted for sampling quality (diversity score: ${fallbackResult.samplingMetadata?.diversityScore.toFixed(2)})\n- Give detailed reasoning for each decision, incorporating sampling insights\n- Generate domain-appropriate evaluation names and instructions based on actual content patterns\n- Leverage the representative nature of the intelligent sample for more accurate analysis\n\nBe thorough and provide actionable insights for setting up an effective human evaluation workflow that takes advantage of the intelligent sampling analysis performed on this dataset.`,
        })
        if (aiResult && aiResult.object && aiResult.object.evaluationName && typeof aiResult.object.evaluationName === 'string' && aiResult.object.evaluationName.trim().length > 0) {
          aiSuccess = true;
        }
      } catch (aiError) {
        console.error("❌ Azure OpenAI analysis failed:", aiError);
        aiResult = null;
      }
    }

    // Return AI result if successful, else fallback, else emergency fallback
    if (aiSuccess) {
      return NextResponse.json({
        success: true,
        samplingMetadata: fallbackResult.samplingMetadata, // Include sampling information in response
        ...aiResult.object,
      });
    } else if (fallbackResult && fallbackResult.evaluationName && typeof fallbackResult.evaluationName === 'string' && fallbackResult.evaluationName.trim().length > 0) {
      return NextResponse.json({
        success: false,
        error: aiResult ? 'AI returned invalid evaluationName' : 'AI analysis failed',
        ...fallbackResult,
      });
    } else {
      // Emergency fallback: use fallback analysis logic to generate instructions
      const emergencyFallback = generateFallbackAnalysis(data || [], columns || [], samplingMetadata);
      return NextResponse.json({
        success: false,
        error: 'Both AI and heuristic fallback failed',
        ...emergencyFallback,
        // Defensive: if fallback ever returns null, provide empty objects for required fields
        columnAnalysis: emergencyFallback.columnAnalysis || [],
        suggestedMetrics: emergencyFallback.suggestedMetrics || [],
        suggestedCriteria: emergencyFallback.suggestedCriteria || [],
        samplingMetadata: emergencyFallback.samplingMetadata || null
      });
    }
  } catch (error) {
    console.error("❌ API analysis failed:", error);
    // Emergency fallback: use fallback analysis logic to generate instructions
    const emergencyFallback = generateFallbackAnalysis(data || [], columns || [], samplingMetadata);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      ...emergencyFallback,
      // Defensive: if fallback ever returns null, provide empty objects for required fields
      columnAnalysis: emergencyFallback.columnAnalysis || [],
      suggestedMetrics: emergencyFallback.suggestedMetrics || [],
      suggestedCriteria: emergencyFallback.suggestedCriteria || [],
      samplingMetadata: emergencyFallback.samplingMetadata || null
    });
  }
}