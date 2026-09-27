import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/index.js';

/**
 * Refactoring Suggester Agent
 *
 * Recommends architectural improvements and refactoring opportunities.
 * Uses Grep for pattern search, Read for file access, and Skills for expertise.
 */
export function createRefactoringSuggester(): AgentDefinition {
  return {
    description: 'Recommends architectural improvements and refactoring opportunities',
    prompt: REFACTORING_SUGGESTER_PROMPT,
    model: 'sonnet', // Strategic thinking and architecture analysis requires complex reasoning
    tools: ['Read', 'Skill', 'Grep'],
  };
}
