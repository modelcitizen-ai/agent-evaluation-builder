#!/bin/bash

echo "🔍 Testing Original Video URL Detection Issue"
echo "=============================================="

echo ""
echo "📡 Testing API with video data to reproduce original issue..."

curl -s -X POST http://localhost:3000/api/analyze-data \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "Video Title": "Introduction to Machine Learning",
        "Video URL": "https://example.com/videos/ml-intro.mp4",
        "Summary (Excerpt)": "This video covers the basics of machine learning algorithms and their applications.",
        "Evaluation Criteria": "Clarity, Technical Accuracy, Engagement"
      }
    ],
    "columns": ["Video Title", "Video URL", "Summary (Excerpt)", "Evaluation Criteria"]
  }' | jq '.'

echo ""
echo "🎯 Expected Issue: Video URL should be classified as 'Metadata' instead of 'Input Data'"
echo "🎯 This reproduces the original bug we need to fix"
