import { Comment, Post } from "@devvit/public-api";

export type RedditContent = Comment | Post;
export function isComment(obj: RedditContent): obj is Comment {
  return (obj as Comment).postId !== undefined;
}
