import { GET } from "./route";

describe("GET /api/downloads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 when package parameter is missing", async () => {
    const req = new Request("http://localhost/api/downloads");
    const res = await GET(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Package name is required",
    });
  });

  it("returns 404 for unknown package", async () => {
    const req = new Request("http://localhost/api/downloads?package=unknown");
    const res = await GET(req);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Package not found" });
  });

  it("returns 500 when npm api response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    } as Response);

    const req = new Request("http://localhost/api/downloads?package=i18nexus");
    const res = await GET(req);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to fetch npm data",
    });
  });

  it("returns download payload on success", async () => {
    const payload = {
      downloads: 123,
      package: "i18nexus",
      start: "2025-09-28",
      end: "2026-03-29",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    } as Response);

    const req = new Request("http://localhost/api/downloads?package=i18nexus");
    const res = await GET(req);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.npmjs.org/downloads/point/2025-09-28"),
      { next: { revalidate: 3600 } }
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(payload);
  });

  it("returns 500 when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network"));

    const req = new Request("http://localhost/api/downloads?package=i18nexus");
    const res = await GET(req);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});
