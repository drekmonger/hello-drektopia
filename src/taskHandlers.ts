import {
  SubredditContextActionEvent,
  ContextActionResponse,
} from "@devvit/public-api";

import { Metadata } from "@devvit/protos";

import { getValidatedSettings } from "./configurationSettings.js";
import { ReportError } from "./utility.js";
import { Counters, queryCounters } from "./rateLimitCounter.js";
import { appName, kv, reddit } from "./main.js";


export async function usageReportHandler(
  _: SubredditContextActionEvent,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    const settings = await getValidatedSettings(metadata);

    const currentUser = await reddit.getCurrentUser(metadata);

    const counters = (await queryCounters(kv, metadata)) as Counters;

    const messageBody = `**Requested usage report from ${appName}:**
  
        * Uses this hour: ${counters[0]} -- Max per hour: ${settings.maxhour}
        * Uses today: ${counters[1]} -- Max per day: ${settings.maxday}
        * Lifetime uses: ${counters[2]}
        `;

    await reddit.sendPrivateMessage(
      {
        to: currentUser.username,
        subject: "Usage Stats",
        text: messageBody,
      },
      metadata
    );

    return { success: true, message: "Sent usage report." };
  } catch (error) {
    return ReportError(error);
  }
}
