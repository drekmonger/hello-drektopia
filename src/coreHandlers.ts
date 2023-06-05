import {
  ContextActionResponse,
  PostContextActionEvent,
  CommentContextActionEvent,
} from "@devvit/public-api";
import { Metadata, CommentSubmit, PostSubmit } from "@devvit/protos";

import { appName, kv, reddit, ReportError, chanceTrue } from "./common.js";
import { getValidatedSettings } from "./configurationSettings.js";
import { generateAIResponse, formatNOP, formatForSummary } from "./generateAIResponse.js";
import { handleCommands } from "./commands.js";

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

export async function handleSubmitAICommentAction(
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
      formatFunction: formatNOP,
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

export async function handleCommentSubmit(
  event: CommentSubmit,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    const appUser = await reddit.getAppUser(metadata);
    const commentID = event.comment?.id as string;
    const comment = await reddit.getCommentById(commentID, metadata);

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
        comment.body,
        commentID,
        metadata,
        settings
      );
      if (commandExecuted) {
        const message = `Handled user command in ${commentID}.`;
        console.log(message);
        return { success: true, message: message };
      }
    }

    //check if comment should be summarized
    if (
      settings.enablesummarizationforcomments &&
      event.comment!.body.length >= settings.summarizationthreshold
    ) {
      await generateAIResponse({
        replyTargetId: commentID,
        thingToRead: comment,
        systemPrompt: summerizationPrompt,
        formatFunction: formatForSummary,
        metadata,
        settings,
      });
      const message = `Summarized ${commentID}.`;
        console.log(message);
        return { success: true, message: message };
    }

    //check for random chance of submitting comment
    if (chanceTrue(settings.chanceof)) {
      await generateAIResponse({
        replyTargetId: commentID,
        thingToRead: comment,
        systemPrompt: settings.prompt,
        formatFunction: formatNOP,
        metadata,
        settings,
      });

      const message = `Posted an AI generated reply to comment: ${commentID}.`;
      console.log(message);
      return { success: true, message: message };
    }

    //no action taken
    const message = `No action taken on comment: ${commentID}.`;
    console.log(message);
    return { success: true, message: message };
  } catch (error) {
    return ReportError(error);
  }
}

export async function handlePostSubmit(
  event: PostSubmit,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    //check if post has a body
    if (event.post?.selftext == undefined || event.post?.selftext === "") {
      return {
        success: true,
        message: `Post ${event.post!.id} has no body to consider.`,
      };
    }

    const body = event.post!.selftext;
    const post = await reddit.getPostById(event.post!.id, metadata); //generateAIReponse expects postV1 right now

    const settings = await getValidatedSettings(metadata);

    //check if post should be summerized
    if (
      settings.enablesummarizationforposts &&
      body.length >= settings.summarizationthreshold
    ) {
      await generateAIResponse({
        replyTargetId: event.post!.id,
        thingToRead: post,
        systemPrompt: summerizationPrompt,
        formatFunction: formatForSummary,
        metadata,
        settings,
      });
    }

    //no action taken
    const message = `No action taken on post: ${event.post!.id}.`;
    console.log(message);
    return { success: true, message: message };
  } catch (error) {
    return ReportError(error);
  }
}

const summerizationPrompt =
  "You will be prompted with a body of text. Summerize this text as best you can down to a single paragraph.";
