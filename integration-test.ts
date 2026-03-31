import { extractImportedTimetableRequestSchema } from "./src/lib/schema/extraction";
import { timetableExtractionResultSchema } from "./src/lib/schema/extraction";

// Test the schema validation
const validInput = {
  raw_text: "Math 101 Monday 9:00-10:30 Room 201"
};

try {
  const parsedInput = extractImportedTimetableRequestSchema.parse(validInput);
  console.log("Input schema validation passed:", parsedInput);
} catch (e) {
  console.error("Input schema validation failed:", e);
}

// Test the output schema validation
const validOutput = {
  courses: [
    {
      course_name: "Math 101",
      time_slots: [{ day_of_week: 1, time: "第一.二节" }],
      location: "Room 201"
    }
  ],
  malformed_rows: [],
  warnings: []
};

try {
  const parsedOutput = timetableExtractionResultSchema.parse(validOutput);
  console.log("Output schema validation passed:", parsedOutput);
} catch (e) {
  console.error("Output schema validation failed:", e);
}
