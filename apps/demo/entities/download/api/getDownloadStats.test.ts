import { getDownloadStats } from "./getDownloadStats";

describe("getDownloadStats", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("throws for unknown package", async () => {
    await expect(getDownloadStats("unknown")).rejects.toThrow(
      "Package not found",
    );
  });

  it("throws when npm api response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);

    await expect(getDownloadStats("i18nexus")).rejects.toThrow(
      "Failed to fetch npm data",
    );
  });

  it("returns payload when npm api succeeds", async () => {
    const payload = {
      downloads: 456,
      package: "i18nexus",
      start: "2025-09-28",
      end: "2026-03-29",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    } as Response);

    const result = await getDownloadStats("i18nexus");

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.npmjs.org/downloads/point/2025-09-28"),
      { next: { revalidate: 3600 } },
    );
  });
});
