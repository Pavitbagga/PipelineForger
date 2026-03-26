import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../../store/pipelineStore';

// ══════════════════════════════════════════════════════════════════════════════
// DEMO MODE DATA — Deterministic mock pipelines for polished demo videos
// ══════════════════════════════════════════════════════════════════════════════

export type EthicsRisk = {
  nodeId: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOCK PIPELINE GENERATION (Intent → Nodes)
// ─────────────────────────────────────────────────────────────────────────────

export function getMockPipeline(intent: string): {
  nodes: Node<NodeData>[];
  edges: Edge[];
  copilotMessage: string;
} {
  const lowercaseIntent = intent.toLowerCase();

  // Customer Support Bot
  if (
    lowercaseIntent.includes('support') ||
    lowercaseIntent.includes('customer') ||
    lowercaseIntent.includes('help desk')
  ) {
    return {
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'User Query', status: 'idle' },
        },
        {
          id: 'llm_1',
          type: 'llm',
          position: { x: 320, y: 220 },
          data: {
            label: 'Intent Classifier',
            model: 'claude-sonnet',
            systemPrompt: 'Classify the user query into: billing, technical, or general.',
            temperature: 0.3,
            status: 'idle',
          },
        },
        {
          id: 'router_1',
          type: 'router',
          position: { x: 540, y: 300 },
          data: {
            label: 'Intent Router',
            condition: 'Route based on classification',
            status: 'idle',
          },
        },
        {
          id: 'tool_1',
          type: 'tool',
          position: { x: 760, y: 180 },
          data: {
            label: 'Knowledge Base',
            toolType: 'search',
            status: 'idle',
          },
        },
        {
          id: 'llm_2',
          type: 'llm',
          position: { x: 980, y: 300 },
          data: {
            label: 'Response Generator',
            model: 'claude-sonnet',
            systemPrompt: 'Generate a helpful, empathetic support response.',
            temperature: 0.7,
            status: 'idle',
          },
        },
        {
          id: 'output_1',
          type: 'output',
          position: { x: 1200, y: 300 },
          data: { label: 'Support Response', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'input_1', target: 'llm_1' },
        { id: 'e2', source: 'llm_1', target: 'router_1' },
        { id: 'e3', source: 'router_1', target: 'tool_1' },
        { id: 'e4', source: 'router_1', target: 'llm_2' },
        { id: 'e5', source: 'tool_1', target: 'llm_2' },
        { id: 'e6', source: 'llm_2', target: 'output_1' },
      ],
      copilotMessage:
        'I built a customer support pipeline with intent classification, routing, and knowledge base lookup. The router directs queries to either search or direct LLM response based on complexity.',
    };
  }

  // Research / Analysis Pipeline
  if (
    lowercaseIntent.includes('research') ||
    lowercaseIntent.includes('analysis') ||
    lowercaseIntent.includes('report')
  ) {
    return {
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Research Topic', status: 'idle' },
        },
        {
          id: 'tool_1',
          type: 'tool',
          position: { x: 350, y: 300 },
          data: {
            label: 'Web Search',
            toolType: 'search',
            status: 'idle',
          },
        },
        {
          id: 'llm_1',
          type: 'llm',
          position: { x: 600, y: 300 },
          data: {
            label: 'Synthesizer',
            model: 'claude-sonnet',
            systemPrompt: 'Synthesize search results into a comprehensive report.',
            temperature: 0.5,
            status: 'idle',
          },
        },
        {
          id: 'output_1',
          type: 'output',
          position: { x: 850, y: 300 },
          data: { label: 'Research Report', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'input_1', target: 'tool_1' },
        { id: 'e2', source: 'tool_1', target: 'llm_1' },
        { id: 'e3', source: 'llm_1', target: 'output_1' },
      ],
      copilotMessage:
        'I created a research pipeline that searches the web and uses Claude to synthesize findings into a structured report. Perfect for market research or competitive analysis.',
    };
  }

  // Code Review / Analysis
  if (
    lowercaseIntent.includes('code') ||
    lowercaseIntent.includes('review') ||
    lowercaseIntent.includes('debug')
  ) {
    return {
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Code Input', status: 'idle' },
        },
        {
          id: 'llm_1',
          type: 'llm',
          position: { x: 350, y: 200 },
          data: {
            label: 'Bug Detector',
            model: 'claude-sonnet',
            systemPrompt: 'Analyze code for bugs, logic errors, and edge cases.',
            temperature: 0.4,
            status: 'idle',
          },
        },
        {
          id: 'llm_2',
          type: 'llm',
          position: { x: 350, y: 400 },
          data: {
            label: 'Style Checker',
            model: 'claude-sonnet',
            systemPrompt: 'Review code style, best practices, and maintainability.',
            temperature: 0.4,
            status: 'idle',
          },
        },
        {
          id: 'llm_3',
          type: 'llm',
          position: { x: 600, y: 300 },
          data: {
            label: 'Report Compiler',
            model: 'claude-sonnet',
            systemPrompt: 'Combine bug and style feedback into actionable review.',
            temperature: 0.5,
            status: 'idle',
          },
        },
        {
          id: 'output_1',
          type: 'output',
          position: { x: 850, y: 300 },
          data: { label: 'Code Review', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'input_1', target: 'llm_1' },
        { id: 'e2', source: 'input_1', target: 'llm_2' },
        { id: 'e3', source: 'llm_1', target: 'llm_3' },
        { id: 'e4', source: 'llm_2', target: 'llm_3' },
        { id: 'e5', source: 'llm_3', target: 'output_1' },
      ],
      copilotMessage:
        'I built a parallel code review pipeline. Two specialized agents analyze for bugs and style independently, then a third agent combines their findings into a unified review report.',
    };
  }

  // Agent / Task Automation
  if (
    lowercaseIntent.includes('agent') ||
    lowercaseIntent.includes('automat') ||
    lowercaseIntent.includes('task')
  ) {
    return {
      nodes: [
        {
          id: 'input_1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Task Description', status: 'idle' },
        },
        {
          id: 'agent_1',
          type: 'agent',
          position: { x: 400, y: 300 },
          data: {
            label: 'Task Agent',
            goal: 'Break down and execute the given task',
            maxSteps: 5,
            availableTools: ['search', 'code'],
            status: 'idle',
          },
        },
        {
          id: 'output_1',
          type: 'output',
          position: { x: 700, y: 300 },
          data: { label: 'Task Result', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'input_1', target: 'agent_1' },
        { id: 'e2', source: 'agent_1', target: 'output_1' },
      ],
      copilotMessage:
        'I created an autonomous agent pipeline. The agent can use multiple tools and iterate up to 5 steps to complete complex tasks. Great for multi-step workflows.',
    };
  }

  // Default: Simple Q&A Pipeline
  return {
    nodes: [
      {
        id: 'input_1',
        type: 'input',
        position: { x: 100, y: 300 },
        data: { label: 'User Input', status: 'idle' },
      },
      {
        id: 'llm_1',
        type: 'llm',
        position: { x: 400, y: 300 },
        data: {
          label: 'Claude Assistant',
          model: 'claude-sonnet',
          systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate responses.',
          temperature: 0.7,
          status: 'idle',
        },
      },
      {
        id: 'output_1',
        type: 'output',
        position: { x: 700, y: 300 },
        data: { label: 'Response', status: 'idle' },
      },
    ],
    edges: [
      { id: 'e1', source: 'input_1', target: 'llm_1' },
      { id: 'e2', source: 'llm_1', target: 'output_1' },
    ],
    copilotMessage: `I created a simple Q&A pipeline for: "${intent}". Claude will respond to user inputs directly. You can expand this by adding tools or routing logic.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOCK TEMPLATE LOADING
// ─────────────────────────────────────────────────────────────────────────────

export function getMockTemplate(templateName: string): {
  nodes: Node<NodeData>[];
  edges: Edge[];
  copilotMessage: string;
} {
  const templates: Record<
    string,
    { nodes: Node<NodeData>[]; edges: Edge[]; copilotMessage: string }
  > = {
    'research-report': {
      nodes: [
        {
          id: 'tr1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Research Topic', status: 'idle' },
        },
        {
          id: 'tr2',
          type: 'tool',
          position: { x: 350, y: 300 },
          data: { label: 'Web Search', toolType: 'search', status: 'idle' },
        },
        {
          id: 'tr3',
          type: 'llm',
          position: { x: 600, y: 300 },
          data: {
            label: 'Report Writer',
            model: 'claude-sonnet',
            systemPrompt:
              'You are a research analyst. Synthesize search results into a comprehensive, well-structured report with key findings and recommendations.',
            temperature: 0.5,
            status: 'idle',
          },
        },
        {
          id: 'tr4',
          type: 'output',
          position: { x: 850, y: 300 },
          data: { label: 'Research Report', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'tr1', target: 'tr2' },
        { id: 'e2', source: 'tr2', target: 'tr3' },
        { id: 'e3', source: 'tr3', target: 'tr4' },
      ],
      copilotMessage:
        'Research & Report template loaded! This pipeline searches the web for information and generates a comprehensive report with key findings and recommendations.',
    },

    'support-bot': {
      nodes: [
        {
          id: 'ts1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Customer Query', status: 'idle' },
        },
        {
          id: 'ts2',
          type: 'llm',
          position: { x: 400, y: 300 },
          data: {
            label: 'Support Agent',
            model: 'claude-sonnet',
            systemPrompt:
              'You are a professional customer support agent. Handle inquiries with empathy, accuracy, and efficiency. Provide clear solutions.',
            temperature: 0.3,
            status: 'idle',
          },
        },
        {
          id: 'ts3',
          type: 'output',
          position: { x: 700, y: 300 },
          data: { label: 'Support Response', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'ts1', target: 'ts2' },
        { id: 'e2', source: 'ts2', target: 'ts3' },
      ],
      copilotMessage:
        'Support Bot template loaded! This pipeline uses Claude to handle customer inquiries with empathy and accuracy. Perfect for automating tier-1 support.',
    },

    'code-reviewer': {
      nodes: [
        {
          id: 'tc1',
          type: 'input',
          position: { x: 100, y: 300 },
          data: { label: 'Code Snippet', status: 'idle' },
        },
        {
          id: 'tc2',
          type: 'llm',
          position: { x: 350, y: 200 },
          data: {
            label: 'Bug Analyzer',
            model: 'claude-sonnet',
            systemPrompt: 'Analyze code for bugs, logic errors, security issues, and edge cases.',
            temperature: 0.4,
            status: 'idle',
          },
        },
        {
          id: 'tc3',
          type: 'llm',
          position: { x: 350, y: 400 },
          data: {
            label: 'Style Reviewer',
            model: 'claude-sonnet',
            systemPrompt: 'Review code style, readability, best practices, and maintainability.',
            temperature: 0.4,
            status: 'idle',
          },
        },
        {
          id: 'tc4',
          type: 'llm',
          position: { x: 600, y: 300 },
          data: {
            label: 'Report Compiler',
            model: 'claude-sonnet',
            systemPrompt:
              'Combine bug and style analysis into a unified code review with actionable recommendations.',
            temperature: 0.5,
            status: 'idle',
          },
        },
        {
          id: 'tc5',
          type: 'output',
          position: { x: 850, y: 300 },
          data: { label: 'Code Review', status: 'idle' },
        },
      ],
      edges: [
        { id: 'e1', source: 'tc1', target: 'tc2' },
        { id: 'e2', source: 'tc1', target: 'tc3' },
        { id: 'e3', source: 'tc2', target: 'tc4' },
        { id: 'e4', source: 'tc3', target: 'tc4' },
        { id: 'e5', source: 'tc4', target: 'tc5' },
      ],
      copilotMessage:
        'Code Reviewer template loaded! Two specialized Claude agents analyze your code in parallel for bugs and style, then combine findings into a comprehensive review report.',
    },
  };

  return templates[templateName] || templates['research-report'];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOCK COPILOT RESPONSES
// ─────────────────────────────────────────────────────────────────────────────

export function getMockCopilotMessages(
  context: 'pipeline-generated' | 'node-added' | 'node-configured' | 'edge-connected'
): string[] {
  const messages: Record<typeof context, string[]> = {
    'pipeline-generated': [
      'I analyzed your intent and designed a multi-stage pipeline. Each node handles a specific part of the workflow.',
      'The routing logic will direct queries to the most appropriate handler based on context.',
      'I added a knowledge base lookup to supplement LLM responses with factual data.',
    ],
    'node-added': [
      'This node will process data from the previous step and pass results downstream.',
      'Consider configuring the system prompt to match your specific use case.',
      'You can adjust the temperature parameter to control output creativity.',
    ],
    'node-configured': [
      'Configuration saved! The updated parameters will be used during pipeline execution.',
      'Good choice on the temperature setting—that will balance creativity and consistency.',
      'I recommend testing this node configuration with a sample input.',
    ],
    'edge-connected': [
      'Connection established! Data will flow from source to target node.',
      'This connection creates a sequential processing chain.',
      'Make sure the output format of the source matches the input expectations of the target.',
    ],
  };

  return messages[context];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MOCK ETHICS WARNINGS
// ─────────────────────────────────────────────────────────────────────────────

export function getMockEthicsRisks(nodes: Node<NodeData>[]): EthicsRisk[] {
  const risks: EthicsRisk[] = [];

  nodes.forEach((node) => {
    // LLM nodes without system prompts
    if (node.type === 'llm' && !node.data.systemPrompt) {
      risks.push({
        nodeId: node.id,
        severity: 'medium',
        message: 'LLM node lacks explicit system prompt—outputs may be unpredictable',
      });
    }

    // High temperature on LLM nodes
    if (node.type === 'llm' && (node.data.temperature ?? 0) > 0.8) {
      risks.push({
        nodeId: node.id,
        severity: 'low',
        message: 'High temperature may produce creative but inconsistent outputs',
      });
    }

    // Tool nodes without human review
    if (node.type === 'tool') {
      risks.push({
        nodeId: node.id,
        severity: 'medium',
        message: 'Tool execution without human review step—consider adding validation',
      });
    }

    // Router nodes without fallback
    if (node.type === 'router') {
      risks.push({
        nodeId: node.id,
        severity: 'medium',
        message: 'Router lacks explicit fallback handling for edge cases',
      });
    }

    // Output nodes that might expose sensitive data
    if (node.type === 'output') {
      risks.push({
        nodeId: node.id,
        severity: 'low',
        message: 'Output node—ensure no sensitive data is logged or exposed',
      });
    }
  });

  // Add a general warning if pipeline is complex
  if (nodes.length > 5) {
    const middleNodeId = nodes[Math.floor(nodes.length / 2)]?.id;
    if (middleNodeId) {
      risks.push({
        nodeId: middleNodeId,
        severity: 'low',
        message: 'Complex pipeline—consider adding monitoring and error handling',
      });
    }
  }

  return risks;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOCK GENERATED CODE (Ship It)
// ─────────────────────────────────────────────────────────────────────────────

export function getMockGeneratedCode(): { code: string; requiredKeys: string[] } {
  return {
    code: `import os
from typing import Dict, List, Any
import anthropic

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class PipelineExecutor:
    """
    Forge Pipeline Executor
    Generated by Forge — https://forge.ai

    This pipeline implements a multi-stage AI workflow with
    intent classification, routing, and response generation.
    """

    def __init__(self):
        self.execution_log: List[Dict[str, Any]] = []

    def run(self, user_input: str) -> str:
        """Execute the complete pipeline and return final output."""
        print(f"[Pipeline] Starting execution with input: {user_input[:100]}...")

        # Stage 1: Intent Classification
        intent = self._classify_intent(user_input)
        self._log_step("intent_classifier", intent)

        # Stage 2: Route based on intent
        route = self._route_by_intent(intent)
        self._log_step("router", route)

        # Stage 3: Execute appropriate handler
        if route == "knowledge_base":
            context = self._search_knowledge_base(user_input)
            self._log_step("knowledge_base", f"Retrieved {len(context)} results")
        else:
            context = "Direct LLM processing"

        # Stage 4: Generate final response
        response = self._generate_response(user_input, context, intent)
        self._log_step("response_generator", "Response generated")

        print(f"[Pipeline] Execution complete. {len(self.execution_log)} steps.")
        return response

    def _classify_intent(self, user_input: str) -> str:
        """Classify user intent using Claude."""
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            temperature=0.3,
            system="Classify the user query into: billing, technical, or general.",
            messages=[{"role": "user", "content": user_input}]
        )
        return message.content[0].text.strip().lower()

    def _route_by_intent(self, intent: str) -> str:
        """Route based on classified intent."""
        if intent in ["billing", "technical"]:
            return "knowledge_base"
        return "direct_llm"

    def _search_knowledge_base(self, query: str) -> str:
        """Search knowledge base (connect your vector DB here)."""
        # TODO: Integrate with your vector database (Pinecone, Weaviate, etc.)
        return f"[Mock KB results for: {query}]"

    def _generate_response(self, user_input: str, context: str, intent: str) -> str:
        """Generate final response using Claude."""
        system_prompt = f"""You are a professional support agent.
Intent: {intent}
Context: {context}

Generate a helpful, empathetic response to the user's query."""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": user_input}]
        )
        return message.content[0].text

    def _log_step(self, node_id: str, output: str):
        """Log execution step for debugging."""
        self.execution_log.append({
            "node_id": node_id,
            "output": output[:100],
            "timestamp": __import__("datetime").datetime.now().isoformat()
        })

# ─────────────────────────────────────────────────────────────────────────────
# Usage Example
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Initialize pipeline
    pipeline = PipelineExecutor()

    # Run with sample input
    user_query = "I need help resetting my account password"
    result = pipeline.run(user_query)

    print("\\n" + "="*60)
    print("FINAL OUTPUT:")
    print("="*60)
    print(result)
    print("\\n" + "="*60)
    print(f"Execution log: {len(pipeline.execution_log)} steps")
    for step in pipeline.execution_log:
        print(f"  - {step['node_id']}: {step['output']}")
`,
    requiredKeys: ['ANTHROPIC_API_KEY'],
  };
}
