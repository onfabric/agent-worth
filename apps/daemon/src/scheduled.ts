import { createDaemonContext } from "./runtime/context";
import { syncOnce } from "./runtime/sync";

export default {
  async scheduled(controller: Bun.CronController) {
    const context = createDaemonContext();
    await syncOnce(context, {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime
    });
  }
};

