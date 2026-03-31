// Test the exact problematic JSON from the error log
const problematicJson = `{"courses":[],"
malformed_rows":[],"
warnings":[]}`;

// Apply our cleaning logic
const cleaned = problematicJson.replace(/:\s*\n\s*"/g, ':"').replace(/\x00/g, '');

console.log("Original:", problematicJson);
console.log("Cleaned:", cleaned);

try {
  const parsed = JSON.parse(cleaned);
  console.log("✅ Successfully parsed:", parsed);
} catch (error) {
  console.log("❌ Failed to parse:", error.message);
}