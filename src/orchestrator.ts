import { query } from '@anthropic-ai/claude-agent-sdk';
import { ReviewReport, ReviewReportSchema } from './types/report-types.js';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  CodeQualityResult,
  TestCoverageResult,
  RefactoringSuggestion,
} from './types/analysis-results.js';
import {
  createCodeQualityAnalyzer,
  createTestCoverageAnalyzer,
  createRefactoringSuggester,
} from './agents/index.js';
import { buildOrchestratorPrompt } from './prompts/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { logReviewStart, logReviewComplete, logReviewError } from './utils/logger.js';
import { withRetry, withTimeout, ReviewError, ErrorCodes } from './utils/error-handler.js';

/**
 * Async generator for SDK input (streaming pattern)
 */
async function* generateMessages(userMessage: string) {
  yield {
    type: "user" as const,
    message: { role: "user" as const, content: userMessage },
    parent_tool_use_id: null,
    session_id: "code-review-session",
  };
}

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
  timeout?: number; // milliseconds
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private model: string;
  private maxTurns: number;
  private timeout: number;

  constructor(options: OrchestratorOptions = {}) {
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxTurns = options.maxTurns || 50; // High for parallel agents
    this.timeout = options.timeout || 300000; // 5 minutes default
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();
    logReviewStart(owner, repo, prNumber);

    try {
      // Wrap entire process with retry and timeout
      return await withRetry(
        () => withTimeout(
          () => this._reviewPullRequestInternal(owner, repo, prNumber, startTime),
          this.timeout,
          `Code review timed out after ${this.timeout}ms`
        ),
        3, // maxRetries
        1000 // base delay
      );
    } catch (error) {
      logReviewError(owner, repo, prNumber, error as Error);
      throw error;
    }
  }

  /**
   * Internal review implementation
   */
  private async _reviewPullRequestInternal(
    owner: string,
    repo: string,
    prNumber: number,
    startTime: number
  ): Promise<ReviewReport> {
    // Step 1: Fetch PR files using GitHub MCP
    const files = await this._fetchPRFiles(owner, repo, prNumber);

    if (files.length === 0) {
      throw new ReviewError(
        `No files found in PR #${prNumber}`,
        ErrorCodes.PR_NOT_FOUND,
        { owner, repo, prNumber }
      );
    }

    // Step 2: Create subagent definitions
    const subagents = {
      'code-quality': createCodeQualityAnalyzer(),
      'test-coverage': createTestCoverageAnalyzer(),
      'refactoring': createRefactoringSuggester(),
    };

    // Step 3: Build orchestrator prompt
    const orchestratorPrompt = buildOrchestratorPrompt(owner, repo, prNumber, files);

    // Step 4: Execute orchestration (agents run in parallel)
    const fileReviews = await this._executeParallelReview(files, orchestratorPrompt, subagents);

    // Step 5: Aggregate results
    const report = this._aggregateResults(owner, repo, prNumber, fileReviews, startTime);

    // Step 6: Validate with Zod
    const validatedReport = ReviewReportSchema.parse(report);

    const duration = Date.now() - startTime;
    logReviewComplete(owner, repo, prNumber, validatedReport.summary.overallScore, duration);

    return validatedReport;
  }

  /**
   * Fetch PR files from GitHub MCP
   */
  private async _fetchPRFiles(owner: string, repo: string, prNumber: number): Promise<string[]> {
    const prompt = `Use the GitHub MCP server to fetch the list of files changed in pull request #${prNumber} in ${owner}/${repo}.

Extract the file paths from the PR and return them in the structured output format.`;

    // Define schema for structured output
    const fileListSchema = {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "List of file paths changed in the PR"
        }
      },
      required: ["files"]
    };

    let fileList: string[] = [];

    try {
      for await (const message of query({
        prompt: generateMessages(prompt),
        options: {
          mcpServers: mcpServersConfig,
          allowedTools: ['mcp__github__*'],
          model: 'haiku', // Simple task
          maxTurns: 5,
          outputFormat: {
            type: 'json_schema',
            schema: fileListSchema
          }
        },
      })) {
        if (message.type === 'result' && message.subtype === 'success') {
          // With structured output, result should be in structured_output
          if (message.structured_output) {
            const output = message.structured_output as { files: string[] };
            if (output.files && Array.isArray(output.files)) {
              fileList = output.files;
            }
          } else if (message.result) {
            // Fallback: try parsing result as JSON
            try {
              const parsed = JSON.parse(message.result);
              if (parsed.files && Array.isArray(parsed.files)) {
                fileList = parsed.files;
              } else if (Array.isArray(parsed)) {
                fileList = parsed;
              }
            } catch {
              throw new ReviewError(
                'Failed to parse PR files from GitHub MCP',
                ErrorCodes.GITHUB_API_ERROR,
                { response: message.result }
              );
            }
          }
        }
      }
    } catch (error) {
      throw new ReviewError(
        `Failed to fetch PR files: ${(error as Error).message}`,
        ErrorCodes.GITHUB_API_ERROR,
        { owner, repo, prNumber, error: (error as Error).message }
      );
    }

    return fileList;
  }

  /**
   * Extract JSON from markdown code fences if present
   */
  private _extractJSON(text: string): string {
    // Remove markdown code fences like ```json ... ``` or ``` ... ```
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }

  /**
   * Execute parallel review with all subagents
   * The orchestrator coordinates subagents and returns aggregated JSON
   */
  private async _executeParallelReview(
    files: string[],
    orchestratorPrompt: string,
    subagents: Record<string, any>
  ): Promise<any[]> {
    let fileReviews: any[] = [];

    try {
      for await (const message of query({
        prompt: generateMessages(orchestratorPrompt),
        options: {
          allowedTools: ['Task'],
          agents: subagents,
          model: this.model,
          maxTurns: this.maxTurns,
        },
      })) {
        // Wait for final result from orchestrator
        if (message.type === 'result' && message.subtype === 'success') {
          try {
            // Strip markdown code fences if present
            const cleanedResult = this._extractJSON(message.result);

            // Orchestrator returns aggregated JSON with all file reviews
            const result = JSON.parse(cleanedResult);

            if (result.fileReviews && Array.isArray(result.fileReviews)) {
              // Validate each file review
              for (const fileReview of result.fileReviews) {
                // Validate schemas
                const validated = {
                  file: fileReview.file,
                  codeQuality: CodeQualityResultSchema.parse(fileReview.codeQuality),
                  testCoverage: TestCoverageResultSchema.parse(fileReview.testCoverage),
                  refactorings: RefactoringSuggestionSchema.parse(fileReview.refactorings),
                };
                fileReviews.push(validated);
              }
            }
          } catch (parseError) {
            throw new ReviewError(
              `Failed to parse orchestrator result: ${(parseError as Error).message}`,
              ErrorCodes.AGENT_FAILED,
              { error: (parseError as Error).message, result: message.result?.substring(0, 500) }
            );
          }
        }
      }
    } catch (error) {
      throw new ReviewError(
        `Parallel review execution failed: ${(error as Error).message}`,
        ErrorCodes.AGENT_FAILED,
        { error: (error as Error).message }
      );
    }

    return fileReviews;
  }

  /**
   * Aggregate results into ReviewReport
   */
  private _aggregateResults(
    owner: string,
    repo: string,
    prNumber: number,
    fileReviews: any[],
    startTime: number
  ): ReviewReport {
    // Calculate summary statistics
    let totalCriticalIssues = 0;
    let totalHighPriorityTests = 0;
    let totalRefactoringOpportunities = 0;
    let totalScore = 0;

    for (const review of fileReviews) {
      // Count critical issues
      totalCriticalIssues += review.codeQuality.issues.filter(
        (i: any) => i.severity === 'critical'
      ).length;

      // Count high-priority tests
      totalHighPriorityTests += review.testCoverage.untestedPaths.filter(
        (p: any) => p.priority === 'critical' || p.priority === 'high'
      ).length;

      // Count high-impact refactorings
      totalRefactoringOpportunities += review.refactorings.suggestions.filter(
        (s: any) => s.impact === 'high'
      ).length;

      // Sum scores
      totalScore += review.codeQuality.overallScore;
    }

    const overallScore = fileReviews.length > 0
      ? Math.round(totalScore / fileReviews.length)
      : 0;

    // Generate recommendations
    const recommendations = this._generateRecommendations(fileReviews);

    return {
      pullRequest: { owner, repo, number: prNumber },
      fileReviews,
      summary: {
        totalFiles: fileReviews.length,
        overallScore,
        criticalIssues: totalCriticalIssues,
        highPriorityTests: totalHighPriorityTests,
        refactoringOpportunities: totalRefactoringOpportunities,
      },
      recommendations,
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0',
        },
      },
    };
  }

  /**
   * Generate cross-file recommendations
   */
  private _generateRecommendations(fileReviews: any[]): any[] {
    const recommendations: any[] = [];

    // Critical security issues
    const criticalSecurityFiles = fileReviews
      .filter(r => r.codeQuality.issues.some((i: any) => i.severity === 'critical' && i.category === 'security'))
      .map(r => r.file);

    if (criticalSecurityFiles.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'Security',
        description: 'Critical security vulnerabilities detected. Address immediately before merging.',
        files: criticalSecurityFiles,
      });
    }

    // High priority test gaps
    const highTestGapFiles = fileReviews
      .filter(r => r.testCoverage.untestedPaths.some((p: any) => p.priority === 'critical'))
      .map(r => r.file);

    if (highTestGapFiles.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Testing',
        description: 'Critical code paths lack test coverage. Add tests for public APIs and error handlers.',
        files: highTestGapFiles,
      });
    }

    // High-impact refactorings
    const highRefactoringFiles = fileReviews
      .filter(r => r.refactorings.suggestions.some((s: any) => s.impact === 'high'))
      .map(r => r.file);

    if (highRefactoringFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Refactoring',
        description: 'High-impact refactoring opportunities to improve code quality and maintainability.',
        files: highRefactoringFiles,
      });
    }

    // Performance issues
    const performanceIssueFiles = fileReviews
      .filter(r => r.codeQuality.issues.some((i: any) => i.category === 'performance' && (i.severity === 'critical' || i.severity === 'high')))
      .map(r => r.file);

    if (performanceIssueFiles.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Performance',
        description: 'Significant performance issues detected. Review algorithmic complexity and memory usage.',
        files: performanceIssueFiles,
      });
    }

    return recommendations;
  }
}
