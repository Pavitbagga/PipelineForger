import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../store/pipelineStore';

export const mockGeneratePipeline = (intent: string) => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        nodes: [
          {
            id: 'node_1',
            type: 'input',
            position: { x: 100, y: 200 },
            data: { label: 'User Input', status: 'idle' },
          },
          {
            id: 'node_2',
            type: 'llm',
            position: { x: 350, y: 200 },
            data: {
              label: 'Claude',
              model: 'claude-sonnet',
              systemPrompt: 'You are a helpful assistant.',
              temperature: 0.7,
              status: 'idle',
            },
          },
          {
            id: 'node_3',
            type: 'output',
            position: { x: 600, y: 200 },
            data: { label: 'Response', status: 'idle' },
          },
        ] as Node<NodeData>[],
        edges: [
          { id: 'e1-2', source: 'node_1', target: 'node_2' },
          { id: 'e2-3', source: 'node_2', target: 'node_3' },
        ] as Edge[],
        copilotMessage: `I've set up a simple Claude pipeline for: "${intent}". Click any node to configure it.`,
      });
    }, 1500);
  });
};

export const mockValidateConnection = (sourceType: string, targetType: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple validation rules
      const incompatible =
        (sourceType === 'output') ||
        (targetType === 'input');

      resolve({
        compatible: !incompatible,
        message: incompatible
          ? `Cannot connect ${sourceType} → ${targetType}. Check the flow direction.`
          : `${sourceType} → ${targetType} connection looks good.`,
      });
    }, 300);
  });
};

export const mockGenerateCode = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: `import anthropic

client = anthropic.Anthropic()

def run_pipeline(user_input: str):
    """Execute the AI pipeline with the given input."""

    # Node 1: User Input
    input_data = user_input

    # Node 2: Claude LLM
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        temperature=0.7,
        system="You are a helpful assistant.",
        messages=[{"role": "user", "content": input_data}]
    )

    # Node 3: Output
    output = message.content[0].text

    return output

if __name__ == "__main__":
    result = run_pipeline("Hello, how can you help me?")
    print(result)`,
        requiredKeys: ['ANTHROPIC_API_KEY'],
      });
    }, 2000);
  });
};

export const mockTestRun = (_pipeline: any, input: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        logs: [
          {
            nodeId: 'node_1',
            nodeName: 'User Input',
            status: 'done',
            output: input,
            timestamp: Date.now(),
          },
          {
            nodeId: 'node_2',
            nodeName: 'Claude',
            status: 'running',
            output: 'Processing...',
            timestamp: Date.now() + 1000,
          },
          {
            nodeId: 'node_2',
            nodeName: 'Claude',
            status: 'done',
            output: 'Hello! I can help you with various tasks...',
            timestamp: Date.now() + 3000,
          },
          {
            nodeId: 'node_3',
            nodeName: 'Response',
            status: 'done',
            output: 'Pipeline completed successfully',
            timestamp: Date.now() + 3500,
          },
        ],
      });
    }, 500);
  });
};

export const mockInterpretSketch = (_imageBase64: string, feedback?: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        interpretation: feedback
          ? `Refined based on feedback "${feedback}": A pipeline with an input node connected to a Claude LLM node, which routes through a router and feeds into an output node.`
          : 'A pipeline with an input node connected to a Claude LLM node, which feeds into an output node.',
        nodes: [
          {
            id: 'node_1',
            type: 'input',
            position: { x: 100, y: 300 },
            data: { label: 'Input', status: 'idle' },
          },
          {
            id: 'node_2',
            type: 'llm',
            position: { x: 350, y: 300 },
            data: {
              label: 'LLM',
              model: 'claude-sonnet',
              systemPrompt: 'You are a helpful assistant.',
              temperature: 0.7,
              status: 'idle',
            },
          },
          {
            id: 'node_3',
            type: 'output',
            position: { x: 600, y: 300 },
            data: { label: 'Output', status: 'idle' },
          },
        ] as Node<NodeData>[],
        edges: [
          { id: 'e1-2', source: 'node_1', target: 'node_2' },
          { id: 'e2-3', source: 'node_2', target: 'node_3' },
        ] as Edge[],
      });
    }, 1800);
  });
};

