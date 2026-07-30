import { Worker } from 'bullmq';
import { connection } from '../queue/connection.js';
import { buildDeployment } from '../services/buildService.js';

const worker = new Worker("deployments", async (job) => {
  console.log("Received job:");
  console.log(job.data);

  await buildDeployment(job.data.deploymentId);
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
