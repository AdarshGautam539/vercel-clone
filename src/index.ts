import Fastify from 'fastify';
import { generate, getMimeType } from './utils.js';
import fastifyCors from '@fastify/cors';
import { simpleGit } from 'simple-git';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllFiles } from './getAllFiles.js';
import { uploadFile } from './storage/upload.js';
import { deploymentQueue } from './queue/deploymentQueue.js';
import { ensureBucketExists } from './storage/minio.js';

const PORT = 3000;
const HOST = '0.0.0.0';
const OUTPUT_DIR = "output";

const app = Fastify({
  logger: true,
});

app.register(fastifyCors);

app.get('/', async (request, reply) => {
  return { hello: 'world' };
});

interface DeployBody {
  repoUrl: string;
}

// Concurrency pool helper
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

app.post<{ Body: DeployBody }>('/deploy', async (request, reply) => {
  const { repoUrl } = request.body;
  if (!repoUrl) {
    return reply.status(400).send({ error: "repoUrl is required" });
  }

  const id = generate();
  const outputPath = path.join(OUTPUT_DIR, id);
  request.log.info({
    repoUrl,
    id,
    path: outputPath,
  });

  const git = simpleGit();
  try {
    await fs.mkdir(OUTPUT_DIR, {
      recursive: true,
    });
    await git.clone(repoUrl, outputPath);

    // Collect all files to upload
    const files: string[] = [];
    for await (const filePath of getAllFiles(outputPath)) {
      files.push(filePath);
    }

    // Upload files in parallel with a concurrency limit of 5
    await runWithLimit(5, files, async (filePath) => {
      const relativePath = path.relative(outputPath, filePath);
      const mimeType = getMimeType(filePath);
      await uploadFile(filePath, `${id}/${relativePath}`, mimeType);
    });

    // Enqueue build job EXACTLY ONCE after all files are successfully uploaded
    await deploymentQueue.add("build", {
      deploymentId: id,
    });

    return reply.status(201).send({
      message: "Repository received",
      repoUrl,
      id,
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(400).send({
      error: "Failed to clone repository or upload files",
    });
  } finally {
    try {
      await fs.rm(outputPath, {
        recursive: true,
        force: true,
      });

      request.log.info(`Cleaned up ${outputPath}`);
    } catch (cleanupErr) {
      request.log.error(cleanupErr);
    }
  }
});

const start = async () => {
  try {
    // Perform startup cleanups
    try {
      await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
      await fs.rm("tmp", { recursive: true, force: true });
      console.log("Purged stale output and tmp directories.");
    } catch (cleanupErr) {
      console.error("Failed to clean directories on startup:", cleanupErr);
    }

    // Ensure bucket exists
    await ensureBucketExists("vercel");

    await app.listen({
      port: PORT,
      host: HOST,
    });
    console.log(`Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
