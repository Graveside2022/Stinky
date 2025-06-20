# Generation Patterns

This directory contains code generation patterns specific to the stinkster project needs, focusing on Flask app generation, SDR integration patterns, and service orchestration patterns.

## Available Patterns

### auto_session_continuity_pattern.md
- **Purpose**: Automatically generate and maintain session continuity across project sessions
- **Triggers**: Boot context, session recovery, memory persistence needs
- **Features**: Service state tracking, configuration persistence, task queue management
- **Integration**: Flask apps, SDR services, service orchestration

### project_initialization_pattern.md
- **Purpose**: Complete project setup and initialization from scratch
- **Triggers**: Fresh installation, environment reset, development setup
- **Features**: Directory structure, virtual environments, configurations, systemd services
- **Integration**: All project components, hardware validation, service templates

### testing_protocol_framework.md
- **Purpose**: 7-step testing decision protocol for all code implementations
- **Triggers**: Before any code implementation, complexity assessment
- **Features**: TDD requirements, complexity assessment, validation protocols
- **Integration**: Flask testing, SDR testing, service orchestration testing

## Pattern Application Process

1. **Pattern Detection**: Check trigger conditions for each pattern
2. **Template Selection**: Choose appropriate template based on context
3. **Customization**: Adapt template to specific requirements
4. **Validation**: Execute validation steps to ensure correctness
5. **Integration**: Apply pattern within existing system architecture

## Stinkster-Specific Features

### Flask App Generation
- WebSocket integration for real-time data
- SDR data pipeline integration
- Configuration management
- Service health monitoring

### SDR Integration Patterns
- HackRF device management
- Spectrum analysis templates
- Real-time data processing
- Hardware abstraction layers

### Service Orchestration Patterns
- Process management templates
- Service dependency handling
- Health monitoring systems
- Recovery procedures

## Usage Guidelines

- Always check existing patterns before creating new code
- Apply 7-step testing decision protocol for all implementations
- Maintain session continuity across project sessions
- Follow validation steps for each pattern application
- Document pattern applications in SESSION_CONTINUITY.md

## Integration Points

- **Memory System**: Patterns integrate with memory/learning_archive.md
- **Session Continuity**: Auto-update SESSION_CONTINUITY.md
- **Configuration**: Use project config.json for pattern parameters
- **Testing**: Follow testing_protocol_framework for all generated code