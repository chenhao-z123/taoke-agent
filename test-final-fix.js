const problematicJson = `{"courses":[],"
malformed_rows":[],"
warnings":[]}`;

const cleaned = problematicJson.replace(/[\x00-\x1f\x7f-\x9f]+"/g, '"');

console.log("Original:", JSON.stringify(problematicJson));
console.log("Cleaned:", JSON.stringify(cleaned));

try {
  const parsed = JSON.parse(cleaned);
  console.log("✅ Successfully parsed:", parsed);
} catch (error) {
  console.log("❌ Failed to parse:", error.message);
}