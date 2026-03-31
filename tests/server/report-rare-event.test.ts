import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { replaceCourseDetails } from "../../src/lib/repo/course-details";
import { reportRareEvent } from "../../src/server/actions/report-rare-event";

afterEach(async () => {
  await db.courseDetail.deleteMany();
});

describe("reportRareEvent", () => {
  it("appends rare-event feedback to a course detail", async () => {
    await replaceCourseDetails([
      {
        course_name_ref: "Intro Math",
        course_class: "core",
        course_target_level: "pass_only",
        personal_fail_risk: "possible_to_fail",
        attendance_modes: ["full_roll_call_every_session"]
      }
    ]);

    const result = await reportRareEvent({
      course_name_ref: "Intro Math",
      feedback: {
        event_type: "rare_full_roll_call",
        note: "Surprise check",
        occurred_at: "2026-03-05T08:00:00.000Z"
      }
    });

    expect(result.course_detail.rare_event_feedback).toHaveLength(1);
    expect(result.course_detail.rare_event_feedback?.[0]?.event_type).toBe(
      "rare_full_roll_call"
    );
  });

  it("rejects invalid rare-event feedback payloads", async () => {
    await replaceCourseDetails([
      {
        course_name_ref: "Intro Math",
        course_class: "core",
        course_target_level: "pass_only",
        personal_fail_risk: "possible_to_fail",
        attendance_modes: ["full_roll_call_every_session"]
      }
    ]);

    await expect(
      reportRareEvent({
        course_name_ref: "Intro Math",
        feedback: {
          note: "Missing type"
        }
      })
    ).rejects.toThrow();
  });
});
