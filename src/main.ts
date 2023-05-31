import { Context, Devvit, RedditAPIClient, UserContext, KeyValueStorage } from '@devvit/public-api';
import { Metadata  } from '@devvit/protos';

import { AppSettings, setupSettings } from './configurationSettings.js';
import { handleCounterInstall as counterInstall, resetHourlyCounter, queryCounters, resetCounters, Counters } from './rateLimitCounter.js'
import { parseCommand, createCommandListMessage } from './commands.js';
import { replyWithAIGeneratedComment } from './replyWithAIGeneratedComment.js';
import { getValidatedSettings, getPreviousThing, chanceTrue } from './utility.js';


export const appName: string = "Drektopia-hello"

//App Setup
export const reddit = new RedditAPIClient();
Devvit.use(Devvit.Types.HTTP);
export const kv = new KeyValueStorage();

Devvit.addSettings(setupSettings());

Devvit.addTrigger({
  event: Devvit.Trigger.AppInstall,
  handler: async (_, metadata) => {
    counterInstall(metadata);
  }
});

Devvit.addSchedulerHandler({
  type: "reset_hourly_counter",
  handler: async (_, metadata) => {
    return await resetHourlyCounter(kv, metadata)
  },
});


//Usage report -- moderation action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MODERATOR,
  name: `${appName} Usage Report`,
  description: 'Sends the user a PM reporting the current usage stats.',
  handler: async (_, metadata) => {
    try {

      const settings = await getValidatedSettings(metadata);

      const currentUser = await reddit.getCurrentUser(metadata);

      const counters = await queryCounters(kv, metadata) as Counters;

      const messageBody = `**Requested usage report from ${appName}:**

      * Uses this hour: ${counters[0]} -- Max per hour: ${settings.maxhour}
      * Uses today: ${counters[1]} -- Max per day: ${settings.maxday}
      * Lifetime uses: ${counters[2]}
      `

      await reddit.sendPrivateMessage(
        {
          to: currentUser.username,
          subject: 'Usage Stats',
          text: messageBody,
        },
        metadata
      );

      return { success: true, message: "Sent usage report." };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message };
    }

  }
});

//Usage reset -- moderator action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MODERATOR,
  name: `${appName} Reset Usage Counter`,
  description: 'Resets the daily and hourly counters to 0.',
  handler: async (_, metadata) => {
    try {

      resetCounters(kv, metadata);

      return { success: true, message: `${appName}: reset the hourly and daily usage counters to zero.` };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message: message };
    }

  }
});

//Block posting any comments for a post -- moderation action
Devvit.addAction({
  context: Context.POST,
  userContext: UserContext.MODERATOR,
  name: `${appName} Block AI comments here`,
  description: 'Sets a flag that prevents the application from posting comments on a chosen post.',
  handler: async (event, metadata) => {
    try {

      const postId = "t3_" + event.post.id;

      if ((typeof (postId) === "undefined")) {
        throw new Error("Unable to get postID.")
      }

      const noAIposts = await kv.get('noAIposts', metadata) as { [postId: string]: boolean } | null;


      // If the 'noAIposts' object doesn't exist yet, create it
      if (!noAIposts) {
        await kv.put('noAIposts', { [postId]: true });
      }

      // If it does exist, add the new post to it
      else {
        noAIposts[postId] = true;
        await kv.put('noAIposts', noAIposts);
      }

      return { success: true, message: `${appName}: Will refuse to comment within this post.` };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message: message };
    }

  }
});


//Send command list -- user action
Devvit.addAction({
  context: Context.SUBREDDIT,
  userContext: UserContext.MEMBER,
  name: `${appName} Get a list of commands`,
  description: 'Private messages the user with a list of commands',
  handler: async (_, metadata) => {
    try {

      const currentUser = await reddit.getCurrentUser(metadata);

      const messageBody = createCommandListMessage();

      await reddit.sendPrivateMessage(
        {
          to: currentUser.username,
          subject: 'Usage Stats',
          text: messageBody,
        },
        metadata
      );

      return { success: true, message: `${appName}: Command list PMed to you!` };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message: message };
    }

  }
});


//Comment when requested -- moderator action
Devvit.addAction({
  context: Context.COMMENT,
  userContext: UserContext.MODERATOR,
  name: `${appName} AI Reply`,
  description: 'Reply to the comment with a new post from the AI model',
  handler: async (event, metadata) => {
    try {

      const settings = await getValidatedSettings(metadata);

      const commentID = "t1_" + event.comment?.id;

      const comment = await reddit.getCommentById(commentID, metadata);

      await replyWithAIGeneratedComment({ commentID, thingToConsider: comment, systemText: settings.prompt, formatResponse: false, metadata, settings });
      return { success: true, message: "Posted AI generated comment upon moderator request." };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message: message };
    }

  }
});

//Comment when a new comment appears on sub (check for !commands and random chance) -- comment trigger
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
        console.log(`${appName} created comment ${commentID}; not going to respond.`);
        return { success: true };
      }

      const settings = await getValidatedSettings(metadata);

      //first check if there were any !commands in the comment
      if (settings.enablecommands) {
        const commandExecuted = await handleCommands(event.comment?.body, commentID, metadata, settings);
        if (commandExecuted) {
          return {success: true}
        }
      }

      if (!chanceTrue(settings.chanceof)) {
        console.log(`Ignoring comment: ${commentID} due to random chance of ${settings.chanceof}%.`)
        return { success: true };
      }

      console.log(`Attempting reply with AI generated post to comment: ${commentID} because of a lucky die roll.`)

      const comment = await reddit.getCommentById(commentID, metadata);

      await replyWithAIGeneratedComment({ commentID, thingToConsider: comment, systemText: settings.prompt, formatResponse: false, metadata, settings });

      console.log(`Posted an AI generated reply to comment: ${commentID}.`)
      return { success: true };

    }

    catch (error) {
      const e = error as Error;
      const message = `${appName} Error: + ${e.message}`;
      console.log(message)
      return { success: false, message: message };
    }

  }
});


async function handleCommands(body: string, commentID: string, metadata: Metadata | undefined, settings: AppSettings) : Promise<Boolean> {
  
  let parsedCommand = parseCommand(body);

  switch (parsedCommand.type) {
    case 'command':
      console.log(`Attempting reply with AI generated post to comment: ${commentID} in response to a !command.`);

      const thingToSend = await getPreviousThing(commentID, metadata);

      await replyWithAIGeneratedComment({ commentID, thingToConsider: thingToSend, systemText: parsedCommand.command.prompt, formatResponse: parsedCommand.command.codeformat, metadata, settings });

      console.log(`Posted an AI generated reply to comment ${commentID} in response to a !command.`);

      //don't check for random chance of posting comment after a !command; we're done
      return true;

    case 'help':
      await reddit.submitComment({ id: commentID, text: createCommandListMessage() }, metadata);
      console.log(`Posted help message to comment ${commentID} in response to !help.`);
      return true;

    case 'invalid':
      // Do absolutely nothing.
      return true;

    case 'none':
      // Do nothing, and allow the next check to occur
      return false;

  }
  

}

export default Devvit;