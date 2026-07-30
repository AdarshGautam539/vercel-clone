import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'node:fs/promises';
import { s3 } from './minio.js';

export async function uploadFile(filePath: string, objectKey: string, contentType?: string) {
  const buffer = await fs.readFile(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: "vercel",
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
  })
  );
}
