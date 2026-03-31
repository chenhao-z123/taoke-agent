-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planningMode" TEXT NOT NULL,
    "freeTimeTarget" JSONB,
    "strategyTier" TEXT NOT NULL,
    "riskTier" TEXT NOT NULL,
    "maxRecordedAbsencesOverride" INTEGER,
    "caughtRiskToleranceNote" TEXT,
    "executionPressure" TEXT NOT NULL,
    "scoreBufferPreference" TEXT NOT NULL,
    "preferLargeBlocks" BOOLEAN NOT NULL DEFAULT false,
    "preferSkipEarlyClasses" BOOLEAN NOT NULL DEFAULT false,
    "preferSkipLateClasses" BOOLEAN NOT NULL DEFAULT false,
    "preferredWeekdays" JSONB,
    "preferredTimeUseCases" JSONB,
    "substituteAttendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "substituteAttendanceDefaultCost" REAL,
    "signInThenLeaveWillingness" BOOLEAN NOT NULL DEFAULT false,
    "retroactiveRemedyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimetableCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseName" TEXT NOT NULL,
    "timeSlots" JSONB NOT NULL,
    "location" TEXT,
    "teacherName" TEXT,
    "weekRange" JSONB,
    "courseTypeOrCredit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SemesterPhaseConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseTemplate" JSONB NOT NULL,
    "phaseRuleOverrides" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShortTermModifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weatherModifier" TEXT,
    "temporaryGoalShift" TEXT,
    "upcomingEvents" JSONB,
    "bodyState" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CourseDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseNameRef" TEXT NOT NULL,
    "courseClass" TEXT NOT NULL,
    "fieldConfidence" TEXT,
    "specialCourseKind" TEXT,
    "courseTargetLevel" TEXT NOT NULL,
    "specialReasonNote" TEXT,
    "personalFailRisk" TEXT NOT NULL,
    "attendanceModes" JSONB NOT NULL,
    "fullRollCallFrequencyTier" TEXT,
    "randomCheckFrequencyTier" TEXT,
    "maxRecordedAbsences" INTEGER,
    "failThresholdAbsences" INTEGER,
    "scoreLossPerRecordedAbsence" REAL,
    "hasMandatorySessions" BOOLEAN,
    "absenceRuleNote" TEXT,
    "absenceRuleConfidence" TEXT,
    "gradingComponents" JSONB,
    "gradingRawNote" TEXT,
    "attendanceRequirementRawInput" TEXT,
    "attendanceRequirementStructuredSummary" TEXT,
    "signInThenLeaveFeasibility" TEXT,
    "escapeFeasibilityTier" TEXT,
    "escapeEnvironmentTags" JSONB,
    "escapeEnvironmentNote" TEXT,
    "substituteAttendanceAllowedForCourse" BOOLEAN,
    "substituteAttendanceCostOverride" REAL,
    "substituteAttendanceNote" TEXT,
    "keySessionTypes" JSONB,
    "rareEventFeedback" JSONB,
    "courseNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planningWindow" JSONB NOT NULL,
    "availableTimeViews" JSONB,
    "strategySnapshot" JSONB NOT NULL,
    "tuningControls" JSONB NOT NULL,
    "judgeShortRationale" TEXT,
    "missingInfoPrompt" TEXT,
    "selectedCandidateId" TEXT,
    "judgeSummary" TEXT,
    "debateSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedPlanId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "attendanceStatus" TEXT NOT NULL,
    "executionNote" TEXT NOT NULL,
    "eventFeedbackAllowed" BOOLEAN DEFAULT false,
    "mustAttendReason" TEXT,
    "estimatedCommuteTimeCost" REAL,
    "estimatedSubstituteCost" REAL,
    "leaveEarlyNote" TEXT,
    "phaseContextNote" TEXT,
    "shortTermOverrideNote" TEXT,
    "riskLevel" TEXT,
    "timeValueScore" REAL,
    "moneyCostScore" REAL,
    "decisionConfidence" TEXT,
    "missingInfoSummary" TEXT,
    "constraintHits" JSONB,
    "recordedAbsenceImpact" TEXT,
    "rareEventReplanNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedPlanItem_generatedPlanId_fkey" FOREIGN KEY ("generatedPlanId") REFERENCES "GeneratedPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
