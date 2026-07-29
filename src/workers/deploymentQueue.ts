import { Worker } from 'bullmq';
import { connection } from '../queue/connection.js';
import { downloadDeployment } from '../storage/download.js';

const worker = new Worker("deployments", async (job) => {
  console.log("Received job:");
  console.log(job.data);

  const deploymentPath = await downloadDeployment(job.data.deploymentId);
  console.log(deploymentPath);
},
  {
    connection,
  }
);
worker.on("completed", (job) => {
  console.log(`Completed job ${job.id}`);
});
worker.on("failed", (job, err) => {
  console.log(`job ${job?.id} failed`, err);
});
