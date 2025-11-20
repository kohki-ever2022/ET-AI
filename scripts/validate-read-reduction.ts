/**
 * Read Reduction Validation Script
 *
 * This script validates the 95% read reduction goal by calling the Cloud Function
 * and generating a comprehensive report.
 *
 * Usage:
 *   1. Ensure Firebase Functions are deployed
 *   2. Configure Firebase app in this script
 *   3. Run: npx ts-node scripts/validate-read-reduction.ts
 */

import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Uncomment to use local emulator
// connectFunctionsEmulator(functions, 'localhost', 5001);

interface ValidationScenario {
  scenario: string;
  baseline: {
    reads: number;
    duration: number;
    cost: number;
  };
  optimized: {
    reads: number;
    duration: number;
    cost: number;
  };
  reduction: {
    reads: number;
    percentage: number;
    duration: number;
    cost: number;
  };
  goalAchieved: boolean;
}

interface ValidationResult {
  success: boolean;
  validation: {
    timestamp: Date;
    scenarios: ValidationScenario[];
    overall: {
      totalBaselineReads: number;
      totalOptimizedReads: number;
      totalReduction: number;
      totalReductionPercentage: number;
      goalAchieved: boolean;
    };
    recommendations: string[];
  };
  report: string;
}

async function runValidation(): Promise<ValidationResult> {
  console.log('🔄 Calling validateReadReduction Cloud Function...\n');

  try {
    const validateReadReduction = httpsCallable<any, ValidationResult>(
      functions,
      'validateReadReduction'
    );

    const result = await validateReadReduction({});

    if (!result.data.success) {
      throw new Error('Validation failed');
    }

    return result.data;
  } catch (error) {
    console.error('❌ Error calling Cloud Function:', error);
    throw error;
  }
}

function printReport(result: ValidationResult): void {
  const { validation } = result;

  console.log('=' .repeat(80));
  console.log('📊 READ REDUCTION VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log();

  console.log(`Generated: ${new Date(validation.timestamp).toLocaleString()}`);
  console.log();

  console.log('📈 OVERALL RESULTS');
  console.log('-'.repeat(80));
  console.log(`Goal: 95% read reduction`);
  console.log(`Achieved: ${validation.overall.totalReductionPercentage.toFixed(2)}%`);
  console.log(
    `Status: ${validation.overall.goalAchieved ? '✅ PASSED' : '⚠️  IN PROGRESS'}`
  );
  console.log();

  console.log(`Baseline Total Reads:  ${validation.overall.totalBaselineReads.toLocaleString()}`);
  console.log(`Optimized Total Reads: ${validation.overall.totalOptimizedReads.toLocaleString()}`);
  console.log(`Reads Saved:           ${validation.overall.totalReduction.toLocaleString()}`);
  console.log(`Reduction Percentage:  ${validation.overall.totalReductionPercentage.toFixed(2)}%`);
  console.log();

  console.log('📋 SCENARIO RESULTS');
  console.log('-'.repeat(80));

  validation.scenarios.forEach((scenario, index) => {
    console.log();
    console.log(`${index + 1}. ${scenario.scenario}`);
    console.log(`   Reduction: ${scenario.reduction.percentage.toFixed(2)}% ${
      scenario.goalAchieved ? '✅' : '⚠️ '
    }`);
    console.log();

    console.log(`   Metric             Baseline    Optimized   Reduction`);
    console.log(`   ${'─'.repeat(60)}`);

    const readsReduction = scenario.reduction.reads;
    const readsReductionPct = scenario.reduction.percentage.toFixed(1);
    console.log(
      `   Reads              ${String(scenario.baseline.reads).padEnd(
        12
      )}${String(scenario.optimized.reads).padEnd(
        12
      )}${readsReduction} (${readsReductionPct}%)`
    );

    const durationReduction = scenario.reduction.duration;
    console.log(
      `   Duration (ms)      ${String(scenario.baseline.duration).padEnd(
        12
      )}${String(scenario.optimized.duration).padEnd(
        12
      )}${durationReduction}`
    );

    const costReduction = scenario.reduction.cost.toFixed(6);
    console.log(
      `   Cost ($)           ${String(scenario.baseline.cost.toFixed(6)).padEnd(
        12
      )}${String(scenario.optimized.cost.toFixed(6)).padEnd(12)}${costReduction}`
    );
  });

  console.log();
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(80));

  validation.recommendations.forEach((rec) => {
    console.log(`   ${rec}`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log();
}

function saveReportToFile(result: ValidationResult): void {
  const { validation, report } = result;

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const reportDir = path.join(__dirname, '..', 'reports');
  const reportPath = path.join(reportDir, `validation-report-${timestamp}.md`);

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Save markdown report
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report saved to: ${reportPath}`);

  // Save JSON data
  const jsonPath = path.join(reportDir, `validation-data-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(validation, null, 2));
  console.log(`✅ Data saved to: ${jsonPath}`);

  // Create summary CSV
  const csvPath = path.join(reportDir, `validation-summary-${timestamp}.csv`);
  const csvRows = [
    'Scenario,Baseline Reads,Optimized Reads,Reduction %,Goal Achieved',
    ...validation.scenarios.map((s) =>
      [
        `"${s.scenario}"`,
        s.baseline.reads,
        s.optimized.reads,
        s.reduction.percentage.toFixed(2),
        s.goalAchieved ? 'Yes' : 'No',
      ].join(',')
    ),
    [
      '"Overall"',
      validation.overall.totalBaselineReads,
      validation.overall.totalOptimizedReads,
      validation.overall.totalReductionPercentage.toFixed(2),
      validation.overall.goalAchieved ? 'Yes' : 'No',
    ].join(','),
  ];

  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ CSV saved to: ${csvPath}`);
  console.log();
}

async function main() {
  console.log('\n🚀 Starting Read Reduction Validation...\n');

  try {
    // Run validation
    const result = await runValidation();

    // Print report to console
    printReport(result);

    // Save reports to files
    saveReportToFile(result);

    // Exit with appropriate code
    const exitCode = result.validation.overall.goalAchieved ? 0 : 1;

    if (exitCode === 0) {
      console.log('🎉 Validation PASSED! 95% reduction goal achieved!');
    } else {
      console.log('⚠️  Validation IN PROGRESS. Goal not yet achieved.');
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Validation failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { runValidation, printReport, saveReportToFile };
