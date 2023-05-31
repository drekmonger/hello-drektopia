import { getSettings } from '@devvit/public-api';
import { Metadata } from '@devvit/protos';
import { redditPostOrComment } from './redditPostOrComment.js';
import { isAppSettings } from './configurationSettings.js';
import { reddit } from './main.js';

//Utility functions
export function chanceTrue(percentage: number): boolean {
  if (percentage < 0 || percentage > 100) {
    throw new Error("Chance of posting in configuration settings must be between 0 and 100.");
  }
  return Math.random() * 100 < percentage;
}

export async function getPreviousThing(commentID: string, metadata: Metadata | undefined): Promise<redditPostOrComment> {

  const parentId = (await reddit.getCommentById(commentID, metadata)).parentId;

  if (parentId.slice(0, 2) === "t1") {
    return await reddit.getCommentById(commentID, metadata);

  }

  return await reddit.getPostById(parentId, metadata);
}

export async function getValidatedSettings(metadata: Metadata | undefined) {
  const settings = await getSettings(metadata);

  if (!isAppSettings(settings)) {
    throw new Error("Invalid settings.  Ensure that all of the configuration settings for the app are set correctly.");
  }

  if (!settings.acceptance) {
    throw new Error("Check the settings for important configuration details.");
  }

  return settings;

}
