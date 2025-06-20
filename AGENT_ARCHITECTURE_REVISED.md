# Revised Agent Architecture for Flask-to-Node.js Migration

## Overview
This document defines the exact 6-agent architecture for migrating Flask applications to Node.js, with clear roles, responsibilities, and ownership boundaries.

## Agent Definitions

### 1. Flask Code Analyzer
**Primary Responsibility**: Deep analysis of Flask application structure and patterns

**Specific Tasks**:
- **Route Analysis**: Extract all Flask routes, their HTTP methods, and URL patterns
- **Middleware Identification**: Catalog all Flask middleware (before_request, after_request, teardown handlers)
- **Error Handler Mapping**: Document all error handlers (@app.errorhandler decorators)
- **Request/Response Patterns**: Analyze how Flask handles request/response objects
- **Session Management**: Document Flask session usage and configuration
- **Template Engine Usage**: Identify Jinja2 templates and their context variables
- **Static File Handling**: Map static file routes and configurations

**Output Format**:
```json
{
  "routes": [
    {
      "path": "/api/endpoint",
      "methods": ["GET", "POST"],
      "handler": "function_name",
      "decorators": ["@login_required"],
      "request_parsing": ["json", "form", "files"],
      "response_type": "json/html/file"
    }
  ],
  "middleware": {
    "before_request": ["auth_check", "rate_limit"],
    "after_request": ["add_headers"],
    "teardown": ["close_db"]
  },
  "error_handlers": {
    "404": "handle_not_found",
    "500": "handle_server_error",
    "custom": ["ValidationError", "AuthError"]
  }
}
```

### 2. Node.js Debugger
**Primary Responsibility**: Debug and fix the current broken Node.js implementation

**Specific Tasks**:
- **Syntax Error Detection**: Identify and fix JavaScript syntax errors
- **Async/Await Issues**: Debug promise chains and async function problems
- **Module Import Errors**: Fix require/import statement issues
- **Express Middleware Bugs**: Debug middleware execution order and functionality
- **Request Handling Errors**: Fix body parsing, parameter extraction issues
- **Response Format Bugs**: Ensure proper JSON/HTML response formatting
- **Memory Leaks**: Identify and fix memory management issues

**Bug Ownership**:
- **Owns**: All JavaScript runtime errors, async/await issues, Express-specific bugs
- **Delegates to Dependency Mapper**: Library compatibility issues
- **Delegates to Implementation Engineer**: Missing functionality

**Debug Output Format**:
```json
{
  "errors": [
    {
      "type": "SyntaxError",
      "file": "server.js",
      "line": 45,
      "description": "Unexpected token '}' ",
      "fix": "Add missing semicolon"
    }
  ],
  "warnings": [
    {
      "type": "AsyncWarning",
      "description": "Unhandled promise rejection",
      "recommendation": "Add try-catch block"
    }
  ]
}
```

### 3. Dependency Mapper
**Primary Responsibility**: Map Flask dependencies to Node.js equivalents

**Specific Tasks**:
- **Library Translation**: Map Flask extensions to Node.js packages
  - Flask-SQLAlchemy → Sequelize/TypeORM
  - Flask-Login → Passport.js
  - Flask-Mail → Nodemailer
  - Flask-WTF → express-validator
- **API Compatibility Analysis**: Identify method signature differences
- **Feature Parity Check**: Ensure Node.js libraries support required features
- **Version Compatibility**: Recommend specific package versions
- **Migration Patterns**: Provide code transformation templates

**Mapping Output Format**:
```json
{
  "dependencies": {
    "flask": {
      "node_equivalent": "express",
      "version": "^4.18.0",
      "api_differences": [
        {
          "flask": "request.json",
          "node": "req.body (with express.json() middleware)"
        }
      ]
    },
    "flask-sqlalchemy": {
      "node_equivalent": "sequelize",
      "version": "^6.35.0",
      "migration_complexity": "high",
      "breaking_changes": ["query syntax", "relationship definitions"]
    }
  },
  "transformation_patterns": {
    "route_definition": {
      "flask": "@app.route('/path', methods=['GET'])",
      "node": "app.get('/path', (req, res) => {})"
    }
  }
}
```

### 4. Implementation Engineer
**Primary Responsibility**: Write corrected Node.js code based on analysis

**Specific Tasks**:
- **Route Implementation**: Convert Flask routes to Express routes
- **Middleware Conversion**: Implement Express middleware from Flask patterns
- **Error Handler Setup**: Create Express error handling middleware
- **Request/Response Handling**: Implement proper req/res patterns
- **Async Pattern Implementation**: Use async/await correctly
- **Database Integration**: Implement ORM/database connections
- **Authentication Setup**: Configure Passport.js or similar

**Code Generation Rules**:
- Always use async/await for asynchronous operations
- Implement proper error boundaries with try-catch
- Follow Express.js best practices for middleware ordering
- Use environment variables for configuration
- Implement request validation middleware

**Implementation Ownership**:
- **Owns**: All new code generation and feature implementation
- **Receives from Debugger**: Fixed code snippets
- **Receives from Dependency Mapper**: Library usage patterns

### 5. Testing Specialist
**Primary Responsibility**: Create comprehensive test suites for migrated code

