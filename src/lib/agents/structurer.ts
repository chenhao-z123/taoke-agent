import type { AttendanceMode, KeySessionType } from "@/lib/types/input";

export type StructurerResult = {
  normalized_fields: {
    attendance_modes: AttendanceMode[];
    key_session_types: KeySessionType[];
  };
  contradiction_signals: string[];
  missing_fields: string[];
};

export function normalizeStructuredCandidateFields(input: {
  raw_notes: string[];
}): StructurerResult {
  const noteText = input.raw_notes.join(" ").toLowerCase();
  const attendanceModes: AttendanceMode[] = [];
  const keySessionTypes: KeySessionType[] = [];
  const contradictionSignals: string[] = [];

  if (noteText.includes("random")) {
    attendanceModes.push("random_full_roll_call");
  }

  if (noteText.includes("full roll call")) {
    attendanceModes.push("full_roll_call_every_session");
  }

  if (noteText.includes("pre-final") || noteText.includes("before the final")) {
    keySessionTypes.push("pre_final_session");
  }

  if (noteText.includes("sign in then leave")) {
    contradictionSignals.push(
      "Sign-in-then-leave feasibility conflicts with awkward exit conditions."
    );
  }

  if (noteText.includes("random") && noteText.includes("full roll call")) {
    contradictionSignals.push(
      "Attendance behavior appears inconsistent between random and full roll-call descriptions."
    );
  }

  return {
    normalized_fields: {
      attendance_modes: Array.from(new Set(attendanceModes)),
      key_session_types: Array.from(new Set(keySessionTypes))
    },
    contradiction_signals: contradictionSignals,
    missing_fields: []
  };
}
