import { downloadDeployment } from '../storage/download.js';
import { execa } from 'execa';
import fs from 'node:fs/promises';

async function installDependencies(projectPath: string) {

  console.log(`Installing dependencies on ${projectPath}`);

  await execa("npm", ["install"], {
    cwd: projectPath,
    stdio: "inherit",
  });
}

async function buildProject(projectPath: string) {

  console.log(`Building project in ${projectPath}`);
  await execa("npm", ["run", "build"], {
    cwd: projectPath,
    stdio: "inherit",
  });
}

export async function buildDeployment(deploymentId: string) {

  const deploymentPath = await downloadDeployment(deploymentId);
  try {
    await installDependencies(deploymentPath);
    await installDependencies(deploymentPath);
    await buildProject(deploymentPath);
    console.log("Build complete");
  } catch (err) {
    console.error("Build failed", err);

    throw err;

  } finally {
    await fs.rm(deploymentPath, {
      recursive: true,
      force: true,
    });

    console.log(`Cleaned up ${deploymentPath}`);
  }
}
