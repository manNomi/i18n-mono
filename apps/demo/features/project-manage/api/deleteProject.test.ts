import { deleteProject } from "./deleteProject";

describe("deleteProject", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns payload on success", async () => {
    const payload = { id: "p1", message: "deleted" };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    } as unknown as Response);

    const result = await deleteProject("p1");

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith("/api/projects/p1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("throws API error on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Failed to delete" }),
    } as unknown as Response);

    await expect(deleteProject("p1")).rejects.toThrow("Failed to delete");
  });
});
