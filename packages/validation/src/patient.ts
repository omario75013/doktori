import { z } from "zod";

export const phoneOtpRequestSchema = z.object({
  phone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro invalide"),
});

export const phoneOtpVerifySchema = z.object({
  phone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro invalide"),
  code: z.string().length(6, "Code à 6 chiffres"),
});
