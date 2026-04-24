// Tests for staff auth helpers
// These test the mobile-core auth module's token storage behaviour

const TOKEN_KEY = "doktori.token";

// Mock expo-secure-store
const mockStore: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "@doktori/mobile-core";

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
});

describe("loginStaff", () => {
  it("stores token on success", async () => {
    await setStoredToken("test-token-123");
    const stored = await getStoredToken();
    expect(stored).toBe("test-token-123");
  });
});

describe("logout", () => {
  it("clears token", async () => {
    await setStoredToken("some-token");
    await clearStoredToken();
    const stored = await getStoredToken();
    expect(stored).toBeNull();
  });
});

describe("restoreSession", () => {
  it("returns null token when no token stored", async () => {
    const token = await getStoredToken();
    expect(token).toBeNull();
  });
});
