import endent from 'endent';
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';

const createPrompt = (
  documentType: string,
  toneOfVoice:
    | ''
    | 'Formal'
    | 'Authoritative'
    | 'Respectful'
    | 'Persuasive'
    | 'Informative'
    | 'Concise',
  content: string
) => {
  const data = (
    documentType: string,
    toneOfVoice:
      | ''
      | 'Formal'
      | 'Authoritative'
      | 'Respectful'
      | 'Persuasive'
      | 'Informative'
      | 'Concise',
    content: string
  ) => {
    return endent`
      You are LexFlowAI, an expert legal assistant designed for top-tier attorneys with over 20 years of experience. You are highly proficient in generating legal content.
      Your task is to enhance the following ${content} and adapt it into a ${documentType} with a ${toneOfVoice} tone of voice.
      The generated content must be in markdown format but not rendered; it must include all markdown characteristics. The title must be bold, and there should be a &nbsp; between every paragraph.
      Do not include information about console logs or print messages.
    `;
  };

  if (documentType) {
    return data(documentType, toneOfVoice, content);
  }
};

export const OpenAIStream = async (
  documentType: string,
  toneOfVoice:
    | ''
    | 'Formal'
    | 'Authoritative'
    | 'Respectful'
    | 'Persuasive'
    | 'Informative'
    | 'Concise',
  content: string,
  model: string,
  key: string | undefined
) => {
  const prompt = createPrompt(documentType, toneOfVoice, content);

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
