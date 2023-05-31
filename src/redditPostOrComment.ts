import { Comment, Post } from '@devvit/public-api';

export type redditPostOrComment = Comment | Post;
export function isComment(obj: redditPostOrComment): obj is Comment {
  return (obj as Comment).postId !== undefined;
}
