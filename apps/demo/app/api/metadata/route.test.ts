import type { NextRequest } from "next/server";

import { POST } from "./route";

const createRequest = (body: unknown): NextRequest => {
  return new Request("http://localhost/api/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
};

describe("POST /api/metadata", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 when url is missing", async () => {
    const res = await POST(createRequest({}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "URL is required" });
  });

  it("returns 400 for invalid url format", async () => {
    const res = await POST(createRequest({ url: "not-a-url" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid URL format",
    });
  });

  it("returns 429 when metadata service is rate-limited", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers({ "content-type": "application/json" }),
    } as Response);

    const res = await POST(createRequest({ url: "https://example.com" }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "Metadata service rate limit exceeded",
      details: "Please try again later",
    });
  });

  it("returns 500 when content-type is not json", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      json: jest.fn().mockResolvedValue({ status: "success" }),
    } as Response);

    const res = await POST(createRequest({ url: "https://example.com" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Metadata service returned unexpected response",
      details: "Expected JSON but got text/html",
    });
  });

  it("returns 400 when microlink cannot access target url", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: jest.fn().mockResolvedValue({
        status: "fail",
        message: "ENOTFOUND domain",
      }),
    } as Response);

    const res = await POST(createRequest({ url: "https://example.com" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Cannot access URL",
      details: "Domain does not exist or is inaccessible",
    });
  });

  it("returns mapped metadata payload on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: jest.fn().mockResolvedValue({
        status: "success",
        data: {
          title: "Example Title",
          description: "Example Description",
          url: "https://example.com",
          image: { url: "https://example.com/og.png" },
          screenshot: { url: "https://example.com/shot.png" },
        },
      }),
    } as Response);

    const res = await POST(createRequest({ url: "https://example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      autoTitle: "Example Title",
      autoDescription: "Example Description",
      thumbnailUrl: "https://example.com/og.png",
      screenshotUrl: "https://example.com/shot.png",
      ogImageUrl: "https://example.com/og.png",
      url: "https://example.com",
    });
  });
});
