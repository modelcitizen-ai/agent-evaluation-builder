// The logic in this file is now the single source of truth for all dataset analysis naming, fallback, and criteria logic.
// Do not duplicate this logic elsewhere. Only update here and import where needed.

// Centralized fallback analysis generator for dataset analysis
// This is the single source of truth for all naming, fallback, and criteria logic.
// Only import and use this function from backend API routes or services.

import { intelligentSample, SampleMetadata } from "../utils/intelligent-sampling";

export function generateFallbackAnalysis(data: any[], columns: string[], samplingMetadata?: SampleMetadata) {
  // Use intelligent sampling for better fallback analysis
  const samplingResult = samplingMetadata
    ? { sampledData: data, metadata: samplingMetadata }
    : intelligentSample(data, columns, {
        maxSamples: 8,
        prioritizeCompleteness: true,
        enablePatternAnalysis: true
      });
  const { sampledData, metadata } = samplingResult;

  // Helper to detect if all values are numbers
  function isNumerical(values: any[]) {
    return values.every(v => v !== null && v !== undefined && !isNaN(Number(v)));
  }
  // Helper to detect if column is categorical (few unique values, short strings)
  function isCategorical(values: any[]) {
    const unique = Array.from(new Set(values.filter(v => v != null)));
    return unique.length > 1 && unique.length <= 10 && unique.every(v => String(v).length < 32);
  }
  // Helper to detect if column is likely an ID/reference
  function isIdColumn(col: string, values: any[]) {
    const colLower = col.toLowerCase();
    if (colLower === 'id' || colLower.endsWith('_id') || colLower.includes('uuid') || colLower.includes('ref') || colLower.includes('index')) return true;
    // Heuristic: all unique, short, alphanumeric
    const unique = Array.from(new Set(values.filter(v => v != null)));
    return unique.length === values.length && unique.length > 1 && unique.every(v => String(v).length < 36 && /^[\w-]+$/.test(String(v)));
  }

  // Expanded heuristics for Model Output detection
  const outputKeywords = [
    'output', 'response', 'answer', 'text', 'content', 'review', 'completion', 'essay', 'summary', 'explanation', 'generated', 'prediction', 'result', 'comment', 'description', 'body', 'report', 'transcript', 'message', 'reply', 'statement', 'paragraph', 'passage', 'article', 'story', 'feedback', 'reasoning', 'rationale', 'justification', 'claim', 'argument', 'recommendation', 'suggestion', 'advice', 'narrative', 'caption', 'headline', 'title', 'utterance', 'sentence', 'prompted', 'output1', 'output2', 'output_text', 'output_response', 'step'
  ];
  // Expanded heuristics for Input Data detection
  const inputKeywords: string[] = [
    'input', 'question', 'prompt', 'context', 'instruction', 'query', 'scenario', 'task', 'source', 'statement', 'request', 'topic', 'subject', 'goal', 'problem', 'case', 'situation', 'user', 'user_input', 'user_question', 'user_prompt', 'user_query', 'input1', 'input2', 'input_text', 'input_prompt', 'input_question', 'premise', 'hypothesis', 'background', 'reference', 'seed', 'start', 'initial', 'description', 'situation', 'setup', 'given', 'base', 'original', 'before', 'pre', 'pretext', 'pre_input', 'pre_question', 'pre_prompt', 'pre_context', 'pre_scenario', 'pre_task', 'pre_statement', 'pre_request', 'pre_topic', 'pre_subject', 'pre_goal', 'pre_problem', 'pre_case', 'pre_situation', 'pre_user', 'pre_user_input', 'pre_user_question', 'pre_user_prompt', 'pre_user_query', 'requirement'
  ];
  let inputAssigned = false;
  // Find the best candidate for Model Output if not already assigned
  let outputAssigned = false;
  const columnAnalysis = columns.map((col, idx) => {
    const sampleValues = sampledData.map((row) => row[col]);
    const colLower = col.toLowerCase();
    let confidence = 60;
    if (metadata.strategy === 'intelligent' && metadata.diversityScore > 0.6) confidence += 10;
    // ID/reference columns
    if (isIdColumn(col, sampleValues)) {
      return {
        columnName: col,
        suggestedRole: 'Metadata',
        confidence: Math.min(95, confidence + 25),
        reasoning: `Column "${col}" detected as ID/reference based on name and unique values`
      };
    }
    // Special case: Model/Source/Provider columns with short, categorical values should be Metadata
    const modelSourceKeywords = ['model', 'source', 'provider', 'author', 'system', 'engine'];
    const uniqueValues = Array.from(new Set(sampleValues.filter(v => v != null)));
    const allShort = uniqueValues.every(v => String(v).length < 32);
    if (modelSourceKeywords.some(kw => colLower.includes(kw)) && uniqueValues.length > 0 && uniqueValues.length <= 10 && allShort) {
      return {
        columnName: col,
        suggestedRole: 'Metadata',
        confidence: Math.min(95, confidence + 25),
        reasoning: `Column "${col}" classified as metadata because it matches model/source/provider pattern with short, categorical values`
      };
    }
    // Input columns (expanded)
    if (inputKeywords.some((keyword: string) => colLower.includes(keyword))) {
      inputAssigned = true;
      return {
        columnName: col,
        suggestedRole: 'Input Data',
        confidence: Math.min(95, confidence + 25),
        reasoning: `Column "${col}" suggests input data based on name and sample analysis`
      };
    }
    // Input by sample value: mostly questions or short unique text
    const questionLike = sampleValues.filter(v => typeof v === 'string' && v.trim().endsWith('?')).length / sampleValues.length > 0.5;
    const shortText = sampleValues.filter(v => typeof v === 'string' && v.length < 80).length / sampleValues.length > 0.7;
    if ((questionLike || shortText) && !isIdColumn(col, sampleValues) && !isCategorical(sampleValues) && !isNumerical(sampleValues)) {
      inputAssigned = true;
      return {
        columnName: col,
        suggestedRole: 'Input Data',
        confidence: Math.min(90, confidence + 15),
        reasoning: `Column "${col}" classified as input based on sample value patterns`
      };
    }
    // Output columns (expanded keywords)
    if (outputKeywords.some(keyword => colLower.includes(keyword))) {
      outputAssigned = true;
      return {
        columnName: col,
        suggestedRole: 'Model Output',
        confidence: Math.min(95, confidence + 25),
        reasoning: `Column "${col}" suggests model output/content based on name and sample analysis`
      };
    }
    // URL columns
    if (metadata.contentPatterns.includes('urls') && colLower.includes('url')) {
      return {
        columnName: col,
        suggestedRole: 'Input Data',
        confidence: Math.min(95, confidence + 20),
        reasoning: `Column "${col}" contains URLs as detected in intelligent sampling`
      };
    }
    // Long text columns (if not already assigned as output)
    if (metadata.contentPatterns.includes('long-text')) {
      const avgLength = sampleValues.filter(v => v != null).reduce((sum, v) => sum + String(v).length, 0) / sampleValues.length;
      if (avgLength > 100 && !outputAssigned) {
        outputAssigned = true;
        return {
          columnName: col,
          suggestedRole: 'Model Output',
          confidence: Math.min(95, confidence + 15),
          reasoning: `Column "${col}" contains long text content as detected in intelligent sampling`
        };
      }
    }
    // Categorical columns (could be segment/group)
    if (isCategorical(sampleValues)) {
      return {
        columnName: col,
        suggestedRole: 'Segment',
        confidence: Math.min(90, confidence + 10),
        reasoning: `Column "${col}" contains a small set of unique categorical values (likely a group/segment)`
      };
    }
    // Numerical columns (default to metadata unless name suggests otherwise)
    if (isNumerical(sampleValues)) {
      return {
        columnName: col,
        suggestedRole: 'Metadata',
        confidence: Math.min(90, confidence + 10),
        reasoning: `Column "${col}" contains only numerical values (likely metadata)`
      };
    }
    // Special case: Model/Source/Provider columns with short, categorical values should be Metadata
    const modelSourceKeywords2 = ['model', 'source', 'provider', 'author', 'system', 'engine'];
    const uniqueValues2 = Array.from(new Set(sampleValues.filter(v => v != null)));
    const allShort2 = uniqueValues2.every(v => String(v).length < 32);
    if (modelSourceKeywords2.some(kw => colLower.includes(kw)) && uniqueValues2.length > 0 && uniqueValues2.length <= 10 && allShort2) {
      return {
        columnName: col,
        suggestedRole: 'Metadata',
        confidence: Math.min(95, confidence + 25),
        reasoning: `Column "${col}" classified as metadata because it matches model/source/provider pattern with short, categorical values`
      };
    }
    // Default: Metadata
    return {
      columnName: col,
      suggestedRole: 'Metadata',
      confidence,
      reasoning: `Column "${col}" classified as metadata based on heuristic analysis`
    };
  });
  // Ensure at least one column is assigned as Model Output
  if (!outputAssigned && columns.length > 0) {
    // Find the column with the longest average text (excluding IDs/segments)
    let bestIdx = -1;
    let bestAvg = 0;
    columns.forEach((col, idx) => {
      const sampleValues = sampledData.map((row) => row[col]);
      if (isIdColumn(col, sampleValues) || isCategorical(sampleValues) || isNumerical(sampleValues)) return;
      const avgLength = sampleValues.filter(v => v != null).reduce((sum, v) => sum + String(v).length, 0) / sampleValues.length;
      if (avgLength > bestAvg) {
        bestAvg = avgLength;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) {
      columnAnalysis[bestIdx] = {
        ...columnAnalysis[bestIdx],
        suggestedRole: 'Model Output',
        confidence: 80,
        reasoning: (columnAnalysis[bestIdx].reasoning || '') + ' (assigned as Model Output by fallback guarantee)'
      };
    }
  }

  // Ensure at least one column is assigned as Input Data if heuristics match, even if not caught by initial mapping
  if (!inputAssigned && columns.length > 0) {
    // Find the column with the most question-like or short text values (excluding IDs/segments/outputs)
    let bestIdx = -1;
    let bestScore = 0;
    columns.forEach((col, idx) => {
      const sampleValues = sampledData.map((row) => row[col]);
      if (isIdColumn(col, sampleValues) || isCategorical(sampleValues) || isNumerical(sampleValues) || (columnAnalysis[idx]?.suggestedRole === 'Model Output')) return;
      const questionLike = sampleValues.filter(v => typeof v === 'string' && v.trim().endsWith('?')).length / sampleValues.length;
      const shortText = sampleValues.filter(v => typeof v === 'string' && v.length < 80).length / sampleValues.length;
      const score = questionLike * 2 + shortText; // weight question-like higher
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) {
      columnAnalysis[bestIdx] = {
        ...columnAnalysis[bestIdx],
        suggestedRole: 'Input Data',
        confidence: 75,
        reasoning: (columnAnalysis[bestIdx].reasoning || '') + ' (assigned as Input Data by fallback guarantee)'
      };
    }
  }

  // Centralized metrics/criteria logic (unchanged)
  const hasUrls = metadata.contentPatterns.includes('urls');
  const hasLongText = metadata.contentPatterns.includes('long-text');
  const hasStructured = metadata.contentPatterns.includes('structured');
  const hasNumerical = columnAnalysis.some(c => c.suggestedRole === 'Numerical');
  const hasCategorical = columnAnalysis.some(c => c.suggestedRole === 'Categorical');
  const hasImage = metadata.contentPatterns.includes('image') || columns.some(col => /image|img|picture|photo|jpeg|jpg|png/i.test(col));
  const hasVideo = metadata.contentPatterns.includes('video') || columns.some(col => /video|mp4|mov|avi|clip|media/i.test(col));
  const metrics = [
    {
      name: 'Overall Quality',
      type: 'likert-scale',
      options: ['1', '2', '3', '4', '5'],
      reasoning: hasVideo ? 'Assess overall video playback, visual quality, and content relevance'
        : hasImage ? 'Assess overall image quality, visual aesthetics, and content relevance'
        : hasLongText ? 'Assess overall text quality and coherence'
        : hasUrls ? 'Assess overall content and link quality'
        : 'Assess overall content quality',
      confidence: 85,
      required: true,
      likertLabels: { low: 'Poor', high: 'Excellent' }
    },
    {
      name: hasVideo ? 'Is the video visually appealing?'
        : hasImage ? 'Is the image clear and visually appealing?'
        : hasUrls ? 'Are the links functional and relevant?'
        : hasStructured ? 'Is the content properly formatted?'
        : hasNumerical ? 'Are the numerical values reasonable and accurate?'
        : hasCategorical ? 'Are the categories appropriate and well-defined?'
        : 'Is the content accurate and appropriate?',
      type: 'yes-no',
      options: ['Yes', 'No'],
      reasoning: hasVideo ? 'Assess the visual appeal, aesthetics, and presentation quality of the video.'
        : hasImage ? 'Verify image clarity, visual quality, and appropriateness'
        : hasUrls ? 'Verify link functionality and relevance'
        : hasStructured ? 'Check structural integrity and format compliance'
        : hasNumerical ? 'Check for outliers or unreasonable values'
        : hasCategorical ? 'Check for category consistency and appropriateness'
        : 'Verify content accuracy and appropriateness',
      confidence: 80,
      required: true
    },
    {
      name: 'Additional Comments',
      type: 'text-input',
      options: [],
      reasoning: 'Open-ended feedback and detailed observations',
      confidence: 70,
      required: false
    }
  ];

  // Centralized evaluation name logic (improved and more descriptive)
  let evaluationName = 'Content Quality';
  const hasModelOutput = columnAnalysis.some(c => c.suggestedRole === 'Model Output');
  const hasInput = columnAnalysis.some(c => c.suggestedRole === 'Input Data');
  const hasModelMeta = columnAnalysis.some(c => c.suggestedRole === 'Metadata' && /model|source|provider|author|system|engine/i.test(c.columnName));
  const modelOutputCols = columnAnalysis.filter(c => c.suggestedRole === 'Model Output');
  const inputCols = columnAnalysis.filter(c => c.suggestedRole === 'Input Data');
  // If multiple outputs, use 'Model Output Comparison'
  if (modelOutputCols.length > 1) evaluationName = 'Model Output Comparison';
  // If single output, use output column name for domain-specific headline
  else if (modelOutputCols.length === 1) {
    const mainOutputCol = modelOutputCols[0];
    const col = mainOutputCol.columnName.toLowerCase();
    if (/summary/.test(col)) evaluationName = 'Summary Quality';
    else if (/explanation/.test(col)) evaluationName = 'Explanation Quality';
    else if (/review/.test(col)) evaluationName = 'Review Quality';
    else if (/feedback/.test(col)) evaluationName = 'Feedback Quality';
    else if (/comment/.test(col)) evaluationName = 'Comment Quality';
    else if (/description/.test(col)) evaluationName = 'Description Quality';
    else if (/answer/.test(col)) evaluationName = 'Answer Quality';
    else if (/title/.test(col)) evaluationName = 'Title Quality';
    else if (/headline/.test(col)) evaluationName = 'Headline Quality';
    else if (/caption/.test(col)) evaluationName = 'Caption Quality';
    else if (/transcript/.test(col)) evaluationName = 'Transcript Quality';
    else if (/story/.test(col)) evaluationName = 'Story Quality';
    else if (/article/.test(col)) evaluationName = 'Article Quality';
    else if (/completion/.test(col)) evaluationName = 'Completion Quality';
    else if (/response|output|text|content|body|paragraph|passage|sentence|utterance/.test(col)) evaluationName = 'Response Quality';
    else evaluationName = cleanColumnNameForHeadline(mainOutputCol.columnName) + ' Quality';
  }
  // If no outputs, use input column name for domain-specific headline
  else if (inputCols.length > 0) {
    const mainInputCol = inputCols[0];
    const col = mainInputCol.columnName.toLowerCase();
    if (/summary/.test(col)) evaluationName = 'Summary Quality';
    else if (/explanation/.test(col)) evaluationName = 'Explanation Quality';
    else if (/review/.test(col)) evaluationName = 'Review Quality';
    else if (/feedback/.test(col)) evaluationName = 'Feedback Quality';
    else if (/comment/.test(col)) evaluationName = 'Comment Quality';
    else if (/description/.test(col)) evaluationName = 'Description Quality';
    else if (/answer/.test(col)) evaluationName = 'Answer Quality';
    else if (/title/.test(col)) evaluationName = 'Title Quality';
    else if (/headline/.test(col)) evaluationName = 'Headline Quality';
    else if (/caption/.test(col)) evaluationName = 'Caption Quality';
    else if (/transcript/.test(col)) evaluationName = 'Transcript Quality';
    else if (/story/.test(col)) evaluationName = 'Story Quality';
    else if (/article/.test(col)) evaluationName = 'Article Quality';
    else if (/completion/.test(col)) evaluationName = 'Completion Quality';
    else if (/response|output|text|content|body|paragraph|passage|sentence|utterance/.test(col)) evaluationName = 'Response Quality';
    else evaluationName = cleanColumnNameForHeadline(mainInputCol.columnName) + ' Quality';
  }
  else if (hasImage && hasVideo) evaluationName = 'Image and Video Content Quality';
  else if (hasImage) evaluationName = 'Image Content Quality';
  else if (hasVideo) evaluationName = 'Video Content Quality';
  else if (hasInput) evaluationName = 'Input Data Quality';
  else if (metadata.contentPatterns.includes('numerical')) evaluationName = 'Data Quality Assessment';

  // Prepend "Video" or "Media" if video/media content is detected and not already present
  if (hasVideo && !/^video|media/i.test(evaluationName)) {
    evaluationName = 'Video ' + evaluationName;
  } else if ((metadata.contentPatterns.includes('media')) && !/^media/i.test(evaluationName)) {
    evaluationName = 'Media ' + evaluationName;
  }

  // Centralized instructions logic (improved)
  let instructions = 'Please evaluate each item carefully. ';
  if (hasVideo) instructions += 'Focus on video playback quality, visual aesthetics, content relevance, and appropriateness. ';
  else if (hasImage) instructions += 'Focus on image quality, visual aesthetics, content relevance, and appropriateness. ';
  else if (hasUrls) instructions += 'Focus on link functionality, content relevance, and appropriateness. ';
  else if (hasLongText) instructions += 'Focus on text clarity, coherence, and completeness. ';
  else if (hasStructured) instructions += 'Focus on structural accuracy and format compliance. ';
  else if (hasNumerical) instructions += 'Focus on the accuracy and reasonableness of numerical values. ';
  else if (hasCategorical) instructions += 'Focus on the appropriateness and consistency of categories. ';
  else instructions += 'Focus on quality, relevance, and appropriateness. ';
  if (metadata.diversityScore > 0.7) instructions += 'Note that this evaluation covers a diverse range of content patterns.';
  instructions = instructions.trim();

  const result = {
    columnAnalysis,
    suggestedMetrics: metrics,
    suggestedCriteria: metrics.map(metric => ({
      name: metric.name,
      description: metric.reasoning,
      type: metric.type,
      required: metric.required,
      ...(metric.options && { options: metric.options }),
      ...(metric.likertLabels && { likertLabels: metric.likertLabels })
    })),
    evaluationName,
    instructions,
    samplingMetadata: metadata,
    __debugHeuristic: 'HEURISTIC_FALLBACK_ACTIVE_2025-06-30',
  };
  console.log('[HEURISTIC_FALLBACK] Called with columns:', columns, 'Sample data:', data?.[0], 'Result:', result);
  return result;

  // Helper to clean up column names for headlines
  function cleanColumnNameForHeadline(col: string): string {
    // Remove common technical prefixes (e.g., 'tc.', 'testcase.', etc.)
    let cleaned = col.replace(/^[a-z]{1,4}\./i, '');
    // Replace underscores and dots with spaces
    cleaned = cleaned.replace(/[._]/g, ' ');
    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Capitalize each word
    cleaned = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return cleaned;
  }
}
