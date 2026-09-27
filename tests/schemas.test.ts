declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect(actual: unknown): {
  toThrow(): void;
  not: { toThrow(): void };
};

import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
} from '../src/types/analysis-results.js';
import { ReviewReportSchema } from '../src/types/report-types.js';

describe('Analysis Result Schemas', () => {
  describe('CodeQualityResultSchema', () => {
    it('should validate a correct code quality result', () => {
      const validResult = {
        file: 'src/utils/helper.ts',
        issues: [
          {
            line: 42,
            severity: 'high',
            category: 'security',
            description: 'Potential SQL injection vulnerability',
            suggestion: 'Use parameterized queries instead of string concatenation'
          }
        ],
        overallScore: 75,
        summary: 'Found 1 security issue that should be addressed'
      };

      expect(() => CodeQualityResultSchema.parse(validResult)).not.toThrow();
    });

    it('should reject invalid severity values', () => {
      const invalidResult = {
        file: 'src/utils/helper.ts',
        issues: [
          {
            line: 42,
            severity: 'super-critical', // Invalid severity
            category: 'security',
            description: 'Issue',
            suggestion: 'Fix it'
          }
        ],
        overallScore: 75,
        summary: 'Summary'
      };

      expect(() => CodeQualityResultSchema.parse(invalidResult)).toThrow();
    });

    it('should reject score outside 0-100 range', () => {
      const invalidScore = {
        file: 'src/utils/helper.ts',
        issues: [],
        overallScore: 150, // Invalid score > 100
        summary: 'Perfect code'
      };

      expect(() => CodeQualityResultSchema.parse(invalidScore)).toThrow();
    });

    it('should reject missing required fields', () => {
      const missingFile = {
        issues: [],
        overallScore: 85,
        summary: 'Good'
      };

      expect(() => CodeQualityResultSchema.parse(missingFile)).toThrow();
    });

    it('should validate empty issues array', () => {
      const noIssues = {
        file: 'src/perfect.ts',
        issues: [],
        overallScore: 100,
        summary: 'No issues found'
      };

      expect(() => CodeQualityResultSchema.parse(noIssues)).not.toThrow();
    });
  });

  describe('TestCoverageResultSchema', () => {
    it('should validate a correct test coverage result', () => {
      const validResult = {
        file: 'src/api/client.ts',
        hasTests: true,
        testFiles: ['tests/api/client.test.ts'],
        untestedPaths: [
          {
            type: 'function',
            location: 'handleError() at line 58',
            priority: 'critical',
            reasoning: 'Error handling is security-critical',
            suggestedTest: 'should handle malformed API responses gracefully'
          }
        ],
        coverageEstimate: 75,
        summary: 'Good test coverage but missing error case tests'
      };

      expect(() => TestCoverageResultSchema.parse(validResult)).not.toThrow();
    });

    it('should reject invalid path type', () => {
      const invalidType = {
        file: 'src/api/client.ts',
        hasTests: true,
        testFiles: [],
        untestedPaths: [
          {
            type: 'module', // Invalid type
            location: 'someFunction()',
            priority: 'high',
            reasoning: 'Important',
            suggestedTest: 'Test it'
          }
        ],
        coverageEstimate: 50,
        summary: 'Summary'
      };

      expect(() => TestCoverageResultSchema.parse(invalidType)).toThrow();
    });

    it('should reject invalid priority value', () => {
      const invalidPriority = {
        file: 'src/api/client.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'function',
            location: 'test()',
            priority: 'urgent', // Invalid priority
            reasoning: 'Important',
            suggestedTest: 'Test it'
          }
        ],
        coverageEstimate: 0,
        summary: 'No tests'
      };

      expect(() => TestCoverageResultSchema.parse(invalidPriority)).toThrow();
    });

    it('should validate hasTests: false with empty testFiles', () => {
      const noTests = {
        file: 'src/untested.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 0,
        summary: 'No test coverage'
      };

      expect(() => TestCoverageResultSchema.parse(noTests)).not.toThrow();
    });

    it('should reject coverage estimate outside 0-100', () => {
      const invalidCoverage = {
        file: 'src/test.ts',
        hasTests: true,
        testFiles: ['test.test.ts'],
        untestedPaths: [],
        coverageEstimate: -10, // Invalid negative coverage
        summary: 'Bad'
      };

      expect(() => TestCoverageResultSchema.parse(invalidCoverage)).toThrow();
    });
  });

  describe('RefactoringSuggestionSchema', () => {
    it('should validate a correct refactoring suggestion', () => {
      const validResult = {
        file: 'src/components/Form.tsx',
        suggestions: [
          {
            type: 'extract-function',
            location: 'Lines 42-80 in validateForm()',
            impact: 'medium',
            description: 'Extract validation logic into separate validators',
            before: 'if (email && !email.includes("@")) { ... }',
            after: 'if (!isValidEmail(email)) { ... }',
            benefits: 'Improved testability and reusability'
          }
        ],
        summary: 'Several opportunities to improve code organization'
      };

      expect(() => RefactoringSuggestionSchema.parse(validResult)).not.toThrow();
    });

    it('should reject invalid refactoring type', () => {
      const invalidType = {
        file: 'src/test.ts',
        suggestions: [
          {
            type: 'delete-everything', // Invalid type
            location: 'Line 1',
            impact: 'high',
            description: 'Delete it',
            before: 'code',
            after: '',
            benefits: 'None'
          }
        ],
        summary: 'Bad idea'
      };

      expect(() => RefactoringSuggestionSchema.parse(invalidType)).toThrow();
    });

    it('should reject invalid impact level', () => {
      const invalidImpact = {
        file: 'src/test.ts',
        suggestions: [
          {
            type: 'simplify',
            location: 'Line 1',
            impact: 'critical', // Invalid impact (should be low/medium/high)
            description: 'Simplify',
            before: 'complex',
            after: 'simple',
            benefits: 'Better'
          }
        ],
        summary: 'Summary'
      };

      expect(() => RefactoringSuggestionSchema.parse(invalidImpact)).toThrow();
    });

    it('should validate empty suggestions array', () => {
      const noSuggestions = {
        file: 'src/perfect.ts',
        suggestions: [],
        summary: 'Code is already well-structured'
      };

      expect(() => RefactoringSuggestionSchema.parse(noSuggestions)).not.toThrow();
    });
  });
});

