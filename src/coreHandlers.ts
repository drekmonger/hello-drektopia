import {
  ContextActionResponse,
  PostContextActionEvent,
  CommentContextActionEvent,
} from "@devvit/public-api";
import { Metadata, CommentSubmit } from "@devvit/protos";

import {appName, kv, reddit, ReportError, chanceTrue } from "./common.js";
import { getValidatedSettings } from "./configurationSettings.js";
import { generateAIResponse } from "./generateAIResponse.js";
import { handleCommands } from "./userCommands.js";

export async function blockReplyingAction(
  event: PostContextActionEvent,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    const postId = "t3_" + event.post.id;

    if (typeof postId === "undefined") {
      throw new Error("Unable to get postID.");
    }

    const noAIposts = (await kv.get("noAIposts", metadata)) as {
      [postId: string]: boolean;
    } | null;

    // If the 'noAIposts' object doesn't exist yet, create it
    if (!noAIposts) {
      await kv.put("noAIposts", { [postId]: true });
    }

    // If it does exist, add the new post to it
    else {
      noAIposts[postId] = true;
      await kv.put("noAIposts", noAIposts);
    }

    return {
      success: true,
      message: `${appName} will refuse to comment within this post.`,
    };
  } catch (error) {
    return ReportError(error);
  }
}

export async function handleCreateAICommentAction(
  event: CommentContextActionEvent,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    const settings = await getValidatedSettings(metadata);

    const commentID = "t1_" + event.comment?.id;

    const comment = await reddit.getCommentById(commentID, metadata);

    await generateAIResponse({
      replyTargetId: commentID,
      thingToRead: comment,
      systemPrompt: settings.prompt,
      formatResponse: false,
      metadata,
      settings,
    });
    return {
      success: true,
      message: "Posted AI generated comment upon moderator request.",
    };
  } catch (error) {
    return ReportError(error);
  }
}

export async function handleCommentSubmitTrigger(
  event: CommentSubmit,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    const appUser = await reddit.getAppUser(metadata);
    const commentID = event.comment?.id as string;

    //if the author is the app, bail out
    if (event.author?.id === appUser.id) {
      const message = `${appName} created comment ${commentID}; not going to respond.`;
      console.log(message);
      return { success: true, message };
    }

    const settings = await getValidatedSettings(metadata);

    //check if there were any !commands in the comment
    if (settings.enablecommands) {
      const commandExecuted = await handleCommands(
        event.comment?.body!,
        commentID,
        metadata,
        settings
      );
      if (commandExecuted) {
        const message = `Handled user command in ${commentID}.`;
        console.log(message)
        return { success: true, message: message };
      }
    }

    //check for random chance of posting comment
    if (!chanceTrue(settings.chanceof)) {
      const message = `Ignoring comment: ${commentID} due to random chance of ${settings.chanceof}%.`;
      console.log(message);
      return { success: true, message: message };
    }

    const comment = await reddit.getCommentById(commentID, metadata);

    await generateAIResponse({
      replyTargetId: commentID,
      thingToRead: comment,
      systemPrompt: settings.prompt,
      formatResponse: false,
      metadata,
      settings,
    });

    const message = `Posted an AI generated reply to comment: ${commentID}.`;
    console.log();
    return { success: true, message: message };

  } catch (error) {
    return ReportError(error);
  }
}
