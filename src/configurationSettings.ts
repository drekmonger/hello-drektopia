import { getSettings } from "@devvit/public-api";
import { SettingsFormField } from "@devvit/public-api/settings/types.js";
import { Metadata } from "@devvit/protos";

export function setupSettings(): SettingsFormField[] {
  return [
    {
      type: "boolean",
      name: "acceptance",
      label:
        "Click to confirm that your use case conforms with OpenAI and Reddit policies. (Also, you may uncheck this to act like a killswitch, stopping the app from making API calls.)",
    },

    {
      type: "string",
      name: "prompt",
      label: "Enter the system prompt to be sent to GPT:",
    },

    {
      type: "string",
      name: "key",
      label: "API Key:",
    },
    {
      type: "string",
      name: "model",
      label: "Model:  (typically either gpt-4 or gpt-3.5-turbo)",
    },

    {
      type: "number",
      name: "temperature",
      label:
        "Temperature, influences 'creativity' .7 to 1 are sane values. (.8 default): ",
      defaultValue: 0.8,
      onValidate: (event) => {
        if (event.value! > 2 || event.value! < 0) {
          return "Temperature should be between 0 and 2.  .8 is the normal default.";
        }
      },
    },

    {
      type: "number",
      name: "maxhour",
      label: "Maximum API calls per hour: ",
      defaultValue: 3,
      onValidate: (event) => {
        return Validate_Integers(event.value!);
      },
    },

    {
      type: "number",
      name: "maxday",
      label: "Maximum API calls per day: ",
      defaultValue: 9,
      onValidate: (event) => {
        return Validate_Integers(event.value!);
      },
    },

    {
      type: "number",
      name: "maxcharacters",
      label:
        "Maximum character count of comments to reply to (10,000 is the max character count of a reddit comment, which is usually in a ballpark of 2,000 tokens. ChatGPT3.5 has a context length of 4096 tokens. Note, longer inputs means more cost and longer inference. Very long inferences can time out -- 30 seconds max): ",
      defaultValue: 10000,
      onValidate: (event) => {
        return Validate_Integers(event.value!);
      },
    },

    {
      type: "boolean",
      name: "enablesummarizationforposts",
      label: "Enable/Disable watching for long posts to summarize.",
    },

    {
      type: "boolean",
      name: "enablesummarizationforcomments",
      label: "Enable/Disable watching for long comments to summarize.",
    },

    {
      type: "number",
      name: "summarizationthreshold",
      label:
        "Minimum character count of posts/comments to auto-summarize. (10,000 is the max character count of a reddit comment): ",
      defaultValue: 5000,
      onValidate: (event) => {
        return Validate_Integers(event.value!);
      },
    },

    {
      type: "boolean",
      name: "enablecommands",
      label: "Enable/Disable watching for a list of prebuilt !commands.",
    },

    {
      type: "number",
      name: "chanceof",
      label:
        "Percent chance of response to a comment made on the sub (0 to 100) (set to zero to turn this feature off):",
      defaultValue: 0,
      onValidate: (event) => {
        if (event.value! > 100 || event.value! < 0) {
          return "Should be a number 0 to 100, representing 0% to 100% chance.";
        }
      },
    },
  ];
}

function Validate_Integers(n: number): void | string {
  if (n < 0) {
    return "A negative number doesn't make sense here.";
  }
  if (!Number.isInteger(n)) {
    return "Should be an integer.";
  }
}
export interface AppSettings {
  acceptance: boolean;
  model: string;
  prompt: string;
  key: string;
  temperature: number;
  maxhour: number;
  maxday: number;
  maxcharacters: number;
  enablesummarizationforposts: number;
  enablesummarizationforcomments: number;

  enablecommands: boolean;
  chanceof: number;
}
export function isAppSettings(obj: any): obj is AppSettings {
  return obj !== null;

  /* 
  TODO: figure out why this assertation sometimes randomly fails
  TODO: decide what to do when a key is undefined.
  TODO: update this asseration to reflect the current interface
  obj !== null &&
   typeof obj === 'object' &&
   typeof obj.acceptance === 'boolean' &&
   typeof obj.model === 'string' &&
   typeof obj.prompt === 'string' &&
   typeof obj.key === 'string' &&
   typeof obj.temperature === 'number' &&
   typeof obj.maxhour === 'number' &&
   typeof obj.maxday === 'number'  &&
   typeof obj.enablecommands === 'boolean' &&
   typeof obj.chanceof === 'number'
*/
}

export async function getValidatedSettings(metadata: Metadata | undefined) {
  const settings = await getSettings(metadata);

  if (!isAppSettings(settings)) {
    throw new Error(
      "Invalid settings.  Ensure that all of the configuration settings for the app are set correctly."
    );
  }

  if (!settings.acceptance) {
    throw new Error("Check the settings for important configuration details.");
  }

  return settings;
}
