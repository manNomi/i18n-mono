import { approveProject } from "./approveProject";

describe("approveProject", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns payload on success", async () => {
    const payload = { id: "p1", message: "approved" };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    } as unknown as Response);

    const result = await approveProject("p1");

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith("/api/projects/p1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
  });

  it("throws API error on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Failed to approve" }),
    } as unknown as Response);

    await expect(approveProject("p1")).rejects.toThrow("Failed to approve");
  });
});
