import { fetchMetadata } from "./fetchMetadata";

describe("fetchMetadata", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns metadata when request succeeds", async () => {
    const mockPayload = {
      autoTitle: "Example",
      autoDescription: "Desc",
      thumbnailUrl: "https://image.example/thumb.png",
      screenshotUrl: "https://image.example/shot.png",
      url: "https://example.com",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockPayload),
    } as unknown as Response);

    const result = await fetchMetadata("https://example.com");

    expect(global.fetch).toHaveBeenCalledWith("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect(result).toEqual(mockPayload);
  });

  it("throws API error with details when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: "Metadata service error occurred",
        details: "HTTP 500",
      }),
    } as unknown as Response);

    await expect(fetchMetadata("https://example.com")).rejects.toThrow(
      "Metadata service error occurred (HTTP 500)",
    );
  });

  it("throws parsing error when JSON cannot be parsed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("bad json")),
    } as unknown as Response);

    await expect(fetchMetadata("https://example.com")).rejects.toThrow(
      "서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});
