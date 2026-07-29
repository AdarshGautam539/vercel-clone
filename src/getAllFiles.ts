import fs from 'node:fs/promises';
import path from 'node:path';

export async function* getAllFiles(folderPath: string): AsyncGenerator<string> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {

    if (entry.name === ".git") {
      continue;
    }
    if (entry.name === ".gitignore") {
      continue;
    }
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      yield* getAllFiles(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}
