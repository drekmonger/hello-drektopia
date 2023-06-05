import { Metadata } from "@devvit/protos";
import { helpText } from "./commands.js";



export type SpecialCommandFunc = (body: string, commentID: string, metadata: Metadata | undefined) => Promise<string>;

type SpecialCommand = {
  specialcommandFunction: SpecialCommandFunc;
  description: string;
}

interface SpecialCommandDictionary {
  [name: string]: SpecialCommand;
}

async function composeHelpText(_: string): Promise<string> {
  return helpText();
}


export const specialCommands: SpecialCommandDictionary  = {
    HELP: {
      specialcommandFunction: composeHelpText,
      description: "This message."
    },
    TRANSLATE: {
      specialcommandFunction: composeHelpText,
      description: "Translates into another language. Usage: !Translate [a language]. For example !translate Spanish [or] !translate Klingon"
    }
  }