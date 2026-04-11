interface PaymeeRequest {
  amount: number; // in millimes
  reference: string;
  successUrl: string;
  failUrl: string;
  customerEmail: string;
}

export async function createPaymeePayment(data: PaymeeRequest): Promise<{ success: boolean; paymentUrl?: string; paymentRef?: string; error?: string }> {
  const apiKey = process.env.PAYMEE_API_KEY;

  if (!apiKey) {
    // Dev mode
    const mockRef = `PM-DEV-${Date.now()}`;
    return {
      success: true,
      paymentUrl: `${data.successUrl}?ref=${mockRef}&simulated=true`,
      paymentRef: mockRef,
    };
  }

  try {
    const res = await fetch("https://app.paymee.tn/api/v2/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        amount: data.amount / 1000, // Paymee wants DT
        note: data.reference,
        return_url: data.successUrl,
        cancel_url: data.failUrl,
        email: data.customerEmail,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.data) return { success: false, error: json.message || "Paymee error" };
    return {
      success: true,
      paymentUrl: json.data.payment_url,
      paymentRef: json.data.token,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
