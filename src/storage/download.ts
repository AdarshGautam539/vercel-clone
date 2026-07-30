import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from './minio.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const BUCKET = "vercel";
const TEMP_DIR = "tmp";

export async function listDeploymentObjects(deploymentId: string) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${deploymentId}/`,
  });
  const response = await s3.send(command);

  return response.Contents ?? [];
}

async function downloadObject(key: string, destination: string) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
  if (!response.Body) {
    throw new Error(`No body returned for object: ${key}`);
  }
  await fs.mkdir(path.dirname(destination), {
    recursive: true,
  });
  const bytes = await response.Body.transformToByteArray();
  await fs.writeFile(destination, bytes);
}

async function runWithLimit<T>(concurrency: number, items: T[], fn: (item: T) => Promise<any>) {
  const promises: Promise<any>[] = [];
  const executing: Promise<any>[] = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    promises.push(p);
    const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(promises);
}

export async function downloadDeployment(deploymentId: string): Promise<string> {
  const deploymentPath = path.join(
    TEMP_DIR,
    deploymentId
  );

  await fs.mkdir(deploymentPath, {
    recursive: true,
  });

  const objects = await listDeploymentObjects(deploymentId);

  await runWithLimit(5, objects, async (object) => {
    if (!object.Key) return;
    const relativePath = object.Key.replace(`${deploymentId}/`, "");
    const destination = path.join(deploymentPath, relativePath);
    await downloadObject(object.Key, destination);
  });

  return deploymentPath;
}
