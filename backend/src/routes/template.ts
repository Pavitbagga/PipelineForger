import { Router } from "express";

const router = Router();

const TEMPLATES: Record<string, any> = {
  "research-report": {
    nodes: [
      { id: "node_1", type: "input", position: { x: 100, y: 300 }, data: { label: "Research Topic", status: "idle" }, config: {} },
      { id: "node_2", type: "tool", position: { x: 350, y: 200 }, data: { label: "Web Search", status: "idle" }, config: { toolType: "web_search" } },
      { id: "node_3", type: "llm", position: { x: 600, y: 300 }, data: { label: "Summarizer", status: "idle" }, config: { model: "claude-sonnet-4-20250514", systemPrompt: "You are a research assistant. Summarize the search results into a clear, structured report.", temperature: 0.7 } },
      { id: "node_4", type: "output", position: { x: 850, y: 300 }, data: { label: "Report", status: "idle" }, config: {} }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_2", target: "node_3" },
      { id: "e3", source: "node_3", target: "node_4" }
    ],
    copilotMessage: "Research & Report pipeline loaded! Enter a topic and it will search the web and summarize the results."
  },
  "support-bot": {
    nodes: [
      { id: "node_1", type: "input", position: { x: 100, y: 300 }, data: { label: "User Message", status: "idle" }, config: {} },
      { id: "node_2", type: "llm", position: { x: 400, y: 300 }, data: { label: "Support Agent", status: "idle" }, config: { model: "claude-sonnet-4-20250514", systemPrompt: "You are a helpful customer support agent. Be friendly, concise, and solution-focused.", temperature: 0.5 } },
      { id: "node_3", type: "output", position: { x: 700, y: 300 }, data: { label: "Response", status: "idle" }, config: {} }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_2", target: "node_3" }
    ],
    copilotMessage: "Support Bot pipeline loaded! A simple but effective customer support pipeline."
  },
  "code-reviewer": {
    nodes: [
      { id: "node_1", type: "input", position: { x: 100, y: 300 }, data: { label: "Code Input", status: "idle" }, config: {} },
      { id: "node_2", type: "llm", position: { x: 350, y: 200 }, data: { label: "Bug Finder", status: "idle" }, config: { model: "claude-sonnet-4-20250514", systemPrompt: "You are an expert code reviewer. Identify bugs, security issues, and performance problems.", temperature: 0.3 } },
      { id: "node_3", type: "llm", position: { x: 350, y: 400 }, data: { label: "Style Checker", status: "idle" }, config: { model: "claude-sonnet-4-20250514", systemPrompt: "You are a code style expert. Check for readability, naming conventions, and best practices.", temperature: 0.3 } },
      { id: "node_4", type: "llm", position: { x: 650, y: 300 }, data: { label: "Report Writer", status: "idle" }, config: { model: "claude-sonnet-4-20250514", systemPrompt: "Combine the bug report and style feedback into a clear, actionable code review.", temperature: 0.5 } },
      { id: "node_5", type: "output", position: { x: 900, y: 300 }, data: { label: "Review", status: "idle" }, config: {} }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_1", target: "node_3" },
      { id: "e3", source: "node_2", target: "node_4" },
      { id: "e4", source: "node_3", target: "node_4" },
      { id: "e5", source: "node_4", target: "node_5" }
    ],
    copilotMessage: "Code Reviewer pipeline loaded! Two parallel reviewers combine their feedback."
  }
};

router.get("/:name", (req, res) => {
  const name = req.params.name;
  const template = TEMPLATES[name];
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

export default router;
