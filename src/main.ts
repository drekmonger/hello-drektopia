import {
  Context,
  Devvit,
  RedditAPIClient,
  UserContext,
  KeyValueStorage,
} from "@devvit/public-api";

import { Metadata } from "@devvit/protos";

import {
  AppSettings,
  setupSettings,
  getValidatedSettings,
} from "./configurationSettings.js";

import {
  rateLimitCounterInstall as installRateLimitCounter,
  resetHourlyCounter,
  usageReportHandler as usageReport,
  resetCountersHandler as resetCounters,
} from "./rateLimitCounter.js";

import { blockReplyingToPost, handleCreateAICommentAction, handleCommentSubmit } from "./coreHandlers.js";
import {
  handleRequestHelpAction,
} from "./userCommands.js";
import { generateAIResponse } from "./generateAIResponse.js";

import { getPreviousThing, chanceTrue, ReportError } from "./commonUtility.js";

export const appName: string = "Hello-drektopia";

//App Setup
Devvit.use(Devvit.Types.HTTP);
export const reddit = new RedditAPIClient();
export const kv = new KeyValueStorage();

Devvit.addSettings(setupSettings());

Devvit.addTrigger({
  event: Devvit.Trigger.AppInstall,
  handler: async (_, metadata) => installRateLimitCounter(metadata),
});

Devvit.addSchedulerHandler({
  type: "reset_hourly_counter",
  handler: async (_, metadata) => resetHourlyCounter(kv, metadata),
});

//Usage report -- moderation subreddit action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MODERATOR,
  name: `${appName} Usage Report`,
  description:
    "Sends the user a private message reporting the current usage stats.",
  handler: async (_, metadata) => usageReport(metadata),
});

//Usage reset -- moderator subreddit action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MODERATOR,
  name: `${appName} Reset Usage Counter`,
  description: "Resets the daily and hourly counters to 0.",
  handler: async (_, metadata) => resetCounters(metadata),
});

//Block AI comments on a post -- moderator post action
Devvit.addAction({
  context: Context.POST,
  userContext: UserContext.MODERATOR,
  name: `${appName} Block AI comments here`,
  description:
    "Sets a flag that prevents the application from posting comments on a chosen post.",
  handler: async (event, metadata) => blockReplyingToPost(event, metadata),
});

//Create an AI generated comment -- moderator comment action
Devvit.addAction({
  context: Context.COMMENT,
  userContext: UserContext.MODERATOR,
  name: `${appName} AI Reply`,
  description: "Reply to comment with an AI generated message",
  handler: async (event, metadata) => handleCreateAICommentAction(event, metadata),
});

//Send user command list via private message -- user subreddit action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MEMBER,
  name: `${appName} Get a list of commands`,
  description: "Mssages the user with a list of commands",
  handler: async (_, metadata) => handleRequestHelpAction(metadata),
});

//When a new comment appears on sub, check for summerization, user commands, random chance -- comment trigger
Devvit.addTrigger({
  event: Devvit.Trigger.CommentSubmit,
  handler: async (event, metadata) => handleCommentSubmit(event, metadata)
});

//Summarize long posts -- post trigger TODO



//

export default Devvit;
