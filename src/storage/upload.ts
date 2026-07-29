import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'node:fs';
import { s3 } from './minio.js';

export async function uploadFile(filePath: string, objectKey: string) {
  const stream = fs.createReadStream(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: "vercel",
    Key: objectKey,
    Body: stream,
  })
  );
}
