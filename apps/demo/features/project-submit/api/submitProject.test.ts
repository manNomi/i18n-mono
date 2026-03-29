import { submitProject } from "./submitProject";

describe("submitProject", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const payload = {
    url: "https://example.com",
    projectName: "Example",
    autoTitle: "Auto Title",
    autoDescription: "Auto Description",
    thumbnailUrl: "https://example.com/thumb.png",
    screenshotUrl: "https://example.com/shot.png",
    contactEmail: "user@example.com",
  };

  it("returns response when submission succeeds", async () => {
    const mockResponse = { id: "abc123", message: "ok" };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as Response);

    const result = await submitProject(payload);

    expect(global.fetch).toHaveBeenCalledWith("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockResponse);
  });

  it("throws API error when submission fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Failed to submit" }),
    } as Response);

    await expect(submitProject(payload)).rejects.toThrow("Failed to submit");
  });

  it("falls back to default error message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    } as Response);

    await expect(submitProject(payload)).rejects.toThrow("Failed to submit");
  });
});
