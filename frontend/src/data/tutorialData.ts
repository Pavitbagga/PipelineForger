import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../store/pipelineStore';

export interface TutorialNodeInfo {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  whenToUse: string;
  example: {
    scenario: string;
    pipeline: string;
  };
}

export interface TutorialTemplate {
  id: string;
  name: string;
  description: string;
  nodeLabels: string[];
  ctaLabel: string;
  pipelineNodes: Node<NodeData>[];
  pipelineEdges: Edge[];
}

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

export interface TutorialData {
  title: string;
  subtitle: string;
  intro: string;
  howItWorks: {
    heading: string;
    explanation: string;
    analogy: string;
  };
  nodes: TutorialNodeInfo[];
  firstPipeline: {
    heading: string;
    goal: string;
    steps: TutorialStep[];
  };
  templates: TutorialTemplate[];
  mistakesToAvoid: Array<{ mistake: string; why: string; fix: string }>;
  bestPractices: Array<{ practice: string; reason: string }>;
  finalTip: string;
}

export const tutorialData: TutorialData = {
  title: 'Welcome to Forge',
  subtitle: 'Build your first AI pipeline in minutes.',
  intro:
    'Forge lets you design AI workflows visually. Describe what you want to build in plain English, and Forge maps it into a pipeline of connected blocks — each doing one job. You can run it, inspect every step, and export it as real Python code when you\'re ready.',

  howItWorks: {
    heading: 'How a Pipeline Works',
    explanation:
      'A pipeline is a series of steps where data flows from left to right. Each step is a "node" that does one specific job — receive input, think, search the web, make a decision, or return a result. Nodes connect to each other with arrows. The output of one node becomes the input of the next.',
    analogy:
      'Think of it like a factory assembly line. Raw material comes in on the left, gets processed at each station, and finished product comes out on the right. Each station (node) does exactly one thing, and they run in order.',
  },

  nodes: [
    {
      id: 'input',
      name: 'Input',
      icon: '📥',
      tagline: 'Where data enters your pipeline.',
      description:
        'The Input node is the starting point. It receives whatever the user types — a question, a document, a support ticket, or any text — and passes it into the pipeline for processing.',
      whenToUse:
        'Every pipeline starts with an Input node. Use it whenever you need to pass user-provided text into the rest of your workflow.',
      example: {
        scenario: 'A user asks: "Summarize this article for me."',
        pipeline: 'INPUT → LLM → OUTPUT',
      },
    },
    {
      id: 'llm',
      name: 'LLM',
      icon: '🧠',
      tagline: 'Where language understanding and generation happens.',
      description:
        'An LLM node connects to an AI model (Claude, GPT-4, or Gemini) to read, understand, and write text. You give it a system prompt to set its role, and it processes whatever data flows into it.',
      whenToUse:
        'Use an LLM node whenever you need the pipeline to understand text, answer a question, summarize content, rewrite something, classify data, or generate a response.',
      example: {
        scenario: 'Summarize a news article and extract the key takeaways.',
        pipeline: 'INPUT → LLM (summarizer) → OUTPUT',
      },
    },
    {
      id: 'tool',
      name: 'Tool',
      icon: '🔧',
      tagline: 'Connects your pipeline to the outside world.',
      description:
        'A Tool node gives your pipeline access to external capabilities: searching the web, running code, reading a file, or calling an API. Tools are always placed before the LLM node that needs the data they fetch.',
      whenToUse:
        'Use a Tool node when your pipeline needs live information (web search), needs to execute logic (code runner), or needs to read from an external source (file, API).',
      example: {
        scenario: 'Answer a question about today\'s news.',
        pipeline: 'INPUT → TOOL (web search) → LLM → OUTPUT',
      },
    },
    {
      id: 'agent',
      name: 'Agent',
      icon: '🤖',
      tagline: 'An autonomous problem-solver that figures out what to do next.',
      description:
        'An Agent node can reason through a complex task step by step. Unlike an LLM node that just processes once, an agent can decide which tools to use, call them in sequence, check its own work, and keep going until the task is done.',
      whenToUse:
        'Use an Agent when the task is open-ended or complex — research, debugging, multi-step analysis — and you can\'t predict every step the pipeline will need to take.',
      example: {
        scenario: 'Review a pull request: read the code, run tests, summarize issues.',
        pipeline: 'INPUT → AGENT (code reviewer) → OUTPUT',
      },
    },
    {
      id: 'router',
      name: 'Router',
      icon: '🔀',
      tagline: 'Splits your pipeline into different paths based on a condition.',
      description:
        'A Router node looks at the incoming data and decides which path to send it down. It\'s like an if/else statement for your pipeline. One path might handle complaints, another handles general questions — the router decides which is which.',
      whenToUse:
        'Use a Router when different inputs need different handling. For example: urgent vs. normal requests, technical vs. non-technical questions, or short vs. long documents.',
      example: {
        scenario: 'Route support tickets: complaints go to escalation, questions go to FAQ bot.',
        pipeline: 'INPUT → ROUTER → [LLM (escalation)] or [LLM (FAQ)] → OUTPUT',
      },
    },
    {
      id: 'output',
      name: 'Output',
      icon: '📤',
      tagline: 'Where the final result is returned.',
      description:
        'The Output node marks the end of your pipeline. It collects the result from the last processing step and returns it to the user. Every pipeline must end with an Output node.',
      whenToUse: 'Always end your pipeline with an Output node. Without it, results have nowhere to go.',
      example: {
        scenario: 'Display the AI\'s generated response to the user.',
        pipeline: 'INPUT → LLM → OUTPUT',
      },
    },
  ],

  firstPipeline: {
    heading: 'Build Your First Pipeline',
    goal: 'A simple Q&A bot: the user asks a question and gets an intelligent answer.',
    steps: [
      {
        step: 1,
        title: 'Type your idea in the top bar',
        description:
          'Click the text field at the top of the screen that says "Describe your pipeline...". Type: "A bot that answers user questions." Then click Generate.',
        tip: 'Keep your first description short and clear. You can always add complexity later.',
      },
      {
        step: 2,
        title: 'Watch Forge build the pipeline',
        description:
          'Forge will place three nodes on the canvas: Input, LLM, and Output — connected automatically. You\'ll see them appear in a left-to-right layout.',
      },
      {
        step: 3,
        title: 'Click the LLM node to configure it',
        description:
          'Select the LLM node on the canvas. A panel opens on the right. You\'ll see fields for Model, System Prompt, and Temperature. The system prompt tells the AI how to behave — try: "You are a helpful, concise assistant."',
        tip: 'Temperature controls creativity. 0.3 is focused and precise. 0.9 is more creative and varied.',
      },
      {
        step: 4,
        title: 'Click "Test Run" in the top bar',
        description:
          'Press the Test Run button. A panel appears asking for an input. Type a question like "What is machine learning?" and press Run. Watch each node light up as it processes.',
      },
      {
        step: 5,
        title: 'Read the output',
        description:
          'When the run completes, the Output node shows the final response. You can click any node to see exactly what it produced at that step.',
        tip: 'If something looks off, click the LLM node and refine your system prompt, then re-run.',
      },
    ],
  },

  templates: [
    {
      id: 'research-report',
      name: 'Research & Report Writer',
      description:
        'Give it a topic and it searches the web for current information, then writes a clear, structured report.',
      nodeLabels: ['Input', 'Tool (web search)', 'LLM (writer)', 'Output'],
      ctaLabel: 'Load Template',
      pipelineNodes: [
        {
          id: 'tpl_rr_1',
          type: 'input',
          position: { x: 80, y: 250 },
          data: { label: 'Research Topic' },
        },
        {
          id: 'tpl_rr_2',
          type: 'tool',
          position: { x: 310, y: 250 },
          data: { label: 'Web Search', toolType: 'search' },
        },
        {
          id: 'tpl_rr_3',
          type: 'llm',
          position: { x: 540, y: 250 },
          data: {
            label: 'Report Writer',
            model: 'claude-sonnet',
            systemPrompt:
              'You are an expert research writer. Using the search results provided, write a clear, well-structured report on the topic. Include key findings, context, and a summary. Use plain English and avoid unnecessary jargon.',
            temperature: 0.5,
          },
        },
        {
          id: 'tpl_rr_4',
          type: 'output',
          position: { x: 770, y: 250 },
          data: { label: 'Report' },
        },
      ],
      pipelineEdges: [
        { id: 'tpl_rr_e1', source: 'tpl_rr_1', target: 'tpl_rr_2' },
        { id: 'tpl_rr_e2', source: 'tpl_rr_2', target: 'tpl_rr_3' },
        { id: 'tpl_rr_e3', source: 'tpl_rr_3', target: 'tpl_rr_4' },
      ],
    },
    {
      id: 'support-bot',
      name: 'Customer Support Bot',
      description:
        'Routes incoming tickets automatically — complaints go to an escalation handler, general questions go to a standard responder.',
      nodeLabels: ['Input', 'Router', 'LLM (escalation)', 'LLM (standard reply)', 'Output'],
      ctaLabel: 'Load Template',
      pipelineNodes: [
        {
          id: 'tpl_sb_1',
          type: 'input',
          position: { x: 80, y: 280 },
          data: { label: 'Support Ticket' },
        },
        {
          id: 'tpl_sb_2',
          type: 'router',
          position: { x: 310, y: 280 },
          data: {
            label: 'Ticket Router',
            condition:
              'If the message contains frustration, urgency, or a complaint, route to "escalation". Otherwise route to "standard".',
          },
        },
        {
          id: 'tpl_sb_3',
          type: 'llm',
          position: { x: 560, y: 140 },
          data: {
            label: 'Escalation Handler',
            model: 'claude-sonnet',
            systemPrompt:
              'You handle escalated support tickets. Respond with empathy, acknowledge the issue clearly, apologize sincerely, and explain the next steps the customer can expect.',
            temperature: 0.4,
          },
        },
        {
          id: 'tpl_sb_4',
          type: 'llm',
          position: { x: 560, y: 400 },
          data: {
            label: 'Standard Reply',
            model: 'claude-sonnet',
            systemPrompt:
              'You are a friendly customer support agent. Answer the customer\'s question clearly and concisely. Be helpful, professional, and positive.',
            temperature: 0.6,
          },
        },
        {
          id: 'tpl_sb_5',
          type: 'output',
          position: { x: 810, y: 280 },
          data: { label: 'Reply' },
        },
      ],
      pipelineEdges: [
        { id: 'tpl_sb_e1', source: 'tpl_sb_1', target: 'tpl_sb_2' },
        { id: 'tpl_sb_e2', source: 'tpl_sb_2', target: 'tpl_sb_3' },
        { id: 'tpl_sb_e3', source: 'tpl_sb_2', target: 'tpl_sb_4' },
        { id: 'tpl_sb_e4', source: 'tpl_sb_3', target: 'tpl_sb_5' },
        { id: 'tpl_sb_e5', source: 'tpl_sb_4', target: 'tpl_sb_5' },
      ],
    },
    {
      id: 'code-review',
      name: 'Code Review Agent',
      description:
        'Paste a code snippet and get a detailed review: bugs, security issues, style problems, and suggested improvements.',
      nodeLabels: ['Input', 'Agent (reviewer)', 'LLM (formatter)', 'Output'],
      ctaLabel: 'Load Template',
      pipelineNodes: [
        {
          id: 'tpl_cr_1',
          type: 'input',
          position: { x: 80, y: 250 },
          data: { label: 'Code Snippet' },
        },
        {
          id: 'tpl_cr_2',
          type: 'agent',
          position: { x: 310, y: 250 },
          data: {
            label: 'Code Reviewer',
            goal: 'Thoroughly review the provided code. Check for bugs, security vulnerabilities, performance issues, and style problems. Use a code execution tool to verify logic where possible.',
            maxSteps: 6,
            availableTools: ['code_executor'],
          },
        },
        {
          id: 'tpl_cr_3',
          type: 'llm',
          position: { x: 560, y: 250 },
          data: {
            label: 'Report Formatter',
            model: 'claude-sonnet',
            systemPrompt:
              'Format the code review findings into a clean, structured report with sections: Summary, Bugs Found, Security Issues, Performance Notes, and Suggested Improvements. Use bullet points and be concise.',
            temperature: 0.3,
          },
        },
        {
          id: 'tpl_cr_4',
          type: 'output',
          position: { x: 790, y: 250 },
          data: { label: 'Review Report' },
        },
      ],
      pipelineEdges: [
        { id: 'tpl_cr_e1', source: 'tpl_cr_1', target: 'tpl_cr_2' },
        { id: 'tpl_cr_e2', source: 'tpl_cr_2', target: 'tpl_cr_3' },
        { id: 'tpl_cr_e3', source: 'tpl_cr_3', target: 'tpl_cr_4' },
      ],
    },
  ],

  mistakesToAvoid: [
    {
      mistake: 'Forgetting to add an Output node',
      why: 'Without an Output node, the pipeline has nowhere to send its final result. The run will complete but you\'ll see nothing.',
      fix: 'Always end every pipeline with an Output node connected to your last processing step.',
    },
    {
      mistake: 'Connecting a Tool node after the LLM instead of before it',
      why: 'The LLM needs the Tool\'s data to answer intelligently. If the Tool comes after, the LLM has already responded without that information.',
      fix: 'Wire Tools before the LLM that needs their output: INPUT → TOOL → LLM → OUTPUT.',
    },
    {
      mistake: 'Leaving the LLM system prompt blank',
      why: 'Without a system prompt, the LLM has no context about its role. Responses will be generic and often unhelpful.',
      fix: 'Always write a short system prompt. Even one sentence like "You are a helpful summarizer" makes a significant difference.',
    },
    {
      mistake: 'Building a 10-node pipeline before testing anything',
      why: 'If something breaks, you won\'t know which node caused it. Debugging a long untested pipeline is frustrating.',
      fix: 'Build and test 2–3 nodes at a time. Use Test Run frequently to verify each stage works before adding more.',
    },
    {
      mistake: 'Using an Agent node when a simple LLM would do',
      why: 'Agent nodes are heavier and slower. They\'re designed for open-ended tasks. For a single summarization or classification step, an LLM is faster and more predictable.',
      fix: 'Use LLM for focused, single-step tasks. Reserve Agent for multi-step reasoning where the path is unpredictable.',
    },
    {
      mistake: 'Not connecting all nodes',
      why: 'Disconnected nodes are ignored at runtime. If a node has no incoming or outgoing edge, it\'s isolated and won\'t run.',
      fix: 'After building, scan all nodes. Every node except Input should have at least one incoming edge, and every node except Output should have at least one outgoing edge.',
    },
  ],

  bestPractices: [
    {
      practice: 'Name every node clearly',
      reason:
        'Default names like "LLM" or "Tool" become confusing in a 6-node pipeline. Use descriptive names like "Summarizer", "Web Search", or "Complaint Classifier" so you know what each node does at a glance.',
    },
    {
      practice: 'Write a specific system prompt for every LLM node',
      reason:
        'Each LLM in your pipeline should have one focused job. A system prompt like "You extract action items from meeting notes" keeps the node reliable and prevents it from doing something unexpected.',
    },
    {
      practice: 'Use Test Run early and often',
      reason:
        'The Test Run feature shows you exactly what each node outputs at every step. Catching a bad system prompt at step 2 is much easier than diagnosing it after a 7-node pipeline gives you a bad result.',
    },
    {
      practice: 'Keep temperature low for structured tasks',
      reason:
        'For tasks that need consistent, structured output (classification, extraction, JSON formatting), use temperature 0.2–0.4. High temperature (0.8+) is better for creative writing and brainstorming.',
    },
    {
      practice: 'Use the Copilot panel to verify your pipeline before running',
      reason:
        'The AI Copilot on the right panel can scan your pipeline and flag issues — missing nodes, illogical connections, or misconfigured prompts — before you hit Test Run.',
    },
  ],

  finalTip:
    'Start with the simplest version that could possibly work. Add one node, test it. Add another, test again. The best pipelines are built in small steps, not planned all at once. You can always make it smarter.',
};
