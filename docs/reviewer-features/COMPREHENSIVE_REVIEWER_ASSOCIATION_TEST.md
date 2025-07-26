#!/bin/bash
# Complete Reviewer Association Test

echo "🧪 COMPREHENSIVE REVIEWER ASSOCIATION TEST"
echo "============================================"
echo ""
echo "This test verifies that:"
echo "1. Manual reviewers are properly associated with evaluations"
echo "2. Bulk uploaded reviewers are properly associated with evaluations"
echo "3. Progress dashboard can track all reviewers correctly"
echo "4. All reviewers persist with their evaluation ID"
echo ""

echo "📋 INSTRUCTIONS:"
echo "1. Start the development server: npm run dev"
echo "2. Open the application in a browser"
echo "3. Open browser console and paste the following test script:"
echo ""

cat << 'EOF'
// =============================================================================
// COMPREHENSIVE REVIEWER ASSOCIATION TEST SCRIPT
// =============================================================================

console.log('🧪 STARTING COMPREHENSIVE REVIEWER ASSOCIATION TEST...\n');

// Step 1: Clean up existing data
localStorage.removeItem("evaluations");
localStorage.removeItem("evaluationReviewers");
localStorage.removeItem("reviewerCompletions");
console.log('✅ Cleaned up existing data');

// Step 2: Create test evaluation
const testEvaluation = {
  id: 12345,
  name: "📊 Test Evaluation - Reviewer Association",
  description: "Testing reviewer association and progress tracking",
  status: "draft",
  totalItems: 5,
  createdAt: new Date().toISOString(),
  criteria: [
    { id: 1, name: "Quality", description: "Rate the quality" },
    { id: 2, name: "Usability", description: "Rate the usability" }
  ],
  data: [
    { id: 1, content: "Test item 1" },
    { id: 2, content: "Test item 2" },
    { id: 3, content: "Test item 3" },
    { id: 4, content: "Test item 4" },
    { id: 5, content: "Test item 5" }
  ]
};

localStorage.setItem("evaluations", JSON.stringify([testEvaluation]));
console.log('✅ Created test evaluation:', testEvaluation.name, '(ID:', testEvaluation.id + ')');

// Step 3: Test manual reviewer addition (simulate what happens in Add Reviewers page)
console.log('\n📝 Testing manual reviewer addition...');

const manualReviewer = {
  id: "manual-" + Date.now(),
  name: "👤 Manual Test Reviewer",
  email: "manual@test.com",
  segment: "Test Segment",
  notes: "Added manually via form",
  link: window.location.origin + "/reviewer?participant=manual-" + Date.now(),
  createdAt: new Date().toISOString(),
  evaluationId: "12345" // String format like the actual implementation
};

// Add to evaluationReviewers (progress tracking)
const progressReviewer1 = {
  id: manualReviewer.id,
  name: manualReviewer.name,
  email: manualReviewer.email,
  status: "active",
  completed: 0,
  total: testEvaluation.totalItems,
  avgTime: "0.0",
  evaluationId: "12345" // String format
};

let evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]");
evaluationReviewers.push(progressReviewer1);
localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers));

console.log('✅ Added manual reviewer to progress tracking');
console.log('   Name:', manualReviewer.name);
console.log('   ID:', manualReviewer.id);
console.log('   Evaluation ID:', manualReviewer.evaluationId);

// Step 4: Test bulk reviewer addition (simulate CSV upload)
console.log('\n📁 Testing bulk reviewer addition...');

const bulkReviewers = [
  { ReviewerName: "👥 Bulk Reviewer 1", Email: "bulk1@test.com", Segment: "Segment A" },
  { ReviewerName: "👥 Bulk Reviewer 2", Email: "bulk2@test.com", Segment: "Segment B" },
  { ReviewerName: "👥 Bulk Reviewer 3", Email: "bulk3@test.com", Segment: "Segment C" }
];

bulkReviewers.forEach((uploaded, index) => {
  const reviewerId = "bulk-" + Date.now() + "-" + index;
  
  // Add to evaluationReviewers (progress tracking)
  const progressReviewer = {
    id: reviewerId,
    name: uploaded.ReviewerName,
    email: uploaded.Email,
    status: "active",
    completed: 0,
    total: testEvaluation.totalItems,
    avgTime: "0.0",
    evaluationId: "12345" // String format
  };
  
  evaluationReviewers.push(progressReviewer);
  console.log('✅ Added bulk reviewer:', uploaded.ReviewerName, '(ID:', reviewerId + ')');
});

localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers));
console.log('✅ Saved all bulk reviewers to progress tracking');

// Step 5: Test Progress Dashboard filtering
console.log('\n📊 Testing Progress Dashboard filtering...');

// This is the exact filtering logic from the Progress Dashboard component
const storedReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]");
const evaluationId = 12345;

// Test both string and number filtering (to catch type mismatch issues)
const filteredReviewersStrict = storedReviewers.filter(
  (reviewer) => !evaluationId || reviewer.evaluationId === evaluationId.toString()
);

