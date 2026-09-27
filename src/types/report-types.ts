import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema
} from './analysis-results';

/**
 * Complete Review Report Schema
 * Aggregates all subagent results into a unified report
 */
export const ReviewReportSchema = z.object({
  pullRequest: z.object({
    owner: z.string(),
    repo: z.string(),
    number: z.number().positive() // PR numbers must be positive integers
  }),
  fileReviews: z.array(z.object({
    file: z.string(),
    codeQuality: CodeQualityResultSchema,
    testCoverage: TestCoverageResultSchema,
    refactorings: RefactoringSuggestionSchema
  })),
  summary: z.object({
    totalFiles: z.number().min(0), // Cannot be negative
    overallScore: z.number().min(0).max(100), // Score must be 0-100
    criticalIssues: z.number().min(0), // Cannot be negative
    highPriorityTests: z.number().min(0), // Cannot be negative
    refactoringOpportunities: z.number().min(0) // Cannot be negative
  }),
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.string(),
    description: z.string(),
    files: z.array(z.string())
  })),
  metadata: z.object({
    analyzedAt: z.string(),
    duration: z.number().min(0), // Duration cannot be negative
    agentVersions: z.record(z.string())
  })
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

type JsonSchema = Record<string, unknown>;
const toJsonSchema = (schema: z.ZodTypeAny): JsonSchema =>
  (zodToJsonSchema as (s: unknown, options?: unknown) => unknown)(
    schema,
    { $refStrategy: 'root' }
  ) as JsonSchema;

/**
 * JSON Schema for SDK structured outputs
 * Per SDK docs: https://platform.claude.com/docs/en/agent-sdk/structured-outputs
 * Use $refStrategy: 'root' to properly inline all $ref definitions
 */
const rawSchema: JsonSchema = toJsonSchema(ReviewReportSchema);

// Extract the actual schema - zodToJsonSchema may wrap it with extra properties
export const ReviewReportJSONSchema = rawSchema;
