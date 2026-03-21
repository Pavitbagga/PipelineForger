const nodeOutputTypes: Record<string, string[]> = {
  input:  ['text'],
  llm:    ['text'],
  tool:   ['text', 'json'],
  agent:  ['text', 'json'],
  router: ['text'],
  output: [],
};

const nodeInputTypes: Record<string, string[]> = {
  input:  [],
  llm:    ['text'],
  tool:   ['text', 'json'],
  agent:  ['text', 'json'],
  router: ['text', 'json'],
  output: ['text', 'json'],
};

export function checkCompatibility(
  sourceType: string,
  targetType: string
): { compatible: boolean; reason: string } {
  const outputs = nodeOutputTypes[sourceType] ?? [];
  const inputs  = nodeInputTypes[targetType]  ?? [];
  const overlap = outputs.filter(t => inputs.includes(t));

  if (overlap.length > 0) {
    return { compatible: true, reason: `Both support: ${overlap.join(', ')}` };
  }
  return {
    compatible: false,
    reason: `${sourceType} outputs [${outputs.join(', ')}] but ${targetType} expects [${inputs.join(', ')}]`,
  };
}
