import { getMimeType, isSafeDeploymentPath } from '../utils.js';
import { getObjectStream } from '../storage/download.js';

const deploymentIdPattern = /^[A-Za-z0-9]+$/;

export async function getDeploymentAsset(
  deploymentId: string,
  requestedPath: string
) {
  if (!deploymentIdPattern.test(deploymentId)) {
    const error = new Error("Invalid deployment ID");
    (error as any).statusCode = 400;
    throw error;
  }
  if (!isSafeDeploymentPath(requestedPath)) {
    const error = new Error("Invalid deployment path");
    (error as any).statusCode = 400;
    throw error;
  }
  const filePath = requestedPath || "index.html";
  const objectKey = `builds/${deploymentId}/${filePath}`;

  const { stream, contentLength } = await getObjectStream(objectKey);

  return {
    stream, contentLength, contentType: getMimeType(filePath), objectKey
  };
}
