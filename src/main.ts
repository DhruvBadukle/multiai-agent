import 'dotenv/config';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';
import { ReviewError, ErrorCodes, formatError } from './utils/error-handler.js';

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = ['ANTHROPIC_MODEL', 'PROJECT_ROOT'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new ReviewError(
      `Missing required environment variables: ${missing.join(', ')}`,
      ErrorCodes.INVALID_CONFIG,
      { missing }
    );
  }

  // Check API key (may be in ANTHROPIC_API_KEY or already in environment for Vocareum)
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_BASE_URL) {
    logger.warn('Neither ANTHROPIC_API_KEY nor ANTHROPIC_BASE_URL is set. This may fail unless credentials are in your environment.');
  }

  logger.info('Environment validation passed', {
    model: process.env.ANTHROPIC_MODEL,
    projectRoot: process.env.PROJECT_ROOT,
    hasGitHubToken: !!process.env.GITHUB_TOKEN
  });
}

/**
 * Parse and validate CLI arguments
 */
function parseArgs(): { owner: string; repo: string; prNumber: number } {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: npm start <owner> <repo> <pr-number>');
    console.error('Example: npm start facebook react 12345');
    console.error('');
    console.error('Options:');
    console.error('  <owner>      Repository owner/organization');
    console.error('  <repo>       Repository name');
    console.error('  <pr-number>  Pull request number');
    process.exit(1);
  }

  // TypeScript doesn't know these are defined due to length check above
  const owner = args[0]!;
  const repo = args[1]!;
  const prNumberStr = args[2]!;
  const prNumber = parseInt(prNumberStr, 10);

  if (isNaN(prNumber) || prNumber <= 0) {
    throw new ReviewError(
      `Invalid PR number: ${prNumberStr}. Must be a positive integer.`,
      ErrorCodes.INVALID_CONFIG,
      { providedValue: prNumberStr }
    );
  }

  return { owner, repo, prNumber };
}

/**
 * Main entry point
 */
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Multi-Agent Code Review Orchestrator                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Validate environment
    validateEnvironment();

    // Parse CLI arguments
    const { owner, repo, prNumber } = parseArgs();

    logger.info('Starting code review orchestrator', {
      owner,
      repo,
      prNumber,
      timestamp: new Date().toISOString()
    });

    console.log(`Reviewing PR #${prNumber} in ${owner}/${repo}...`);
    console.log('');

    // Create orchestrator
    const orchestrator = new CodeReviewOrchestrator();

    // Execute review
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // Generate Markdown report (user's requirement)
    const reportGenerator = new ReportGenerator();
    const markdownReport = reportGenerator.generateMarkdownReport(report);

    // Display report
    console.log('='.repeat(60));
    console.log('CODE REVIEW REPORT');
    console.log('='.repeat(60));
    console.log('');
    console.log(markdownReport);
    console.log('');

    logger.info('Code review completed successfully', {
      owner,
      repo,
      prNumber,
      score: report.summary.overallScore,
      duration: report.metadata.duration,
      filesReviewed: report.summary.totalFiles,
      criticalIssues: report.summary.criticalIssues,
      timestamp: new Date().toISOString()
    });

    console.log(`\n✅ Review completed in ${(report.metadata.duration / 1000).toFixed(1)}s`);
    console.log(`   Overall Score: ${report.summary.overallScore}/100`);
    console.log(`   Files Reviewed: ${report.summary.totalFiles}`);

    process.exit(0);

  } catch (error) {
    const formattedError = formatError(error);

    logger.error('Code review failed', {
      error: formattedError,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    console.error('');
    console.error('❌ Code review failed');
    console.error('');
    console.error(`Error: ${formattedError}`);
    console.error('');

    if (error instanceof ReviewError) {
      console.error(`Error Code: ${error.code}`);
      if (error.metadata) {
        console.error('Details:', JSON.stringify(error.metadata, null, 2));
      }
    }

    console.error('');
    console.error('Check logs for more details.');

    process.exit(1);
  }
}

main();
