// @ts-expect-error `.open-next/worker.js` entsteht erst beim Build
import { default as nextHandler } from "./.open-next/worker.js";
import { runScheduledJobs } from "./lib/jobs/run";

export default {
  fetch: nextHandler.fetch,

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledJobs(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<CloudflareEnv>;
