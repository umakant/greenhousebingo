import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emNotificationLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1n }),
    },
    role: { findFirst: vi.fn().mockResolvedValue(null) },
    modelHasRole: { findMany: vi.fn().mockResolvedValue([]) },
    permission: { findFirst: vi.fn().mockResolvedValue(null) },
    roleHasPermission: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: 1n, name: "Pat", email: "pat@example.com" }) },
  },
}));

vi.mock("@/lib/settings-service", () => ({
  getSettingsForOwner: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/send-templated-email", () => ({
  isCompanyEmailNotificationEnabled: vi.fn().mockReturnValue(false),
  sendTemplatedEmailAsync: vi.fn(),
}));

describe("em-notification-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when email toggles are off", async () => {
    const { notifyEmReportWorkflowChange } = await import("./em-notification-service");
    await expect(
      notifyEmReportWorkflowChange({
        organizationId: 1005n,
        reportId: 99n,
        reportNumber: "EM-TEST-001",
        purpose: "Trip",
        action: "submit",
        submitterUserId: 1n,
      }),
    ).resolves.toBeUndefined();
  });
});
