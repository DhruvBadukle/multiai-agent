import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/index.js';

/**
 * Code Quality Analyzer Agent
 *
 * Analyzes code for quality issues, anti-patterns, and best practice violations.
 * Uses ESLint MCP for linting, Skills for domain expertise, and Read tool for file access.
 */
export function createCodeQualityAnalyzer(): AgentDefinition {
  return {
    description: 'Analyzes code quality, identifies anti-patterns, and suggests best practices',
    prompt: CODE_QUALITY_ANALYZER_PROMPT,
    model: 'sonnet', // Complex reasoning needed for security and pattern analysis
    tools: ['Read', 'Skill', 'mcp__eslint__lint'],
  };
}
