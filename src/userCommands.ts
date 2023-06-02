import { ContextActionResponse } from "@devvit/public-api";

import { Metadata } from "@devvit/protos";

import { appName, reddit } from "./main.js";
import { ReportError } from "./utility.js";





type UserCommand = {
  prompt: string;
  description: string;
  codeformat: boolean;
};

interface CommandDictionary {
  [name: string]: UserCommand;
}

type ParsedCommandResult =
  | { type: "command"; prompt: string; codeformat: boolean }
  | { type: "help" }
  | { type: "invalid"; invalidCommand: string }
  | { type: "none" };

export function parseCommand(body: string): ParsedCommandResult {
  // Remove leading and trailing white spaces
  body = body.trim();

  // Check if the comment starts with "!"
  if (!body.startsWith("!")) {
    return { type: "none" };
  }

  // Extract the command
  let command = body.split(" ")[0].slice(1).toUpperCase();

  if (command === "HELP") {
    return { type: "help" };
  }

  // Check if the command is in the dictionary
  if (command in commands) {
    return {
      type: "command",
      prompt: commandCommonBoilerplate + commands[command].prompt,
      codeformat: commands[command].codeformat,
    };
  } else {
    return { type: "invalid", invalidCommand: command };
  }
}

export function createCommandListMessage(): string {
  // Start with a friendly, casual intro message
  let message =
    "Hey. Here's a list of commands you can use in this subbreddit. Simply type '!' before the command name (case doesn't matter). Have fun!\n\n";

  // add the help command to the message
  message += `* !help --- This message.`;

  // Now add each command to the message
  for (let name in commands) {
    let command = commands[name];
    message += `* !${name.toLocaleLowerCase()} --- ${command.description}\n`;
  }

  // Return the constructed message
  return message;
}

//Handlers
export async function sendUserCommandHelpMessage(
  metadata: Metadata | undefined
): Promise<ContextActionResponse>
{
  try {
    const currentUser = await reddit.getCurrentUser(metadata);

    const messageBody = createCommandListMessage();

    await reddit.sendPrivateMessage(
      {
        to: currentUser.username,
        subject: "Usage Stats",
        text: messageBody,
      },
      metadata
    );

    return {
      success: true,
      message: `${appName}: Command list PMed to you!`,
    };
  } catch (error) {
    return ReportError(error);
  }
}




//The user commands.  TODO: Figure out a good way to make these defaults edittable in settings
const commandCommonBoilerplate =
  "You will be prompted with a comment from reddit. ";

const commands: CommandDictionary = {
  ELI5: {
    prompt:
      "Tersely, explain the comment, using ELI5 techniques, as a patient teacher would.  If the comment doesn't contain concepts that need explaining, explain it anyway, using humor in an ELI5-ish way.",
    description: "Explains like you're five.",
    codeformat: false,
  },

  TLDR: {
    prompt:
      "Summarize the main points of the comment as consicely as possible in the style of TLDR. If it's already a short comment, use humor when you make it shorter.",
    description: "Summarizes a comment.",
    codeformat: false,
  },

  UNSLANG: {
    prompt:
      "Translate any idioms, slang, or culturally specific references in the comment into plain language. If there's no slang or idioms in the comment, humorously pretend that there is anyway, and explain something as if it were slang.",
    description:
      "Translates idioms, slang, and cultural references into plain language.",
    codeformat: false,
  },

  ARGUE: {
    prompt:
      "Play devil's advocate, and attempt to refute the points in the comment. Be brief and to the point! If the comment doesn't contain any salient arguments to refute, refute the post anyway, using humor.",
    description:
      "Attempts to argue against the points brought up in the comment.",
    codeformat: false,
  },

  IDEA: {
    prompt:
      "Provide a creative and unexpected insight or innovative idea related to the comment's theme. Be brief and highly creative!",
    description: "Generates a unique idea or insight based on the comment.",
    codeformat: false,
  },

  HAIKU: {
    prompt:
      "Use that comment as inspiration to write a relevant haiku. Only output a haiku, and nothing else.",
    description: "Writes a haiku inspired by the themes of the comment.",
    codeformat: true,
  },
  LIMERICK: {
    prompt:
      "Use that comment as inspiration to write a relevant limerick. Only output a limerick, and nothing else.",
    description: "Writes a limerick inspired by the themes of the comment.",
    codeformat: true,
  },

  KOAN: {
    prompt:
      "Use the themes or content of the comment to create a short and enigmatic Zen koan. Be poetic!",
    description: "Creates a Zen koan inspired by the comment.",
    codeformat: false,
  },

  DAD: {
    prompt:
      "Use that comment as inspiration to write a relevant dad joke. Only output a dad joke, and nothing else.",
    description: "Writes a dad joke inspired by the themes of the comment.",
    codeformat: false,
  },
  WAR40K: {
    prompt:
      "Briefly respond to that comment as if you were a fervently loyal Space Marine from Warhammer 40K, with one to three sentences.",
    description: "Provides a Space Marine perspective on things.",
    codeformat: false,
  },
  CHAOS40K: {
    prompt:
      "Briefly respond to that comment as if you were warp-addled Chaos Space Marine from Warhammer 40K, with one to three sentences.",
    description: "Provides a Chaos Space Marine perspective on things.",
    codeformat: false,
  },

  GUNGAN: {
    prompt:
      "Rewrite that comment to Gungan-speak, as if Jar-Jar from Star Wars wrote it.",
    description: "Jar-Jar Binks a comment.",
    codeformat: false,
  },

  DRACO: {
    prompt:
      "Briefly respond to that comment as if you were Draco Malfoy from Harry Potter.",
    description: "Gives a Draco Malfoy perspective.",
    codeformat: false,
  },

  SHERLOCK: {
    prompt:
      "Analyze the comment as if you were Sherlock Holmes, offering a detailed, insightful, and possibly surprising observation. Be concise!",
    description: "Sherlock Holmes analyzes the comment.",
    codeformat: false,
  },

  EMOJI: {
    prompt: "Express the main idea of the comment solely using emojis.",
    description: "Converts comment into emojis.",
    codeformat: false,
  },

  HEADLINE: {
    prompt: "Suggest a single a sensational tabloid headline for that comment.",
    description: "Titles a comment with a tabloid headline.",
    codeformat: false,
  },
};
