import { downloadDeployment } from '../storage/download.js';
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllFiles } from '../getAllFiles.js';
import { uploadFile } from '../storage/upload.js';
import { getMimeType } from '../utils.js';

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

async function installDependencies(projectPath: string) {
  console.log(`[BUILD WORKER] Installing dependencies in ${projectPath}`);
  const { stdout } = await execa("npm", ["install"], {
    cwd: projectPath,
  });
  console.log(stdout);
}

async function buildProject(projectPath: string) {
  console.log(`[BUILD WORKER] Building project in ${projectPath}`);
  const { stdout } = await execa("npm", ["run", "build"], {
    cwd: projectPath,
  });
  console.log(stdout);
}

async function uploadBuildArtifacts(deploymentId: string, projectPath: string) {
  const distPath = path.join(projectPath, "dist");
  const distExists = await fs.access(distPath)
    .then(() => true)
    .catch(() => false);

  const uploadSourcePath = distExists ? distPath : projectPath;
  console.log(`[BUILD WORKER] Uploading build artifacts from: ${uploadSourcePath}`);

  const files: string[] = [];
  for await (const filePath of getAllFiles(uploadSourcePath)) {
    files.push(filePath);
  }

  // Upload files in parallel with concurrency limit of 5
  await runWithLimit(5, files, async (filePath) => {
    const relative = path.relative(uploadSourcePath, filePath);
    const mimeType = getMimeType(filePath);
    await uploadFile(filePath, `builds/${deploymentId}/${relative}`, mimeType);
  });
}

export async function buildDeployment(deploymentId: string) {
  const deploymentPath = await downloadDeployment(deploymentId);
  try {
    const packageJsonExists = await fs.access(path.join(deploymentPath, "package.json"))
      .then(() => true)
      .catch(() => false);

    if (packageJsonExists) {
      await installDependencies(deploymentPath);
      await buildProject(deploymentPath);
    } else {
      console.log(`[BUILD WORKER] No package.json found. Treating as static site.`);
    }

    await uploadBuildArtifacts(deploymentId, deploymentPath);
    console.log(`[BUILD WORKER] Build complete for deployment: ${deploymentId}`);
  } catch (err) {
    console.error(`[BUILD WORKER] Build failed for deployment: ${deploymentId}`, err);
    throw err;
  } finally {
    await fs.rm(deploymentPath, {
      recursive: true,
      force: true,
    });
    console.log(`[BUILD WORKER] Cleaned up temporary directory: ${deploymentPath}`);
  }
}
