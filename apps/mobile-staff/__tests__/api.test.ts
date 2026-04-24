import { api, setApiBaseUrl, ApiError } from "@doktori/mobile-core";

// Mock expo-secure-store so auth-storage doesn't break in Jest
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock global fetch
global.fetch = jest.fn();

function mockFetch(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset baseUrl to empty to test the throw
  setApiBaseUrl("");
});

describe("api()", () => {
  it("throws when baseUrl not set", async () => {
    await expect(api("/api/test", { skipAuth: true })).rejects.toThrow(
      "API base URL missing"
    );
  });

  it("adds Authorization header when token provided", async () => {
    setApiBaseUrl("http://localhost:3000");
    mockFetch(200, { ok: true });
    await api("/api/test", { token: "my-token", skipAuth: true });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer my-token");
  });

  it("throws ApiError on non-ok response", async () => {
    setApiBaseUrl("http://localhost:3000");
    mockFetch(401, { error: "Non autorisé" });
    try {
      await api("/api/protected", { skipAuth: true });
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).message).toBe("Non autorisé");
    }
  });
});
