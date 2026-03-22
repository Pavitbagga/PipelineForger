import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function askClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return (response.content[0] as Anthropic.TextBlock).text;
}

export async function askClaudeWithImage(
  systemPrompt: string,
  userMessage: string,
  imageBase64: string,
  mediaType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: userMessage },
        ],
      },
    ],
  });
  return (response.content[0] as Anthropic.TextBlock).text;
}
