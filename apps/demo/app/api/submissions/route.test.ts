import type { NextRequest } from "next/server";

jest.mock("@/lib/firebase", () => ({
  db: null,
}));

const createRequest = (
  url: string,
  method: string,
  body?: unknown,
): NextRequest => {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
};

describe("/api/submissions (db not configured)", () => {
  it("POST returns 503", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      createRequest("http://localhost/api/submissions", "POST", {
        url: "https://example.com",
        autoTitle: "Example",
      }),
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        code: "FIRESTORE_NOT_CONFIGURED",
      }),
    );
  });

  it("GET returns 503", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      createRequest("http://localhost/api/submissions", "GET"),
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        code: "FIRESTORE_NOT_CONFIGURED",
      }),
    );
  });

  it("PATCH returns 503", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(
      createRequest("http://localhost/api/submissions", "PATCH", { id: "x" }),
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        code: "FIRESTORE_NOT_CONFIGURED",
      }),
    );
  });

  it("DELETE returns 503", async () => {
    const { DELETE } = await import("./route");
    const res = await DELETE(
      createRequest("http://localhost/api/submissions?id=x", "DELETE"),
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        code: "FIRESTORE_NOT_CONFIGURED",
      }),
    );
  });
});
