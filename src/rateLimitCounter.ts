import { ContextActionResponse, Devvit, KeyValueStorage } from "@devvit/public-api";
import { Metadata } from "@devvit/protos";
import { appName, kv, reddit } from "./main.js";
import { getValidatedSettings } from "./configurationSettings.js";
import { ReportError } from "./utility.js";

const scheduler = Devvit.use(Devvit.Types.Scheduler);

const HOUR_KEY = "hourly_count";
const DAY_KEY = "daily_count";
const LIFE_KEY = "lifetime_count";

export async function rateLimitCounterInstall(metadata?: Metadata) {
  try {
    // schedule reset counter every hour
    await scheduler.Schedule(
      { cron: "0 * * * *", action: { type: "reset_hourly_counter" } },
      metadata
    );
  } catch (e) {
    console.log("Error: was not able to schedule:", e);
    throw e;
  }
}

export async function resetHourlyCounter(
  kv: KeyValueStorage,
  metadata?: Metadata
) {
  await kv.put(HOUR_KEY, 0, metadata);
  console.log("Reset hourly usage counter.");

  const currentHour = new Date().getUTCHours(); // Assumes server time is in UTC
  if (currentHour === 0) {
    await kv.put(DAY_KEY, 0, metadata);
    console.log("Reset daily usage.");
  }
}

// Reset the hourly, daily counters
export async function resetCounters(kv: KeyValueStorage, metadata?: Metadata) {
  await kv.put(HOUR_KEY, 0, metadata);
  await kv.put(DAY_KEY, 0, metadata);
}

export type Counters = [
  hourCount: number,
  dailyCount: number,
  lifetimeCount: number
];

export async function queryCounters(
  kv: KeyValueStorage,
  metadata?: Metadata
): Promise<Counters> {
  const hourlyCount = Number((await kv.get(HOUR_KEY, metadata)) || 0);
  const dailyCount = Number((await kv.get(DAY_KEY, metadata)) || 0);
  const lifetimeCount = Number((await kv.get(LIFE_KEY, metadata)) || 0);

  return [hourlyCount, dailyCount, lifetimeCount];
}

export async function isAboveRateLimit(
  kv: KeyValueStorage,
  maxDaily: number,
  maxHourly: number,
  metadata?: Metadata
): Promise<boolean> {
  const hourlyCount = Number((await kv.get(HOUR_KEY, metadata)) || 0);
  const dailyCount = Number((await kv.get(DAY_KEY, metadata)) || 0);

  return hourlyCount > maxHourly && dailyCount > maxDaily;
}

export async function incrementCounters(
  kv: KeyValueStorage,
  metadata?: Metadata
) {
  const hourlyCount = Number((await kv.get(HOUR_KEY, metadata)) || 0);
  const dailyCount = Number((await kv.get(DAY_KEY, metadata)) || 0);
  const lifetimeCount = Number((await kv.get(LIFE_KEY, metadata)) || 0);

  try {
    await kv.put(HOUR_KEY, String(hourlyCount + 1), metadata);
    await kv.put(DAY_KEY, String(dailyCount + 1), metadata);
    await kv.put(LIFE_KEY, String(lifetimeCount + 1), metadata);
  } catch (err) {
    throw Error(`Had a problem updating counters: ${err}`);
    // Retry in case of a conflict
  }
}

//Action handlers
export async function usageReportHandler(
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

export async function resetCountersHandler(
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    resetCounters(kv, metadata);

    return {
      success: true,
      message: `${appName}: reset the hourly and daily usage counters to zero.`,
    };
  } catch (error) {
    return ReportError(error);
  }
}