const filteredReviewersLoose = storedReviewers.filter(
  (reviewer) => !evaluationId || reviewer.evaluationId == evaluationId
);

console.log('📋 Progress Dashboard Filtering Results:');
console.log('   Total reviewers in storage:', storedReviewers.length);
console.log('   Reviewers for evaluation (strict ===):', filteredReviewersStrict.length);
console.log('   Reviewers for evaluation (loose ==):', filteredReviewersLoose.length);

if (filteredReviewersStrict.length === 4) {
  console.log('✅ Progress Dashboard filtering works correctly!');
  filteredReviewersStrict.forEach((reviewer, index) => {
    console.log(`   ${index + 1}. ${reviewer.name} (ID: ${reviewer.id})`);
    console.log(`      Status: ${reviewer.status}, Progress: ${reviewer.completed}/${reviewer.total}`);
  });
} else {
  console.log('❌ Progress Dashboard filtering failed!');
  console.log('Expected 4 reviewers (1 manual + 3 bulk), got:', filteredReviewersStrict.length);
  
  if (filteredReviewersLoose.length === 4) {
    console.log('🚨 TYPE MISMATCH DETECTED - IDs are not matching due to type differences');
    console.log('Reviewers with loose equality check:');
    filteredReviewersLoose.forEach(r => {
      console.log(`   - ${r.name}: evaluationId="${r.evaluationId}" (${typeof r.evaluationId})`);
    });
  }
}

// Step 6: Test evaluation status update
console.log('\n🔄 Testing evaluation status update...');

// Simulate what happens when reviewers are added
const evaluations = JSON.parse(localStorage.getItem("evaluations") || "[]");
const updatedEvaluations = evaluations.map(evaluation => {
  if (evaluation.id.toString() === "12345") {
    return { ...evaluation, status: "active" };
  }
  return evaluation;
});

localStorage.setItem("evaluations", JSON.stringify(updatedEvaluations));
console.log('✅ Updated evaluation status to "active"');

// Step 7: Summary and next steps
console.log('\n🎯 TEST SUMMARY:');
console.log('================');

const finalEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]");
const finalReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]");
const evalForTest = finalEvaluations.find(e => e.id === 12345);
const reviewersForTest = finalReviewers.filter(r => r.evaluationId === "12345");

console.log('📊 Test Evaluation:');
console.log(`   Name: ${evalForTest?.name}`);
console.log(`   Status: ${evalForTest?.status}`);
console.log(`   Total Items: ${evalForTest?.totalItems}`);

console.log('\n👥 Associated Reviewers:');
reviewersForTest.forEach((reviewer, index) => {
  console.log(`   ${index + 1}. ${reviewer.name}`);
  console.log(`      Email: ${reviewer.email}`);
  console.log(`      Status: ${reviewer.status}`);
  console.log(`      Progress: ${reviewer.completed}/${reviewer.total}`);
  console.log(`      Evaluation ID: ${reviewer.evaluationId}`);
});

console.log('\n✅ VERIFICATION STEPS:');
console.log('1. Navigate to Data Scientist page');
console.log('2. Find the test evaluation and click to view Progress Dashboard');
console.log('3. Verify all 4 reviewers are visible and properly tracked');
console.log('4. Test adding reviewers manually via "Add Reviewers" page');
console.log('5. Test bulk upload via CSV file');

console.log('\n🧹 CLEANUP (run when done testing):');
console.log('localStorage.removeItem("evaluations");');
console.log('localStorage.removeItem("evaluationReviewers");');
console.log('localStorage.removeItem("reviewerCompletions");');
console.log('console.log("✅ Test data cleaned up");');

console.log('\n🎉 COMPREHENSIVE REVIEWER ASSOCIATION TEST COMPLETED!');
EOF

echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- All 4 reviewers (1 manual + 3 bulk) should be visible in Progress Dashboard"
echo "- Each reviewer should show 0/5 progress initially"
echo "- Each reviewer should have status 'Active'"
echo "- Evaluation should be marked as 'Active' when reviewers are added"
echo ""
echo "🔍 TO VERIFY THE FEATURE WORKS:"
echo "1. Run the test script above in browser console"
echo "2. Navigate to the Add Reviewers page (/data-scientist/new/assign-reviewers)"
echo "3. Add a manual reviewer using the form"
echo "4. Upload the sample CSV file (sample-reviewers.csv)"
echo "5. Check that all reviewers appear in the Progress Dashboard"
echo ""
echo "📝 MANUAL TESTING CHECKLIST:"
echo "□ Manual reviewer form works correctly"
echo "□ CSV file upload works correctly"
echo "□ All reviewers persist with correct evaluation ID"
echo "□ Progress Dashboard shows all associated reviewers"
echo "□ Reviewer removal works correctly"
echo "□ Unique links are generated for each reviewer"
echo ""
