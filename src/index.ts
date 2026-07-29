import Fastify from 'fastify';
import { generate } from './utils.ts';
import fastifyCors from '@fastify/cors';
import { simpleGit } from 'simple-git';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllFiles } from './getAllFiles.ts';
import { uploadFile } from './storage/upload.ts';
import { deploymentQueue } from './queue/deploymentQueue.ts';

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

app.post<{ Body: DeployBody }>('/deploy', async (request, reply) => {
  const { repoUrl } = request.body;
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

    for await (const filePath of getAllFiles(outputPath)) {
      const relativePath = path.relative(outputPath, filePath);

      await uploadFile(filePath, `${id}/${relativePath}`);

      await deploymentQueue.add("build", {
        deploymentId: id,
      });
    };
    return reply.status(201).send({
      message: "Repository received",
      repoUrl,
      id,
    });
  } catch (err) {
    request.log.error(err);
    return reply.status(400).send({
      error: "Failed to clone repository",
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
