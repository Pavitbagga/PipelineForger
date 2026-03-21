# ⚡ Forge - AI Pipeline Builder

A drag-and-drop visual builder for assembling multi-LLM pipelines and shipping them as production-ready code.

![Forge Banner](https://img.shields.io/badge/Built%20with-React%20%2B%20TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

### Visual Pipeline Builder
- **Drag-and-Drop Canvas**: Built with React Flow for smooth node-based editing
- **6 Node Types**: Input, LLM, Tool, Agent, Router, Output
- **Real-time Configuration**: Click any node to configure its parameters
- **Template Library**: Pre-built pipelines (Research & Report, Support Bot, Code Reviewer)
- **Smart Validation**: Connection compatibility checking with copilot feedback

### Node Types

| Node | Purpose | Configuration |
|------|---------|---------------|
| 🟢 **INPUT** | Entry point for user data | Label |
| 🔵 **LLM** | AI model execution | Model selection, system prompt, temperature |
| 🟠 **TOOL** | External tool integration | Tool type (search, code, file, API) |
| 🟣 **AGENT** | Multi-step autonomous agents | Goal, max steps, available tools |
| 🔷 **ROUTER** | Conditional flow routing | Routing conditions |
| 🔴 **OUTPUT** | Pipeline output | Label |

### AI Copilot
- **Live Commentary**: Claude provides real-time guidance as you build
- **Smart Suggestions**: Get default configs when dropping nodes
- **Error Detection**: Immediate feedback on invalid connections
- **Q&A Support**: Ask questions about your pipeline

### Code Generation & Export
- **🚀 Ship It**: Generate production-ready Python code
- **Complete Projects**: Download ZIP with:
  - `pipeline.py` - Your executable pipeline
  - `.env` - API key configuration
  - `requirements.txt` - Dependencies
  - `README.md` - Setup instructions
- **Multi-LLM Support**: Anthropic, OpenAI, Google models

### Test Runner
- **▶ Test Run**: Execute your pipeline with sample input
- **Real-time Logs**: Watch nodes execute in sequence
- **Status Visualization**: Animated node states (idle → running → done/error)
- **Execution Timeline**: Timestamped logs with color-coded status

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🎨 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Flow (@xyflow/react)** - Node-based canvas
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **JSZip** - Project export

## 📖 Usage Guide

### Building Your First Pipeline

1. **Start Simple**: Use the intent input to describe what you want:
   ```
   "Build a chatbot that answers questions about my docs"
   ```
   Click **Generate Pipeline** to get an AI-generated starting point.

2. **Or Build Manually**:
   - Drag nodes from the left sidebar onto the canvas
   - Connect them by dragging from output handle to input handle
   - Click any node to configure its settings

3. **Configure Nodes**:
   - **LLM nodes**: Choose model, write system prompts, adjust temperature
   - **Tool nodes**: Select tool type and configure parameters
   - **Agent nodes**: Define goals and set max execution steps
   - **Router nodes**: Describe routing logic in plain English

4. **Test Your Pipeline**:
   - Click **▶ Test Run** to execute with sample input
   - Watch the bottom drawer for real-time execution logs
   - See nodes light up as they process

5. **Ship It**:
   - Click **🚀 Ship It** when ready
   - Add your API keys (optional - can be added later)
   - Click **📦 Download Project**
   - Extract the ZIP and follow the README

### Templates

Speed up development with pre-built templates:

- **Research & Report**: Web search → LLM synthesis → Report output
- **Support Bot**: Router → KB search/LLM → Response
- **Code Reviewer**: Agent analyzer → LLM reviewer → Report

## 🎨 Design System

### Color Palette
- **Background Base**: `#0a0a0f`
- **Canvas**: `#0e0e16`
- **Panels**: `#13131f`
- **Accent (Indigo)**: `#6366f1`
- **Accent (Cyan)**: `#22d3ee`
- **Success**: `#10b981`
- **Error**: `#f43f5e`

### Typography
- **Headings**: Syne (Google Fonts)
- **Body/Code**: JetBrains Mono (Google Fonts)

### Node Colors
Each node type has a signature color for instant recognition:
- Input: Green `#10b981`
- LLM: Indigo `#6366f1`
- Tool: Amber `#f59e0b`
- Agent: Violet `#8b5cf6`
- Router: Cyan `#22d3ee`
- Output: Rose `#f43f5e`

## 🔧 Development

### Project Structure

```
src/
├── components/
│   ├── nodes/          # Custom node components
│   │   ├── InputNode.tsx
│   │   ├── LLMNode.tsx
│   │   ├── ToolNode.tsx
│   │   ├── AgentNode.tsx
│   │   ├── RouterNode.tsx
│   │   └── OutputNode.tsx
│   ├── Canvas.tsx      # React Flow canvas
│   ├── Sidebar.tsx     # Node palette
│   ├── Topbar.tsx      # Intent input & actions
│   ├── CopilotPanel.tsx    # AI assistant
│   ├── ConfigPanel.tsx     # Node configuration
│   ├── ShipItModal.tsx     # Code export
│   └── TestRunOverlay.tsx  # Test execution
├── store/
│   └── pipelineStore.ts    # Zustand state
├── lib/
│   └── apiClient.ts        # API abstraction
├── mocks/
│   └── api.ts              # Mock backend (Day 1)
├── App.tsx
└── main.tsx
```

### Environment Variables

The `.env.local` file is already configured:

```env
VITE_USE_MOCK=true              # Use mock API (set to false for real backend)
VITE_API_URL=http://localhost:3001
```

### Mock API

The app includes a complete mock API for frontend development without a backend:
- Pipeline generation from intent
- Connection validation
- Code generation
- Test execution
- Template loading

To switch to a real backend, set `VITE_USE_MOCK=false` and implement the API endpoints.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Use TypeScript for type safety
- Follow the existing component structure
- Keep components focused and reusable
- Use inline styles for now (consistent with current approach)
- Add meaningful comments for complex logic

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React Flow](https://reactflow.dev/)
- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Inspired by node-based editors like Blender, Unreal Engine, and TouchDesigner

## 🔮 Roadmap

- [ ] Real backend integration with Claude API
- [ ] More node types (DB, API, Transform, Filter)
- [ ] Custom node creation UI
- [ ] Version control & pipeline history
- [ ] Collaborative editing
- [ ] Python/Node.js SDK export options
- [ ] Deployment to serverless platforms
- [ ] Monitoring & analytics dashboard

---

**Built with ⚡ by the Forge team**
