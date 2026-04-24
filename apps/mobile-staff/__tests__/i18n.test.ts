import { t, loadMessages, setLocale } from "@doktori/mobile-core";

beforeEach(() => {
  setLocale("fr");
  loadMessages("fr", {});
  loadMessages("ar", {});
});

describe("t()", () => {
  it("returns key when not found", () => {
    expect(t("some.missing.key")).toBe("some.missing.key");
  });

  it("returns translation after loadMessages", () => {
    loadMessages("fr", { greeting: "Bonjour" });
    setLocale("fr");
    expect(t("greeting")).toBe("Bonjour");
  });

  it("supports variable interpolation", () => {
    loadMessages("fr", { hello: "Bonjour {name}" });
    setLocale("fr");
    expect(t("hello", { name: "Karim" })).toBe("Bonjour Karim");
  });

  it("resolves nested keys", () => {
    loadMessages("fr", { auth: { login: "Connexion" } } as Record<string, unknown>);
    setLocale("fr");
    expect(t("auth.login")).toBe("Connexion");
  });
});
