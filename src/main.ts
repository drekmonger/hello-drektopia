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

import { blockAICommentsHandler as blockAICommentsOnPost, createCommentHandler as createAIComment } from "./basicAIComment.js"


import { sendUserCommandHelpMessage, parseCommand, createCommandListMessage } from "./userCommands.js";
import { replyWithAIGeneratedComment } from "./replyWithAIGeneratedComment.js";


import { getPreviousThing, chanceTrue, ReportError } from "./utility.js";

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
  handler: async (_, metadata) => usageReport(metadata)
});

//Usage reset -- moderator subreddit action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MODERATOR,
  name: `${appName} Reset Usage Counter`,
  description: "Resets the daily and hourly counters to 0.",
  handler: async (_, metadata) => resetCounters(metadata)
});

//Block AI comments on a post -- moderator post action
Devvit.addAction({
  context: Context.POST,
  userContext: UserContext.MODERATOR,
  name: `${appName} Block AI comments here`,
  description:
    "Sets a flag that prevents the application from posting comments on a chosen post.",
  handler: async (event, metadata) => blockAICommentsOnPost(event, metadata)
});

//Create an AI generated comment -- moderator comment action
Devvit.addAction({
  context: Context.COMMENT,
  userContext: UserContext.MODERATOR,
  name: `${appName} AI Reply`,
  description: "Reply to comment with an AI generated message",
  handler: async (event, metadata) => createAIComment (event, metadata)
});

//Send user command list via private message -- user subreddit action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MEMBER,
  name: `${appName} Get a list of commands`,
  description: "Mssages the user with a list of commands",
  handler: async (_, metadata) => sendUserCommandHelpMessage(metadata),
});



//Make a comment when a new comment appears on sub (check for summerization, user commands, random chance) -- comment trigger
Devvit.addTrigger({
  event: Devvit.Trigger.CommentSubmit,
  async handler(event, metadata?: Metadata) {
    try {
      const appUser = await reddit.getAppUser(metadata);
      const commentID = event.comment?.id as string;

      if (event.comment?.body === undefined) {
        throw Error(`Comment body is undefined for ${commentID}`);
      }

      //if the author is the app, bail out
      if (event.author?.id === appUser.id) {
        console.log(
          `${appName} created comment ${commentID}; not going to respond.`
        );
        return { success: true };
      }

      const settings = await getValidatedSettings(metadata);

      //first check if there were any !commands in the comment
      if (settings.enablecommands) {
        const commandExecuted = await handleCommands(
          event.comment?.body,
          commentID,
          metadata,
          settings
        );
        if (commandExecuted) {
          return { success: true };
        }
      }

      if (!chanceTrue(settings.chanceof)) {
        console.log(
          `Ignoring comment: ${commentID} due to random chance of ${settings.chanceof}%.`
        );
        return { success: true };
      }

      console.log(
        `Attempting reply with AI generated post to comment: ${commentID} because of a lucky die roll.`
      );

      const comment = await reddit.getCommentById(commentID, metadata);

      await replyWithAIGeneratedComment({
        commentID,
        thingToRead: comment,
        systemPrompt: settings.prompt,
        formatResponse: false,
        metadata,
        settings,
      });

      console.log(`Posted an AI generated reply to comment: ${commentID}.`);
      return { success: true };
    } catch (error) {
      return ReportError(error);
    }
  },
});

//Summarize long posts -- post trigger TODO

async function handleCommands(
  body: string,
  commentID: string,
  metadata: Metadata | undefined,
  settings: AppSettings
): Promise<Boolean> {
  let parsedCommand = parseCommand(body);

  switch (parsedCommand.type) {
    case "command":
      console.log(
        `Attempting reply with AI generated post to comment: ${commentID} in response to a !command.`
      );

      const thingToSend = await getPreviousThing(commentID, metadata);

      await replyWithAIGeneratedComment({
        commentID,
        thingToRead: thingToSend,
        systemPrompt: parsedCommand.prompt,
        formatResponse: parsedCommand.codeformat,
        metadata,
        settings,
      });

      console.log(
        `Posted an AI generated reply to comment ${commentID} in response to a !command.`
      );

      //don't check for random chance of posting comment after a !command; we're done
      return true;

    case "help":
      await reddit.submitComment(
        { id: commentID, text: createCommandListMessage() },
        metadata
      );
      console.log(
        `Posted help message to comment ${commentID} in response to !help.`
      );
      return true;

    case "invalid":
      // Do absolutely nothing.
      return true;

    case "none":
      // Do nothing, and allow the next check to occur
      return false;
  }
}

//

export default Devvit;
