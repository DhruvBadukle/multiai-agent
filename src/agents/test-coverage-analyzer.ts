import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/index.js';

/**
 * Test Coverage Analyzer Agent
 *
 * Evaluates test completeness and identifies untested code paths.
 * Uses Grep to find test files, Read for file access, and Skills for guidance.
 */
export function createTestCoverageAnalyzer(): AgentDefinition {
  return {
    description: 'Evaluates test completeness and identifies untested code paths',
    prompt: TEST_COVERAGE_ANALYZER_PROMPT,
    model: 'haiku', // Simpler pattern matching task - use cheaper model
    tools: ['Read', 'Skill', 'Grep'],
  };
}
