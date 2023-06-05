import { Metadata } from "@devvit/protos";
import { helpText } from "./commands.js";
import { getPreviousThing, reddit} from "./common.js";
import { formatNOP, generateAIResponse } from "./generateAIResponse.js";
import { AppSettings } from "./configurationSettings.js";
import { ContextActionResponse } from "@devvit/public-api";
import { checkModeration } from "./simpleChatCompletion.js";

export type SpecialCommandFunc = (
  body: string,
  commentID: string,
  settings: AppSettings,
  metadata: Metadata | undefined
) => Promise<ContextActionResponse>;

type SpecialCommand = {
  specialcommandFunction: SpecialCommandFunc;
  description: string;
};

interface SpecialCommandDictionary {
  [name: string]: SpecialCommand;
}

export const specialCommands: SpecialCommandDictionary = {
  HELP: {
    specialcommandFunction: composeHelpText,
    description: "This message.",
  },
  TRANSLATE: {
    specialcommandFunction: translate,
    description:
      "Translates into another language. Usage: !Translate [a language]. For example !translate Spanish [or] !translate Klingon",
  },
};

async function composeHelpText(
  _: string,
  commentId: string,
  __: AppSettings,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  await reddit.submitComment({ id: commentId, text: helpText() }, metadata);

  return { success: true, message: "Submitted help text comment." };
}

async function translate(
  body: string,
  commentID: string,
  settings: AppSettings,
  metadata: Metadata | undefined
): Promise<ContextActionResponse> {
  //extract the desired langauge

  let splitBody = body.split(" ");
  if (splitBody.length > 2) {
    //no second word? No indicated langauge
    return {
      success: true,
      message: "No indicated second langauge for !translate, stopping.",
    };
  }

  const language = splitBody[1];

  if (language.length > 20) {
    return {
      success: true,
      message: "Second word too long for !translate, stopping.",
    };
  }

  const thingToSend = await getPreviousThing(commentID, metadata);

  if (thingToSend.body == undefined || thingToSend.body === "") {
    return {
      success: true,
      message: "Nothing to translate for !translate, stopping.",
    };
  }

  //make sure the language isn't something super rude or hateful
  const isRude = await checkModeration({
    apiKey: settings.key,
    userMessage: language,
  });

  if (isRude) {
    return {
      success: true,
      message:
        "The language selected by a user was an exceptionally rude word for !translate, stopping.",
    };
  }

  await generateAIResponse({
    replyTargetId: commentID,
    thingToRead: thingToSend,
    systemPrompt: makeTranslatePrompt(language),
    formatFunction: formatNOP,
    metadata,
    settings,
  });

  return {
    success: true,
    message: `!Translate command posted AI generated comment in response to ${commentID}.`,
  };
}

function makeTranslatePrompt(language: string): string {
  return `You will be prompted with a comment from reddit. Attempt to translate that comment into this language: ${language}.
  
  The language (${language}) was selected by a reddit user. It might be a real language, a fantasy langauge, or something nonsensical. Try your best anyway! 
  `;
}
