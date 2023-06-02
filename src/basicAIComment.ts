import {
  ContextActionResponse,
  PostContextActionEvent,
  CommentContextActionEvent
} from "@devvit/public-api";
import { Metadata } from "@devvit/protos";
import { ReportError } from "./utility.js";
import { appName, kv, reddit } from "./main.js";
import { getValidatedSettings } from "./configurationSettings.js";
import { replyWithAIGeneratedComment } from "./replyWithAIGeneratedComment.js";

export async function blockAICommentsHandler(
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
      message: `${appName}: Will refuse to comment within this post.`,
    };
  } catch (error) {
    return ReportError(error);
  }
}

export async function createCommentHandler(
    event: CommentContextActionEvent,
    metadata: Metadata | undefined
  ): Promise<ContextActionResponse> {
    
        try {
          const settings = await getValidatedSettings(metadata);
    
          const commentID = "t1_" + event.comment?.id;
    
          const comment = await reddit.getCommentById(commentID, metadata);
    
          await replyWithAIGeneratedComment({
            commentID,
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
  
