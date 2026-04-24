import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";

const HAS_R2 =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY;

const s3 = HAS_R2
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

const BUCKET = process.env.R2_BUCKET_NAME || "dartank-images";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Upload a file.
 *
 * Production: Cloudflare R2 via S3 API. Returns a public R2 URL.
 * Dev (no R2 creds): writes to `apps/web/public/uploads/doktori/<key>` and
 * returns a relative URL served by Next.js. Keeps local dev friction-free.
 *
 * The "doktori/" prefix namespaces this app inside the shared bucket.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const fullKey = `doktori/${key}`;

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fullKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${PUBLIC_URL}/${fullKey}`;
  }

  // Local dev fallback — write to public/uploads so Next.js serves it
  const publicDir = path.join(process.cwd(), "public", "uploads", "doktori");
  const target = path.join(publicDir, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return `/uploads/doktori/${key}`;
}
