import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

/**
 * Delete an object from R2 by its full storage key (including the "doktori/" prefix).
 *
 * Production: issues a DeleteObject command to Cloudflare R2.
 * Dev (no R2 creds): attempts to remove the corresponding local file; errors are
 * silently ignored (file may not exist).
 *
 * The caller should pass the key as stored (e.g. "doktori/cabinet-photos/…/uuid.jpg").
 * If you only have the public URL, strip the PUBLIC_URL prefix first.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (s3) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return;
  }

  // Local dev fallback — remove from public/uploads
  // key is "doktori/<relative-path>"; strip the leading "doktori/" prefix
  const relativePart = key.startsWith("doktori/") ? key.slice("doktori/".length) : key;
  const localPath = path.join(process.cwd(), "public", "uploads", "doktori", relativePart);
  await fs.unlink(localPath).catch(() => {
    // Ignore — file may not exist in local dev
  });
}