describe('ReviewReportSchema', () => {
  it('should validate a complete review report', () => {
    const validReport = {
      pullRequest: {
        owner: 'facebook',
        repo: 'react',
        number: 28000
      },
      fileReviews: [
        {
          file: 'src/index.ts',
          codeQuality: {
            file: 'src/index.ts',
            issues: [],
            overallScore: 95,
            summary: 'Excellent code quality'
          },
          testCoverage: {
            file: 'src/index.ts',
            hasTests: true,
            testFiles: ['tests/index.test.ts'],
            untestedPaths: [],
            coverageEstimate: 90,
            summary: 'Good test coverage'
          },
          refactorings: {
            file: 'src/index.ts',
            suggestions: [],
            summary: 'Well-structured code'
          }
        }
      ],
      summary: {
        totalFiles: 1,
        overallScore: 95,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 45000,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0'
        }
      }
    };

    expect(() => ReviewReportSchema.parse(validReport)).not.toThrow();
  });

  it('should reject invalid PR number', () => {
    const invalidPR = {
      pullRequest: {
        owner: 'facebook',
        repo: 'react',
        number: -1 // Invalid negative PR number
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 0,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 1000,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0'
        }
      }
    };

    expect(() => ReviewReportSchema.parse(invalidPR)).toThrow();
  });

  it('should reject missing required fields', () => {
    const missingFields = {
      pullRequest: {
        owner: 'test',
        repo: 'repo'
        // Missing number
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 0
        // Missing other required summary fields
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 1000
        // Missing agentVersions
      }
    };

    expect(() => ReviewReportSchema.parse(missingFields)).toThrow();
  });

  it('should validate report with recommendations', () => {
    const withRecommendations = {
      pullRequest: {
        owner: 'test',
        repo: 'repo',
        number: 1
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 50,
        criticalIssues: 2,
        highPriorityTests: 3,
        refactoringOpportunities: 1
      },
      recommendations: [
        {
          priority: 'critical',
          category: 'Security',
          description: 'Fix critical vulnerabilities',
          files: ['src/api.ts', 'src/auth.ts']
        }
      ],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 5000,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0'
        }
      }
    };

    expect(() => ReviewReportSchema.parse(withRecommendations)).not.toThrow();
  });

  it('should reject invalid summary score', () => {
    const invalidScore = {
      pullRequest: {
        owner: 'test',
        repo: 'repo',
        number: 1
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 150, // Invalid > 100
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 1000,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0'
        }
      }
    };

    expect(() => ReviewReportSchema.parse(invalidScore)).toThrow();
  });

  it('should reject negative counts in summary', () => {
    const negativeCounts = {
      pullRequest: {
        owner: 'test',
        repo: 'repo',
        number: 1
      },
      fileReviews: [],
      summary: {
        totalFiles: -1, // Invalid negative
        overallScore: 50,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 1000,
        agentVersions: {
          'code-quality': 'v1.0.0',
          'test-coverage': 'v1.0.0',
          'refactoring': 'v1.0.0'
        }
      }
    };

    expect(() => ReviewReportSchema.parse(negativeCounts)).toThrow();
  });
});
