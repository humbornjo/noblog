import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotionSource } from "../src/lib/notion/client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number, code: string): Response {
  return jsonResponse(
    { object: "error", status, code, message: "Mock Notion failure" },
    status,
  );
}

function pageResponse(): Response {
  return jsonResponse({
    id: "page",
    object: "page",
    url: "https://www.notion.so/page",
    properties: {},
  });
}

function source() {
  return createNotionSource({
    notionApiSecret: "test-secret",
    databaseId: "test-database",
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Notion request retries", () => {
  it("does not retry permanent API errors after the caller rejects", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => errorResponse(400, "invalid_request"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(source().getPage("page")).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for transient HTTP failures and returns a later success", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429, "rate_limited"))
      .mockResolvedValueOnce(errorResponse(503, "service_unavailable"))
      .mockResolvedValueOnce(pageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const request = source().getPage("page");
    const assertion = expect(request).resolves.toMatchObject({ id: "page" });
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("settles after three attempts without detached retries", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => errorResponse(503, "service_unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    const request = source().getPage("page");
    const assertion = expect(request).rejects.toMatchObject({ status: 503 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries network errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Mock network failure"))
      .mockResolvedValueOnce(pageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const request = source().getPage("page");
    const assertion = expect(request).resolves.toMatchObject({ id: "page" });
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
