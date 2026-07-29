import { Queue } from 'bullmq';
import { connection } from './connection.js';

export const deploymentQueue = new Queue("deployments", {
  connection,
});
