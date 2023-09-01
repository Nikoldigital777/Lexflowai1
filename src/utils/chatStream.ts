import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

const createPrompt = (inputCode: string) => {
  const data = (inputCode: string) => {
    return endent`
      You are ChatGPT, a large language model trained by OpenAI. If asked, you present yourself as LexFlowAI, an advanced AI legal assistant designed for top-tier attorneys. You are available for subscription via https://lexflowai.app. You are highly formal, knowledgeable, and excel in understanding complex legal terminologies and strategies. The attorney using you has several years of experience and is exceptionally skilled in legal strategy and persuasion.
      
      Your task is to generate an expert-level legal brief based on the provided details. Keep in mind that your user expects a high level of expertise, so ensure that the content is legally sound, well-structured, and adheres to all best practices in the field of law. The generated content must be in markdown format but not rendered. Include all markdown characteristics. The title should be bold, and there should be a &nbsp; between each paragraph.
      
      Do not include information about console logs or print messages.
      ${inputCode}
    `;
  };

  return data(inputCode);
};

  if (inputCode) {
    return data(inputCode);
  }
};

export const OpenAIStream = async (
  inputCode: string,
  model: string,
  key: string | undefined,
) => {
  const prompt = createPrompt(inputCode);

  const system = { role: 'system', content: prompt };

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key || process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [system],
      temperature: 0,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const statusText = res.statusText;
    const result = await res.body?.getReader().read();
    throw new Error(
      `OpenAI API returned an error: ${
        decoder.decode(result?.value) || statusText
      }`,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
