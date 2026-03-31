import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractImportedTimetable } from "../../src/server/actions/extract-imported-timetable";

describe("Comprehensive Time Slot Structure Fix", () => {
  beforeEach(() => {
    vi.mock("../../src/lib/llm/provider", () => {
      return {
        getLlmProvider: () => ({
          generateObject: async () => ({
            courses: [
              {
                course_name: "Math 101",
                time_slots: [{ day_of_week: 1, time: "第一.二节" }],
                location: "Room 201"
              },
              {
                course_name: "Physics 102",
                time_slots: [{ day_of_week: 2, time: "第一.二节" }],
                location: "Lab 302"
              }
            ],
            malformed_rows: [],
            warnings: []
          })
        })
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle table-structured input with row/column headers correctly", async () => {
    const result = await extractImportedTimetable({
      raw_text: `Period | Monday      | Tuesday      
1-2    | Math 101    | Physics 102  
       | Room 201    | Lab 302      `
    });
    
    expect(result.courses).toHaveLength(2);
    expect(result.courses[0]).toHaveProperty("time_slots");
    expect(result.courses[0].time_slots[0]).toHaveProperty("time");
    expect(result.courses[0].time_slots[0]).not.toHaveProperty("start_time");
    expect(result.courses[0].time_slots[0]).not.toHaveProperty("end_time");
  });
});