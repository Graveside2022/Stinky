#!/usr/bin/env node
/**
 * Response Structure Validator
 * Deep comparison of Flask vs Node.js API responses
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const axios = require('axios');
const chalk = require('chalk');
const deepEqual = require('deep-equal');

class ResponseValidator {
  constructor() {
    this.schemas = {
      spectrum: {
        status: {
          required: ['connected', 'center_freq', 'samp_rate', 'fft_size'],
          types: {
            connected: 'boolean',
            center_freq: 'number',
            samp_rate: 'number',
            fft_size: 'number'
          }
        },
        config: {
          required: ['fft_size', 'center_freq', 'samp_rate', 'signal_threshold'],
          types: {
            fft_size: 'number',
            center_freq: 'number',
            samp_rate: 'number',
            signal_threshold: 'number'
          }
        },
        profiles: {
          required: ['profiles'],
          types: {
            profiles: 'object'
          }
        },
        scan: {
          required: ['profile', 'scan_status'],
          types: {
            profile: 'string',
            scan_status: 'string'
          }
        }
      },
      wigletotak: {
        status: {
          required: ['broadcasting', 'tak_server_ip', 'tak_server_port'],
          types: {
            broadcasting: 'boolean',
            tak_server_ip: 'string',
            tak_server_port: 'string'
          }
        },
        antenna_settings: {
          required: ['antenna_sensitivity', 'sensitivity_factors'],
          types: {
            antenna_sensitivity: 'string',
            sensitivity_factors: 'object'
          }
        }
      }
    };
  }

  async validateEndpoint(flaskURL, nodejsURL, path, schema) {
    console.log(chalk.yellow(`🔍 Validating: ${path}`));
    
    try {
      // Fetch responses
      const [flaskResp, nodejsResp] = await Promise.all([
        axios.get(`${flaskURL}${path}`, { timeout: 5000 }),
        axios.get(`${nodejsURL}${path}`, { timeout: 5000 })
      ]);

      // Parse JSON responses
      const flaskData = flaskResp.data;
      const nodejsData = nodejsResp.data;

      const validation = {
        path,
        passed: true,
        issues: [],
        flask: flaskData,
        nodejs: nodejsData
      };

      // Validate against schema
      this.validateSchema(flaskData, schema, 'Flask', validation);
      this.validateSchema(nodejsData, schema, 'Node.js', validation);

      // Compare structures
      this.compareStructures(flaskData, nodejsData, validation);

      // Type comparison
      this.compareTypes(flaskData, nodejsData, validation);

      if (validation.issues.length > 0) {
        validation.passed = false;
        console.log(chalk.red(`  ❌ Issues found:`));
        validation.issues.forEach(issue => {
          console.log(chalk.gray(`    - ${issue}`));
        });
      } else {
        console.log(chalk.green(`  ✅ Validation passed`));
      }

      return validation;

    } catch (error) {
      console.log(chalk.red(`  ❌ Validation failed: ${error.message}`));
      return {
        path,
        passed: false,
        issues: [`Request failed: ${error.message}`],
        flask: null,
        nodejs: null
      };
    }
  }

  validateSchema(data, schema, platform, validation) {
    // Check required fields
    for (const field of schema.required) {
      if (!(field in data)) {
        validation.issues.push(`${platform}: Missing required field '${field}'`);
      }
    }

    // Check field types
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in data) {
        const actualType = typeof data[field];
        if (actualType !== expectedType) {
          validation.issues.push(`${platform}: Field '${field}' should be ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  compareStructures(flaskData, nodejsData, validation) {
    const flaskKeys = Object.keys(flaskData).sort();
    const nodejsKeys = Object.keys(nodejsData).sort();

    if (JSON.stringify(flaskKeys) !== JSON.stringify(nodejsKeys)) {
      validation.issues.push(`Structure mismatch: Flask keys [${flaskKeys.join(', ')}] vs Node.js keys [${nodejsKeys.join(', ')}]`);
    }

    // Check for extra fields
    const extraInFlask = flaskKeys.filter(key => !nodejsKeys.includes(key));
    const extraInNodejs = nodejsKeys.filter(key => !flaskKeys.includes(key));

    if (extraInFlask.length > 0) {
      validation.issues.push(`Flask has extra fields: ${extraInFlask.join(', ')}`);
    }

    if (extraInNodejs.length > 0) {
      validation.issues.push(`Node.js has extra fields: ${extraInNodejs.join(', ')}`);
    }
  }

  compareTypes(flaskData, nodejsData, validation) {
    const commonKeys = Object.keys(flaskData).filter(key => key in nodejsData);

    for (const key of commonKeys) {
      const flaskType = typeof flaskData[key];
      const nodejsType = typeof nodejsData[key];

      if (flaskType !== nodejsType) {
        validation.issues.push(`Type mismatch for '${key}': Flask ${flaskType} vs Node.js ${nodejsType}`);
      }

      // Deep object comparison
      if (flaskType === 'object' && nodejsType === 'object') {
        if (!deepEqual(flaskData[key], nodejsData[key])) {
          validation.issues.push(`Object structure differs for '${key}'`);
        }
      }
    }
  }

  async runFullValidation() {
    console.log(chalk.blue('🔍 Starting Response Structure Validation'));
    console.log(chalk.gray('=' .repeat(60)));

    const results = [];

    // Validate Spectrum Analyzer endpoints
    console.log(chalk.yellow('\n📡 Spectrum Analyzer Validation'));
    const spectrumTests = [
      { path: '/api/status', schema: this.schemas.spectrum.status },
      { path: '/api/config', schema: this.schemas.spectrum.config },
      { path: '/api/profiles', schema: this.schemas.spectrum.profiles }
    ];

    for (const test of spectrumTests) {
      const result = await this.validateEndpoint(
        'http://localhost:8092',
        'http://localhost:3001',
        test.path,
        test.schema
      );
      results.push(result);
    }

    // Validate WigleToTAK endpoints
    console.log(chalk.yellow('\n📶 WigleToTAK Validation'));
    const wigleTests = [
      { path: '/api/status', schema: this.schemas.wigletotak.status },
      { path: '/get_antenna_settings', schema: this.schemas.wigletotak.antenna_settings }
    ];

    for (const test of wigleTests) {
      const result = await this.validateEndpoint(
        'http://localhost:8000',
        'http://localhost:3002',
        test.path,
        test.schema
      );
      results.push(result);
    }

    // Generate summary
    this.generateValidationReport(results);
    
    return results;
  }

  generateValidationReport(results) {
    console.log(chalk.blue('\n📋 Validation Report'));
    console.log(chalk.gray('=' .repeat(60)));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(chalk.white(`Total Validations: ${results.length}`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.yellow(`Success Rate: ${Math.round((passed / results.length) * 100)}%`));

    if (failed > 0) {
      console.log(chalk.red('\n❌ Failed Validations:'));
      results.filter(r => !r.passed).forEach(result => {
        console.log(chalk.red(`  ${result.path}:`));
        result.issues.forEach(issue => {
          console.log(chalk.gray(`    - ${issue}`));
        });
      });
    }

    // Export detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `response-validation-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: results.length, passed, failed },
      results
    }, null, 2));

    console.log(chalk.blue(`\n📄 Detailed validation report: ${filename}`));
  }
}

async function main() {
  const validator = new ResponseValidator();
  await validator.runFullValidation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ResponseValidator;