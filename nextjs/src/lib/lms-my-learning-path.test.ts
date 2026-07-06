import { describe, expect, it } from "vitest";

import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

describe("lmsMyLearningCoursePath", () => {
  it("prefers slug over numeric id", () => {
    expect(lmsMyLearningCoursePath({ id: 27, slug: "pf-demo-lms-onboarding" })).toBe(
      "/lms/my-learning/pf-demo-lms-onboarding",
    );
  });

  it("falls back to id when slug missing", () => {
    expect(lmsMyLearningCoursePath({ id: "27", slug: "" })).toBe("/lms/my-learning/27");
  });
});
