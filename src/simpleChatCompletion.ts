// Simple ChatGPT API interface, built by GPT4!

export interface ChatCompletionResponse {
  status?: number;
  finish_reason?: string;
  content?: string;
}

const MAX_RETRIES = 2;

export async function simpleChatCompletion({ apiKey, model, systemText, userMessage, temperature }: { apiKey: string; model: string; systemText: string; userMessage: string; temperature: number }): Promise<ChatCompletionResponse> {

  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const body = JSON.stringify({
    model: model,
    temperature: temperature,
    messages: [
      { role: "system", content: systemText },
      { role: "user", content: userMessage },
    ]
  });

  console.log(body);

  let response;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      
      let start = Date.now();

      response = await fetch(apiUrl, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
      });

      let end = Date.now();
      console.log(`[Call to ChatCompletion endpoint resolved in ${end-start} ms]`)

      // since no error is caught by the try, break the loop
      break;

    } catch (error: any) {
      console.log('Fetch error in simpleChatCompletion:', error); // log error message

      // if this was the last attempt or error message is not timeout-related, throw error
      if (i === MAX_RETRIES - 1 || !error.message.includes('context deadline exceeded')) {
        throw new Error('Fetching failed: ' + error);
      }

      // wait a wee bit before retrying
      await new Promise(resolve => setTimeout(resolve, 125));
    }
  }

  if (typeof (response) === "undefined") {
    throw new Error('Response undefined.')
  }

  if (!response.ok) {
    return { status: response.status };
  }

  const data = await response.json();
  const finishReason = data['choices'][0]['finish_reason'];

  if (finishReason === 'content_filter' || finishReason === 'null') {
    return { finish_reason: finishReason };
  }

  return { content: data['choices'][0]['message']['content'] };
}

export async function checkModeration({ apiKey, userMessage }: { apiKey: string; userMessage: string | undefined; }): Promise<Boolean> {
  const apiUrl = 'https://api.openai.com/v1/moderations';

  //don't need to moderate empty messages
  if (userMessage == undefined) {
    return false;
  }

  const body = JSON.stringify({
    model: "text-moderation-stable",
    input: userMessage
  });

  let response;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      let start = Date.now();
      response = await fetch(apiUrl, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
      });

      let end = Date.now();
      console.log(`[Call to Moderation endpoint resolved in ${end-start} ms]`)

      // since no error is caught by the try, break the loop
      break;

    } catch (error: any) {
      console.log('Fetch error in checkModeration:', error); // log error message

      // if this was the last attempt or error message is not timeout-related, throw error
      if (i === MAX_RETRIES - 1 || !error.message.includes('context deadline exceeded')) {
        throw new Error('Fetching failed in checkModeration: ' + error);
      }

      // wait a wee bit before retrying
      await new Promise(resolve => setTimeout(resolve, 133));
    }
  }

  if (typeof (response) === "undefined") {
    throw new Error('Response undefined in checkModeration.')
  }

  if (!response.ok) {
    throw new Error('Response not ok for checkModeration:' + response.status);
  }

  const data = await response.json();

  return data.results.flagged;
}
