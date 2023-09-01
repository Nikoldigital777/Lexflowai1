import { NameGeneratorBody } from '@/types/types';
import { OpenAIStream } from '@/utils/nameGeneratorStream';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { topic, productType, model, apiKey } =
      (await req.json()) as NameGeneratorBody;
    let apiKeyFinal;

    if (apiKey) {
      apiKeyFinal = apiKey;
    } else {
      apiKeyFinal = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }

    if (!apiKey) {
      return new Response('API key not found', { status: 500 });
    }

    const stream = await OpenAIStream(topic, productType, model, apiKeyFinal);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;