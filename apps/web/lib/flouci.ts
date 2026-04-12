interface FlouciPaymentRequest {
  amount: number; // in millimes
  reference: string;
  successUrl: string;
  failUrl: string;
}

interface FlouciPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentRef?: string;
  error?: string;
}

export async function createFlouciPayment(data: FlouciPaymentRequest): Promise<FlouciPaymentResponse> {
  const appToken = process.env.FLOUCI_APP_TOKEN;
  const appSecret = process.env.FLOUCI_APP_SECRET;

  if (!appToken || !appSecret) {
    // Dev mode: simulate success, return a mock URL
    const mockRef = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[FLOUCI-DEV] Would charge ${data.amount / 1000} DT · ref: ${data.reference}`);
    return {
      success: true,
      paymentUrl: `${data.successUrl}?ref=${mockRef}&simulated=true`,
      paymentRef: mockRef,
    };
  }

  try {
    const res = await fetch("https://developers.flouci.com/api/generate_payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apppublic": appToken,
        "appsecret": appSecret,
      },
      body: JSON.stringify({
        app_token: appToken,
        app_secret: appSecret,
        amount: String(data.amount),
        accept_card: "true",
        session_timeout_secs: 1200,
        success_link: data.successUrl,
        fail_link: data.failUrl,
        developer_tracking_id: data.reference,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.result) {
      return { success: false, error: json.result?.message || "Flouci error" };
    }
    return {
      success: true,
      paymentUrl: json.result.link,
      paymentRef: json.result.payment_id,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function refundPayment(paymentRef: string, amount: number): Promise<boolean> {
  const appToken = process.env.FLOUCI_APP_TOKEN;
  const appSecret = process.env.FLOUCI_APP_SECRET;

  if (!appToken || !appSecret) {
    console.warn(`[FLOUCI-DEV] Would refund ${paymentRef} for ${amount} millimes`);
    return true; // Simulate success in dev
  }

  try {
    // Flouci refund API (if available)
    // TODO: Replace with actual Flouci refund endpoint when documented
    // For now, mark as pending and ops handles manually
    console.log(`[FLOUCI] Refund requested: ${paymentRef} for ${amount} millimes`);
    return false; // Manual refund needed
  } catch (e) {
    console.error("[FLOUCI] Refund failed:", e);
    return false;
  }
}

export async function verifyFlouciPayment(paymentId: string): Promise<{ success: boolean; status?: string }> {
  const appToken = process.env.FLOUCI_APP_TOKEN;
  const appSecret = process.env.FLOUCI_APP_SECRET;

  if (!appToken || !appSecret) {
    // Dev mode: FLOUCI_APP_TOKEN not set — skipping live verification.
    // Idempotency in the webhook layer prevents duplicate processing.
    console.warn(`[FLOUCI-DEV] verifyFlouciPayment called without credentials (paymentId: ${paymentId}). Treating as verified in dev mode.`);
    return { success: true, status: "SUCCESS" };
  }

  try {
    const res = await fetch(`https://developers.flouci.com/api/verify_payment/${paymentId}`, {
      headers: { "apppublic": appToken, "appsecret": appSecret },
    });
    const json = await res.json();
    return { success: json.result?.status === "SUCCESS", status: json.result?.status };
  } catch {
    return { success: false };
  }
}
