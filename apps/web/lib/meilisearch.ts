import { Meilisearch } from "meilisearch";

export const meili = new Meilisearch({
  host: process.env.MEILISEARCH_URL || "http://65.21.89.105:7702",
  apiKey: process.env.MEILISEARCH_KEY || "doktori_ms_key_2026",
});

export const DOCTORS_INDEX = "doctors";
