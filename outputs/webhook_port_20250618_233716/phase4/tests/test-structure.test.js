/**
 * Test Suite Structure Validation
 * Ensures all test files are properly configured
 */

const fs = require('fs');
const path = require('path');

describe('Test Suite Structure', () => {
    it('should have all required test files', () => {
        const requiredFiles = [
            'unit/processManager.test.js',
            'unit/gpsService.test.js',
            'unit/kismetService.test.js',
            'integration/api.test.js',
            'integration/websocket.test.js',
            'e2e/buttons.test.js',
            'performance/load.test.js',
            'test-runner.js',
            'package.json',
            'jest.setup.js',
            'run-tests.sh'
        ];

        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });

    it('should have valid package.json', () => {
        const packageJson = require('./package.json');
        
        expect(packageJson.name).toBe('webhook-service-tests');
        expect(packageJson.scripts.test).toBeDefined();
        expect(packageJson.devDependencies.jest).toBeDefined();
        expect(packageJson.devDependencies.supertest).toBeDefined();
    });

    it('should have proper directory structure', () => {
        const dirs = ['unit', 'integration', 'e2e', 'performance'];
        
        dirs.forEach(dir => {
            const dirPath = path.join(__dirname, dir);
            expect(fs.existsSync(dirPath)).toBe(true);
            expect(fs.statSync(dirPath).isDirectory()).toBe(true);
        });
    });
});