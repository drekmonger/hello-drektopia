import { ContextActionResponse } from "@devvit/public-api";
import { Metadata } from "@devvit/protos";

import { appName, reddit, ReportError, getPreviousThing } from "./common.js";
import { AppSettings } from "./configurationSettings.js";
import {
  generateAIResponse,
  formatNOP,
  formatForCodeBlock,
} from "./generateAIResponse.js";
import { specialCommands, SpecialCommandFunc } from "./commandsSpecial.js";
import { commands } from "./commandsUser.js";

type ParsedCommandResult =
  | { type: "usercommand"; prompt: string; codeformat: boolean }
  | { type: "specialcommand"; func: SpecialCommandFunc }
  | { type: "invalid"; invalidCommand: string }
  | { type: "none" };

export function parseCommand(body: string): ParsedCommandResult {
  const commandCommonBoilerplate =
    "You will be prompted with a comment from reddit. ";

  // Remove leading and trailing white spaces
  body = body.trim();

  // Check if the comment starts with "!"
  if (!body.startsWith("!")) {
    return { type: "none" };
  }

  // Extract the command
  let command = body.split(" ")[0].slice(1).toUpperCase();

  // Check if the command is in the special command dictionary
  if (command in specialCommands) {
    return {
      type: "specialcommand",
      func: specialCommands[command].specialcommandFunction,
    };
  }

  // Check if the command is in the user command dictionary
  if (command in commands) {
    return {
      type: "usercommand",
      prompt: commandCommonBoilerplate + commands[command].prompt,
      codeformat: commands[command].codeformat,
    };
  } else {
    return { type: "invalid", invalidCommand: command };
  }
}

export function helpText(): string {
  // Start with a friendly intro message
  let message =
    "Hey. Here's a list of commands you can use in this subbreddit. Type '!' before the command name (case doesn't matter). Have fun!\n\n";

  // Add each special command to the message
  for (let name in specialCommands) {
    message += `* !${name.toLocaleLowerCase()} --- ${
      specialCommands[name].description
    }\n`;
  }

  // Add each user command to the message
  for (let name in commands) {
    message += `* !${name.toLocaleLowerCase()} --- ${
      commands[name].description
    }\n`;
  }

  return message;
}

//Handlers
export async function handleRequestHelpAction(
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  try {
    await reddit.sendPrivateMessage(
      {
        to: (await reddit.getCurrentUser(metadata)).username,
        subject: `Commands for ${appName}`,
        text: helpText(),
      },
      metadata
    );

    return {
      success: true,
      message: `${appName}: Command list has been sent via private message.`,
    };
  } catch (error) {
    return ReportError(error);
  }
}

export async function handleCommands(
  body: string,
  commentID: string,
  metadata: Metadata | undefined,
  settings: AppSettings
): Promise<ContextActionResponse> {

  let parsedCommand = parseCommand(body);

  switch (parsedCommand.type) {
    case "usercommand":
      console.log(
        `Attempting reply with AI generated post to comment: ${commentID} in response to a !command.`
      );

      const thingToSend = await getPreviousThing(commentID, metadata);

      await generateAIResponse({
        replyTargetId: commentID,
        thingToRead: thingToSend,
        systemPrompt: parsedCommand.prompt,
        formatFunction: parsedCommand.codeformat
          ? formatForCodeBlock
          : formatNOP,
        metadata,
        settings,
      });

      const message = `Posted an AI generated reply to comment ${commentID} in response to a user !command.`
      console.log(message)

      return { success: true, message: message };

    case "specialcommand":
      const result = await parsedCommand.func(
        body,
        commentID,
        settings,
        metadata
      );
      if ((result.success = true)) {
        console.log(result.message);
      }

      return result;

    case "invalid":
      // Do absolutely nothing.
      return { success: true, message: "Invalid command." };

    case "none":
      // Do nothing, and allow the next check to occur
      return { success: false, message: "" };
  }
}
