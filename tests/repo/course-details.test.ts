import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import {
  appendRareEventFeedback,
  listCourseDetails,
  replaceCourseDetails
} from "../../src/lib/repo/course-details";
import type { CourseDetailInput } from "../../src/lib/types/input";

const sampleCourseDetails: CourseDetailInput[] = [
  {
    course_name_ref: "Intro Math",
    course_class: "core",
    course_target_level: "pass_only",
    personal_fail_risk: "possible_to_fail",
    attendance_modes: ["full_roll_call_every_session"],
    rare_event_feedback: []
  }
];

afterEach(async () => {
  await db.courseDetail.deleteMany();
});

describe("course detail repository", () => {
  it("persists and reads back course details", async () => {
    await replaceCourseDetails(sampleCourseDetails);

    const savedDetails = await listCourseDetails();

    expect(savedDetails).toHaveLength(1);
    expect(savedDetails[0]?.course_name_ref).toBe("Intro Math");
  });

  it("appends rare-event feedback with a bounded history", async () => {
    await replaceCourseDetails(sampleCourseDetails);

    for (let index = 0; index < 25; index += 1) {
      await appendRareEventFeedback("Intro Math", {
        event_type: "rare_full_roll_call",
        note: `Event ${index}`,
        occurred_at: `2026-03-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`
      });
    }

    const savedDetails = await listCourseDetails();
    const feedback = savedDetails[0]?.rare_event_feedback ?? [];

    expect(feedback.length).toBe(20);
    expect(feedback[feedback.length - 1]?.note).toBe("Event 24");
  });
});
