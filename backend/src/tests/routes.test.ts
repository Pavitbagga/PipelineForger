import request from 'supertest';
import express from 'express';
import cors from 'cors';
import intentRouter from '../routes/intent';
import validateRouter from '../routes/validate';
import shipRouter from '../routes/ship';

// Mock the Claude API to avoid actual API calls during tests
jest.mock('../lib/claude', () => ({
  askClaude: jest.fn((system: string, user: string) => {
    // Mock different responses based on the request
    if (user.includes('Build a pipeline')) {
      return Promise.resolve(JSON.stringify({
        nodes: [
          {
            id: 'node_1',
            type: 'input',
            position: { x: 100, y: 300 },
            config: {},
            inputs: [],
            outputs: ['text']
          },
          {
            id: 'node_2',
            type: 'llm',
            position: { x: 350, y: 300 },
            config: {
              model: 'claude-sonnet-4-20250514',
              systemPrompt: 'You are helpful',
              temperature: 0.7
            },
            inputs: ['text'],
            outputs: ['text']
          },
          {
            id: 'node_3',
            type: 'output',
            position: { x: 600, y: 300 },
            config: {},
            inputs: ['text'],
            outputs: []
          }
        ],
        edges: [
          { id: 'e1', source: 'node_1', target: 'node_2' },
          { id: 'e2', source: 'node_2', target: 'node_3' }
        ]
      }));
    }

    if (user.includes('Generate Python')) {
      return Promise.resolve(`import anthropic

client = anthropic.Anthropic()

def run_pipeline(user_input: str):
    return "Generated code"
`);
    }

    return Promise.resolve(JSON.stringify({ nodes: [], edges: [] }));
  }),
}));

// Create a test app
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/generate-pipeline', intentRouter);
  app.use('/api/validate-connection', validateRouter);
  app.use('/api/generate-code', shipRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}

describe('Backend API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/generate-pipeline', () => {
    it('should return nodes and edges for valid intent', async () => {
      const response = await request(app)
        .post('/api/generate-pipeline')
        .send({ intent: 'Build a simple chatbot' })
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.edges)).toBe(true);
      expect(response.body.nodes.length).toBeGreaterThan(0);
    });

    it('should accept description field for backwards compatibility', async () => {
      const response = await request(app)
        .post('/api/generate-pipeline')
        .send({ description: 'Build a simple chatbot' })
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
    });

    it('should return 400 for missing intent and description', async () => {
      const response = await request(app)
        .post('/api/generate-pipeline')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty string intent', async () => {
      const response = await request(app)
        .post('/api/generate-pipeline')
        .send({ intent: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should verify each node has required fields', async () => {
      const response = await request(app)
        .post('/api/generate-pipeline')
        .send({ intent: 'Build a pipeline' })
        .expect(200);

      response.body.nodes.forEach((node: any) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('config');
        expect(node.position).toHaveProperty('x');
        expect(node.position).toHaveProperty('y');
      });
    });
  });

  describe('POST /api/validate-connection', () => {
    it('should return compatible=true for input → llm', async () => {
      const response = await request(app)
        .post('/api/validate-connection')
        .send({ sourceType: 'input', targetType: 'llm' })
        .expect(200);

      expect(response.body).toHaveProperty('compatible');
      expect(response.body.compatible).toBe(true);
      expect(response.body).toHaveProperty('message');
    });

    it('should return compatible=true for llm → output', async () => {
      const response = await request(app)
        .post('/api/validate-connection')
        .send({ sourceType: 'llm', targetType: 'output' })
        .expect(200);

      expect(response.body).toHaveProperty('compatible');
      expect(response.body.compatible).toBe(true);
    });

    it('should return compatible=false for output → input', async () => {
      const response = await request(app)
        .post('/api/validate-connection')
        .send({ sourceType: 'output', targetType: 'input' })
        .expect(200);

      expect(response.body).toHaveProperty('compatible');
      expect(response.body.compatible).toBe(false);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing sourceType', async () => {
      const response = await request(app)
        .post('/api/validate-connection')
        .send({ targetType: 'llm' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing targetType', async () => {
      const response = await request(app)
        .post('/api/validate-connection')
        .send({ sourceType: 'input' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/generate-code', () => {
    it('should return code and requiredKeys for valid pipeline', async () => {
      const validPipeline = {
        nodes: [
          {
            id: 'node_1',
            type: 'input',
            position: { x: 100, y: 300 },
            config: {},
          },
          {
            id: 'node_2',
            type: 'llm',
            position: { x: 350, y: 300 },
            config: {
              model: 'claude-sonnet-4-20250514',
              systemPrompt: 'You are helpful',
              temperature: 0.7,
            },
          },
          {
            id: 'node_3',
            type: 'output',
            position: { x: 600, y: 300 },
            config: {},
          },
        ],
        edges: [
          { id: 'e1', source: 'node_1', target: 'node_2' },
          { id: 'e2', source: 'node_2', target: 'node_3' },
        ],
      };

      const response = await request(app)
        .post('/api/generate-code')
        .send(validPipeline)
        .expect(200);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('requiredKeys');
      expect(typeof response.body.code).toBe('string');
      expect(response.body.code.length).toBeGreaterThan(0);
      expect(Array.isArray(response.body.requiredKeys)).toBe(true);
    });

    it('should return 400 for missing nodes', async () => {
      const response = await request(app)
        .post('/api/generate-code')
        .send({ edges: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing edges', async () => {
      const response = await request(app)
        .post('/api/generate-code')
        .send({ nodes: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
