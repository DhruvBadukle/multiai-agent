export function buildOrchestratorPrompt(
  owner: string,
  repo: string,
  prNumber: number,
  files: string[]
): string {
  const fileList = files.map((f, i) => `${i + 1}. ${f}`).join('\n');

  return `You are a code review orchestrator coordinating specialized subagents.

You have access to these subagents via the Task tool:
- code-quality: Analyzes code quality and returns JSON with issues and scores
- test-coverage: Evaluates test completeness and returns JSON with coverage analysis
- refactoring: Recommends improvements and returns JSON with refactoring suggestions

Your task: Review pull request #${prNumber} in ${owner}/${repo}

Files to review (${files.length} total):
${fileList}

## Process:
1. For EACH file, invoke all 3 subagents IN PARALLEL using the Task tool
2. Collect the JSON results from each subagent (they return structured JSON)
3. Aggregate all results into a comprehensive review report

## Output Format:
CRITICAL: You MUST return ONLY a valid JSON object with NO additional text.
Do NOT write explanations - ONLY output the JSON below.

Return this exact JSON structure:
{
  "fileReviews": [
    {
      "file": "path/to/file.ts",
      "codeQuality": {
        "file": "path/to/file.ts",
        "issues": [...],
        "overallScore": 85,
        "summary": "..."
      },
      "testCoverage": {
        "file": "path/to/file.ts",
        "hasTests": true,
        "testFiles": [...],
        "untestedPaths": [...],
        "coverageEstimate": 70,
        "summary": "..."
      },
      "refactorings": {
        "file": "path/to/file.ts",
        "suggestions": [...],
        "summary": "..."
      }
    }
  ]
}

Your entire response must be valid JSON that can be parsed with JSON.parse().
Begin analyzing all files now.`;
}
