import {
  mockGeneratePipeline,
  mockValidateConnection,
  mockGenerateCode,
  mockTestRun,
  mockLoadTemplate,
} from '../mocks/api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = {
  generatePipeline: async (intent: string) => {
    if (USE_MOCK) {
      return mockGeneratePipeline(intent);
    }
    const response = await fetch(`${API_URL}/api/generate-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    });
    return response.json();
  },

  validateConnection: async (sourceType: string, targetType: string) => {
    if (USE_MOCK) {
      return mockValidateConnection(sourceType, targetType);
    }
    const response = await fetch(`${API_URL}/api/validate-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType, targetType }),
    });
    return response.json();
  },

  generateCode: async (pipeline: any) => {
    if (USE_MOCK) {
      return mockGenerateCode();
    }
    const response = await fetch(`${API_URL}/api/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline }),
    });
    return response.json();
  },

  testRun: async (pipeline: any, input: string) => {
    if (USE_MOCK) {
      return mockTestRun(pipeline, input);
    }
    const response = await fetch(`${API_URL}/api/test-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline, input }),
    });
    return response.json();
  },

  loadTemplate: async (templateName: string) => {
    if (USE_MOCK) {
      return mockLoadTemplate(templateName);
    }
    const response = await fetch(`${API_URL}/api/template/${templateName}`);
    return response.json();
  },
};
