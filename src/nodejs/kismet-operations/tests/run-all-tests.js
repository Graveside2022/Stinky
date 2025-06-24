#!/usr/bin/env node
/**
 * Kismet Testing Suite Runner
 * Runs all tests in the correct order with proper reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const TEST_CATEGORIES = [
    {
        name: 'Unit Tests',
        pattern: 'unit/**/*.test.js',
        timeout: 30000
    },
    {
        name: 'Component Tests', 
        pattern: 'component/**/*.test.js',
        timeout: 45000
    },
    {
        name: 'Integration Tests',
        pattern: 'integration/**/*.test.js',
        timeout: 60000
    },
    {
        name: 'Performance Tests',
        pattern: 'performance/**/*.test.js',
        timeout: 300000, // 5 minutes for load tests
        env: { NODE_ENV: 'test', TEST_URL: process.env.TEST_URL || 'http://localhost:8002' }
    }
];

class TestRunner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            categories: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            }
        };
        this.startTime = Date.now();
    }

    async runTests() {
        console.log('🧪 Kismet Operations Testing Suite');
        console.log('==================================\n');

        // Check if test dependencies are installed
        await this.checkDependencies();

        // Run each test category
        for (const category of TEST_CATEGORIES) {
            await this.runCategory(category);
        }

        // Generate report
        await this.generateReport();

        // Print summary
        this.printSummary();

        return this.results.summary.failed === 0;
    }

    async checkDependencies() {
        console.log('📦 Checking test dependencies...');
        
        const requiredPackages = ['jest', 'supertest', 'ws', 'jsdom'];
        const missing = [];

        for (const pkg of requiredPackages) {
            try {
                require.resolve(pkg);
            } catch (e) {
                missing.push(pkg);
            }
        }

        if (missing.length > 0) {
            console.error(`❌ Missing test dependencies: ${missing.join(', ')}`);
            console.log('📦 Installing missing dependencies...');
            
            await this.runCommand('npm', ['install', '--save-dev', ...missing]);
        }

        console.log('✅ All test dependencies available\n');
    }

    async runCategory(category) {
        console.log(`\n🔍 Running ${category.name}...`);
        console.log('─'.repeat(40));

        const startTime = Date.now();
        
        try {
            const result = await this.runJest(category);
            
            this.results.categories[category.name] = {
                ...result,
                duration: Date.now() - startTime
            };

            if (result.success) {
                console.log(`✅ ${category.name} completed successfully`);
            } else {
                console.log(`❌ ${category.name} failed`);
            }

        } catch (error) {
            console.error(`❌ Error running ${category.name}:`, error.message);
            
            this.results.categories[category.name] = {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async runJest(category) {
        return new Promise((resolve) => {
            const args = [
                '--testMatch', `**/${category.pattern}`,
                '--json',
                '--outputFile', `test-results-${category.name.toLowerCase().replace(/\s+/g, '-')}.json`,
                '--testTimeout', category.timeout.toString(),
                '--forceExit',
                '--detectOpenHandles'
            ];

            if (category.env) {
                args.push('--env', JSON.stringify(category.env));
            }

            const jest = spawn('npx', ['jest', ...args], {
                cwd: __dirname,
                env: { ...process.env, ...category.env },
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            jest.stdout.on('data', (data) => {
                output += data.toString();
                process.stdout.write(data);
            });

            jest.stderr.on('data', (data) => {
                errorOutput += data.toString();
                process.stderr.write(data);
            });

            jest.on('close', async (code) => {
                // Try to read JSON results
                let testResults = {};
                try {
                    const resultsFile = path.join(__dirname, `test-results-${category.name.toLowerCase().replace(/\s+/g, '-')}.json`);
                    const resultsData = await fs.readFile(resultsFile, 'utf8');
                    testResults = JSON.parse(resultsData);
                    
                    // Clean up temp file
                    await fs.unlink(resultsFile).catch(() => {});
                } catch (e) {
                    // Failed to read results, parse from output
                    testResults = this.parseJestOutput(output);
                }

                const result = {
                    success: code === 0,
                    exitCode: code,
                    tests: testResults.numTotalTests || 0,
                    passed: testResults.numPassedTests || 0,
                    failed: testResults.numFailedTests || 0,
                    skipped: testResults.numPendingTests || 0,
                    testResults: testResults.testResults || []
                };

                // Update summary
                this.results.summary.total += result.tests;
                this.results.summary.passed += result.passed;
                this.results.summary.failed += result.failed;
                this.results.summary.skipped += result.skipped;

                resolve(result);
            });
        });
    }

    parseJestOutput(output) {
        // Basic parsing of Jest output when JSON is not available
        const result = {
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            numPendingTests: 0
        };

        const totalMatch = output.match(/Tests:\s+(\d+)\s+total/);
        const passedMatch = output.match(/Tests:.*?(\d+)\s+passed/);
        const failedMatch = output.match(/Tests:.*?(\d+)\s+failed/);
        const skippedMatch = output.match(/Tests:.*?(\d+)\s+skipped/);

        if (totalMatch) result.numTotalTests = parseInt(totalMatch[1]);
        if (passedMatch) result.numPassedTests = parseInt(passedMatch[1]);
        if (failedMatch) result.numFailedTests = parseInt(failedMatch[1]);
        if (skippedMatch) result.numPendingTests = parseInt(skippedMatch[1]);

        return result;
    }

    async generateReport() {
        this.results.summary.duration = Date.now() - this.startTime;

        const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

        console.log(`\n📄 Detailed report saved to: ${reportPath}`);

        // Generate HTML report if all tests passed
        if (this.results.summary.failed === 0) {
            await this.generateHTMLReport();
        }
    }

    async generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Kismet Test Report - ${new Date().toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.passed { background: #e8f5e9; color: #2e7d32; }
        .summary-card.failed { background: #ffebee; color: #c62828; }
        .summary-card.skipped { background: #fff3e0; color: #ef6c00; }
        .summary-card.total { background: #e3f2fd; color: #1565c0; }
        .summary-card h3 { margin: 0; font-size: 36px; }
        .summary-card p { margin: 5px 0 0 0; font-size: 14px; }
        .category { margin: 20px 0; padding: 20px; background: #fafafa; border-radius: 8px; }
        .category.success { border-left: 5px solid #4CAF50; }
        .category.failed { border-left: 5px solid #f44336; }
        .test-details { margin-top: 10px; font-size: 14px; color: #666; }
        .performance-chart { margin: 20px 0; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Kismet Operations Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>${this.results.summary.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="summary-card passed">
                <h3>${this.results.summary.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="summary-card failed">
                <h3>${this.results.summary.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card skipped">
                <h3>${this.results.summary.skipped}</h3>
                <p>Skipped</p>
            </div>
        </div>

        <h2>Test Categories</h2>
        ${Object.entries(this.results.categories).map(([name, category]) => `
            <div class="category ${category.success ? 'success' : 'failed'}">
                <h3>${category.success ? '✅' : '❌'} ${name}</h3>
                <div class="test-details">
                    <p>Tests: ${category.tests || 0} | 
                       Passed: ${category.passed || 0} | 
                       Failed: ${category.failed || 0} | 
                       Duration: ${((category.duration || 0) / 1000).toFixed(2)}s</p>
                    ${category.error ? `<p style="color: red;">Error: ${category.error}</p>` : ''}
                </div>
            </div>
        `).join('')}

        <h2>Execution Details</h2>
        <p>Total execution time: ${(this.results.summary.duration / 1000).toFixed(2)} seconds</p>
        <p>Test environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Node version: ${process.version}</p>

        <div class="footer">
            <p>Kismet Operations Testing Suite v1.0.0</p>
        </div>
    </div>
</body>
</html>
        `;

        const htmlPath = path.join(__dirname, 'test-report.html');
        await fs.writeFile(htmlPath, html);
        console.log(`📊 HTML report saved to: ${htmlPath}`);
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(50));
        
        console.log(`Total Tests:    ${this.results.summary.total}`);
        console.log(`✅ Passed:      ${this.results.summary.passed}`);
        console.log(`❌ Failed:      ${this.results.summary.failed}`);
        console.log(`⏭️  Skipped:     ${this.results.summary.skipped}`);
        console.log(`⏱️  Duration:    ${(this.results.summary.duration / 1000).toFixed(2)}s`);
        
        console.log('\nCategory Results:');
        Object.entries(this.results.categories).forEach(([name, result]) => {
            const status = result.success ? '✅' : '❌';
            const duration = ((result.duration || 0) / 1000).toFixed(2);
            console.log(`  ${status} ${name.padEnd(20)} ${duration}s`);
        });

        if (this.results.summary.failed === 0) {
            console.log('\n✅ All tests passed! 🎉');
        } else {
            console.log(`\n❌ ${this.results.summary.failed} tests failed`);
        }
    }

    runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, { stdio: 'inherit' });
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
        });
    }
}

// Export for use as module
module.exports = { TestRunner };

// Run if called directly
if (require.main === module) {
    const runner = new TestRunner();
    
    runner.runTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test runner error:', error);
            process.exit(1);
        });
}