import { Metadata } from "@devvit/protos";
import { RedditContent } from "./RedditContentType.js";
import { reddit, appName } from "./main.js";

//Utility functions
export function chanceTrue(percentage: number): boolean {
  if (percentage < 0 || percentage > 100) {
    throw new Error(
      "Chance of posting in configuration settings must be between 0 and 100."
    );
  }
  return Math.random() * 100 < percentage;
}

export async function getPreviousThing(
  commentID: string,
  metadata: Metadata | undefined
): Promise<RedditContent> {
  const parentId = (await reddit.getCommentById(commentID, metadata)).parentId;

  if (parentId.slice(0, 2) === "t1") {
    return await reddit.getCommentById(parentId, metadata);
  }

  return await reddit.getPostById(parentId, metadata);
}

export function ReportError(error: unknown) {
  const e = error as Error;
  const message = `${appName} Error: + ${e.message}`;
  console.log(message);
  return { success: false, message: message };
}

