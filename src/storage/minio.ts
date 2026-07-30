import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",

  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },

  forcePathStyle: true,
});

export async function ensureBucketExists(bucketName: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`Bucket "${bucketName}" already exists.`);
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket "${bucketName}" does not exist. Creating...`);
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" created successfully.`);
      } catch (createErr) {
        console.error(`Failed to create bucket "${bucketName}":`, createErr);
        throw createErr;
      }
    } else {
      console.error(`Error checking bucket "${bucketName}":`, err);
      throw err;
    }
  }
}
