import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock Stripe SDK before importing lib/stripe.ts
const mockCreate = vi.fn();
const mockConstructEvent = vi.fn();
const mockRefundsCreate = vi.fn();
vi.mock("stripe", () => {
  // Use a class so `new Stripe(...)` works.
  class MockStripe {
    checkout = { sessions: { create: mockCreate } };
    webhooks = { constructEvent: mockConstructEvent };
    refunds = { create: mockRefundsCreate };
  }
  return { default: MockStripe };
});

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

const stripeLib = await import("./stripe");
const { createCheckoutSession, verifyWebhookSignature, refundPayment, _resetStripeClientForTests } = stripeLib;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStripeClientForTests();
});

describe("createCheckoutSession", () => {
  it("creates a session with TND amount + appointment metadata", async () => {
    mockCreate.mockResolvedValueOnce({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const result = await createCheckoutSession({
      appointmentId: "appt-123",
      amount: 50000,
      currency: "tnd",
      customerEmail: "patient@example.com",
      description: "Téléconsultation Dr X",
      successUrl: "https://doktori.tn/rdv/123/success",
      cancelUrl: "https://doktori.tn/rdv/123/cancel",
    });
    expect(result).toEqual({ sessionId: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: "payment",
      metadata: { appointmentId: "appt-123" },
      customer_email: "patient@example.com",
    }));
  });

  it("throws if Stripe returns no URL", async () => {
    mockCreate.mockResolvedValueOnce({ id: "cs_test_2", url: null });
    await expect(createCheckoutSession({
      appointmentId: "a",
      amount: 1,
      currency: "tnd",
      customerEmail: "a@b.com",
      description: "x",
      successUrl: "x",
      cancelUrl: "y",
    })).rejects.toThrow("Stripe did not return a checkout URL");
  });
});

describe("verifyWebhookSignature", () => {
  it("returns the parsed event when signature is valid", () => {
    const fakeEvent = { id: "evt_1", type: "checkout.session.completed", data: { object: {} } };
    mockConstructEvent.mockReturnValueOnce(fakeEvent);
    const result = verifyWebhookSignature("body", "sig");
    expect(result).toEqual(fakeEvent);
    expect(mockConstructEvent).toHaveBeenCalledWith("body", "sig", "whsec_dummy");
  });

  it("propagates errors from Stripe.webhooks.constructEvent", () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
    expect(() => verifyWebhookSignature("body", "bad-sig")).toThrow("Invalid signature");
  });
});

describe("refundPayment", () => {
  it("calls stripe.refunds.create with the charge id", async () => {
    mockRefundsCreate.mockResolvedValueOnce({ id: "re_1", charge: "ch_1" });
    const result = await refundPayment("ch_1");
    expect(result).toEqual({ id: "re_1", charge: "ch_1" });
    expect(mockRefundsCreate).toHaveBeenCalledWith({ charge: "ch_1" });
  });
});

describe("getStripeClient", () => {
  it("throws if STRIPE_SECRET_KEY is missing", async () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    _resetStripeClientForTests();
    await expect(import("./stripe").then(m => m.getStripeClient())).rejects.toThrow("STRIPE_SECRET_KEY is not set");
    process.env.STRIPE_SECRET_KEY = original;
  });
});