export const mockLoadTemplate = (templateName: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const templates: Record<string, any> = {
        'research-report': {
          nodes: [
            {
              id: 'node_1',
              type: 'input',
              position: { x: 50, y: 200 },
              data: { label: 'Research Topic', status: 'idle' },
            },
            {
              id: 'node_2',
              type: 'tool',
              position: { x: 250, y: 150 },
              data: { label: 'Web Search', toolType: 'search', status: 'idle' },
            },
            {
              id: 'node_3',
              type: 'llm',
              position: { x: 450, y: 200 },
              data: {
                label: 'Synthesizer',
                model: 'claude-sonnet',
                systemPrompt: 'You are a research assistant. Synthesize the search results into a coherent report.',
                temperature: 0.5,
                status: 'idle',
              },
            },
            {
              id: 'node_4',
              type: 'output',
              position: { x: 700, y: 200 },
              data: { label: 'Report', status: 'idle' },
            },
          ],
          edges: [
            { id: 'e1-2', source: 'node_1', target: 'node_2' },
            { id: 'e2-3', source: 'node_2', target: 'node_3' },
            { id: 'e3-4', source: 'node_3', target: 'node_4' },
          ],
          copilotMessage: 'Research & Report template loaded. This pipeline searches the web and generates a comprehensive report.',
        },
        'support-bot': {
          nodes: [
            {
              id: 'node_1',
              type: 'input',
              position: { x: 50, y: 250 },
              data: { label: 'User Query', status: 'idle' },
            },
            {
              id: 'node_2',
              type: 'router',
              position: { x: 250, y: 250 },
              data: { label: 'Intent Router', condition: 'Route based on query type', status: 'idle' },
            },
            {
              id: 'node_3',
              type: 'tool',
              position: { x: 450, y: 150 },
              data: { label: 'KB Search', toolType: 'search', status: 'idle' },
            },
            {
              id: 'node_4',
              type: 'llm',
              position: { x: 450, y: 350 },
              data: {
                label: 'GPT-4',
                model: 'gpt-4',
                systemPrompt: 'You are a customer support agent.',
                temperature: 0.3,
                status: 'idle',
              },
            },
            {
              id: 'node_5',
              type: 'output',
              position: { x: 700, y: 250 },
              data: { label: 'Response', status: 'idle' },
            },
          ],
          edges: [
            { id: 'e1-2', source: 'node_1', target: 'node_2' },
            { id: 'e2-3', source: 'node_2', target: 'node_3' },
            { id: 'e2-4', source: 'node_2', target: 'node_4' },
            { id: 'e3-5', source: 'node_3', target: 'node_5' },
            { id: 'e4-5', source: 'node_4', target: 'node_5' },
          ],
          copilotMessage: 'Support Bot template loaded. Routes queries to either knowledge base search or LLM.',
        },
        'code-reviewer': {
          nodes: [
            {
              id: 'node_1',
              type: 'input',
              position: { x: 50, y: 200 },
              data: { label: 'Code Input', status: 'idle' },
            },
            {
              id: 'node_2',
              type: 'agent',
              position: { x: 300, y: 200 },
              data: {
                label: 'Code Analyzer',
                goal: 'Analyze code for bugs, security issues, and style',
                maxSteps: 5,
                availableTools: ['linter', 'security-scanner'],
                status: 'idle',
              },
            },
            {
              id: 'node_3',
              type: 'llm',
              position: { x: 550, y: 200 },
              data: {
                label: 'Gemini Pro',
                model: 'gemini-pro',
                systemPrompt: 'You are a code reviewer. Provide detailed feedback.',
                temperature: 0.4,
                status: 'idle',
              },
            },
            {
              id: 'node_4',
              type: 'output',
              position: { x: 800, y: 200 },
              data: { label: 'Review Report', status: 'idle' },
            },
          ],
          edges: [
            { id: 'e1-2', source: 'node_1', target: 'node_2' },
            { id: 'e2-3', source: 'node_2', target: 'node_3' },
            { id: 'e3-4', source: 'node_3', target: 'node_4' },
          ],
          copilotMessage: 'Code Reviewer template loaded. Uses an agent and LLM to provide comprehensive code reviews.',
        },
      };

      const template = templates[templateName] || templates['research-report'];
      resolve(template);
    }, 800);
  });
};
