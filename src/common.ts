import { Metadata } from "@devvit/protos";
import { Comment, KeyValueStorage, Post, RedditAPIClient } from "@devvit/public-api";


//Singletons
export const appName: string = "Hello-drektopia";
export const reddit = new RedditAPIClient();
export const kv = new KeyValueStorage();


//Utility Types
export type RedditContent = Comment | Post;
export function isComment(obj: RedditContent): obj is Comment {
  return (obj as Comment).postId !== undefined;
}


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