**Specific Tasks**:
- **Unit Test Creation**: Test individual functions and middleware
- **Integration Test Design**: Test full request/response cycles
- **API Compatibility Tests**: Verify Flask API behavior is preserved
- **Performance Testing**: Compare Flask vs Node.js performance
- **Error Scenario Testing**: Test error handlers and edge cases
- **Mock Creation**: Build mocks for external dependencies

**Test Framework Stack**:
- **Unit Testing**: Jest or Mocha
- **Integration Testing**: Supertest
- **API Testing**: Postman/Newman collections
- **Performance**: Artillery or k6

**Test Output Format**:
```javascript
// Example test structure
describe('API Endpoint Tests', () => {
  describe('GET /api/users', () => {
    it('should return user list with correct format', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);
      
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });
    
    it('should handle authentication correctly', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});
```

### 6. Consolidator/Evaluator
**Primary Responsibility**: Merge parallel outputs and evaluate migration quality

**Specific Tasks**:
- **Output Merging**: Combine analysis from all agents into cohesive implementation
- **Conflict Resolution**: Resolve contradictions between agent recommendations
- **Quality Metrics**: Evaluate code quality, test coverage, API compatibility
- **Performance Comparison**: Benchmark Flask vs Node.js implementation
- **Security Audit**: Verify security patterns are properly migrated
- **Documentation Generation**: Create migration documentation and API docs

**Evaluation Criteria**:
1. **API Compatibility Score**: % of Flask endpoints correctly replicated
2. **Test Coverage**: Line coverage and branch coverage metrics
3. **Performance Delta**: Response time and throughput comparison
4. **Security Compliance**: OWASP compliance check
5. **Code Quality**: ESLint score, complexity metrics

**Final Output Format**:
```json
{
  "migration_summary": {
    "total_endpoints": 45,
    "successfully_migrated": 43,
    "partially_migrated": 2,
    "failed": 0
  },
  "quality_metrics": {
    "api_compatibility": "95.5%",
    "test_coverage": "87%",
    "performance_improvement": "+23%",
    "security_score": "A"
  },
  "issues": [
    {
      "severity": "medium",
      "component": "session_handling",
      "description": "Flask session encryption not fully replicated",
      "recommendation": "Implement express-session with compatible encryption"
    }
  ],
  "next_steps": [
    "Deploy to staging environment",
    "Run full integration test suite",
    "Monitor for 24 hours"
  ]
}
```

## Agent Interaction Protocol

### Parallel Execution Phase
1. **Flask Code Analyzer** and **Node.js Debugger** run simultaneously
2. **Dependency Mapper** starts after initial analysis
3. All three provide inputs to **Implementation Engineer**

### Sequential Implementation Phase
1. **Implementation Engineer** generates code based on parallel analysis
2. **Testing Specialist** creates tests for implemented code
3. **Consolidator/Evaluator** performs final assessment

### Bug Ownership Matrix

| Bug Type | Primary Owner | Secondary Owner |
|----------|--------------|-----------------|
| Syntax Errors | Node.js Debugger | Implementation Engineer |
| Async/Promise Issues | Node.js Debugger | Implementation Engineer |
| Missing Dependencies | Dependency Mapper | Implementation Engineer |
| API Incompatibility | Flask Code Analyzer | Consolidator/Evaluator |
| Performance Regression | Testing Specialist | Consolidator/Evaluator |
| Security Vulnerabilities | Consolidator/Evaluator | Implementation Engineer |

## Communication Protocol

### Inter-Agent Messages
```json
{
  "from": "Flask Code Analyzer",
  "to": "Implementation Engineer",
  "type": "route_specification",
  "priority": "high",
  "data": {
    "route": "/api/login",
    "requires": ["session", "csrf", "rate_limiting"],
    "complexity": "high"
  }
}
```

### Error Escalation
1. Agent detects issue beyond scope
2. Creates escalation message with context
3. Consolidator/Evaluator assigns to appropriate agent
4. Resolution tracked and documented

## Success Criteria

### Per-Agent Success Metrics
1. **Flask Code Analyzer**: 100% route coverage, all middleware identified
2. **Node.js Debugger**: Zero runtime errors, all async issues resolved
3. **Dependency Mapper**: All Flask libraries mapped, compatibility verified
4. **Implementation Engineer**: Clean code, follows style guide, passes linting
5. **Testing Specialist**: >80% code coverage, all endpoints tested
6. **Consolidator/Evaluator**: Comprehensive report, clear next steps

### Overall Migration Success
- All Flask functionality replicated in Node.js
- Performance equal or better than Flask
- Security posture maintained or improved
- Zero breaking changes for API consumers
- Complete test suite with CI/CD integration

## Implementation Timeline

### Phase 1: Analysis (Parallel - 2 hours)
- Flask Code Analyzer: Complete route and middleware analysis
- Node.js Debugger: Fix all syntax and runtime errors
- Dependency Mapper: Create complete dependency map

### Phase 2: Implementation (Sequential - 4 hours)
- Implementation Engineer: Generate all routes and middleware
- Testing Specialist: Create comprehensive test suite
- Consolidator/Evaluator: Perform quality assessment

### Phase 3: Validation (1 hour)
- Run full test suite
- Performance benchmarking
- Security audit
- Final report generation

## Conclusion

This 6-agent architecture provides clear ownership, specific responsibilities, and measurable success criteria for Flask-to-Node.js migration. Each agent has a defined scope with explicit handoff points and escalation paths for issues beyond their domain.