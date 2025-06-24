# Contributing to Stinkster

Thank you for your interest in contributing to the Stinkster project! This document provides guidelines for contributing to this Raspberry Pi-based SDR and WiFi intelligence platform.

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please review our guidelines:

- **Be respectful**: Treat everyone with respect and kindness
- **Be collaborative**: Work together constructively
- **Be professional**: Maintain professional communication
- **Be legal**: Ensure all contributions comply with applicable laws and regulations

## Legal and Regulatory Considerations

⚠️ **IMPORTANT**: This project involves Software Defined Radio (SDR), WiFi monitoring, and RF technologies that are subject to various laws and regulations. Contributors must:

1. **Understand regulatory requirements** in their jurisdiction
2. **Ensure contributions comply** with local laws regarding:
   - RF emissions and monitoring
   - Wireless network access and privacy
   - Export control regulations
   - Amateur radio licensing requirements
3. **Include appropriate warnings** in documentation
4. **Follow responsible disclosure** for security-related contributions

## Getting Started

### Development Environment Setup

1. **Hardware Requirements:**
   - Raspberry Pi 4 (4GB+ recommended)
   - HackRF One or compatible SDR device
   - USB WiFi adapter with monitor mode support

2. **Software Prerequisites:**
   ```bash
   # Install required system packages
   sudo apt update
   sudo apt install -y python3 python3-pip docker.io docker-compose
   
   # Clone the repository
   git clone https://github.com/[your-username]/stinkster.git
   cd stinkster
   
   # Set up development environment
   ./dev/setup.sh
   ```

3. **Configuration:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your specific hardware and settings
   nano .env
   ```

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for known solutions
3. **Test with latest code** from the main branch

When reporting issues, include:

- **System information**: OS version, hardware details
- **Steps to reproduce**: Clear, numbered steps
- **Expected vs actual behavior**: What should happen vs what does
- **Logs and error messages**: Complete error output
- **Configuration details**: Relevant .env settings (redact sensitive info)

### Feature Requests

For new features:

1. **Check existing issues** and discussions
2. **Consider legal implications** of the proposed feature
3. **Provide detailed use cases** and requirements
4. **Consider backward compatibility** and existing workflows

### Development Contributions

#### 1. Fork and Branch
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/stinkster.git
cd stinkster

# Create a feature branch
git checkout -b feature/your-feature-name
```

#### 2. Development Workflow

**Architecture Guidelines:**
- Follow the existing modular structure in `src/`
- Use virtual environments for Python components
- Maintain separation between hardware interfaces and business logic
- Document all RF-related functionality with appropriate warnings

**Code Standards:**
- **Python**: Follow PEP 8 style guidelines
- **Shell Scripts**: Use bash with proper error handling
- **Documentation**: Update relevant documentation files
- **Comments**: Include regulatory warnings where appropriate

**Testing Requirements:**
```bash
# Run unit tests
./dev/test/run-unit-tests.sh

# Run integration tests (requires hardware)
./dev/test/run-integration-tests.sh

# Run all tests
./dev/test/run-all-tests.sh
```

#### 3. Component-Specific Guidelines

**HackRF/SDR Components:**
- Include frequency range and power level documentation
- Add appropriate regulatory warnings
- Test with various SDR hardware when possible
- Validate signal processing algorithms

**WiFi Scanning Components:**
- Ensure monitor mode compatibility
- Include privacy protection measures
- Document legal requirements clearly
- Implement proper error handling for various adapters

**GPS/Location Services:**
- Support multiple GPS protocols
- Include accuracy and timing considerations
- Handle device connection failures gracefully

**Web Interfaces:**
- Maintain responsive design principles
- Include security headers and authentication
- Test across different browsers
- Optimize for Raspberry Pi performance

#### 4. Security Considerations

All contributions must consider:

- **Input validation**: Sanitize all user inputs
- **Authentication**: Secure web interfaces appropriately
- **Network security**: Use secure communication protocols
- **Data protection**: Handle sensitive data (location, network info) properly
- **Access control**: Implement proper permission systems

### Documentation

Documentation contributions are highly valued:

- **Update README.md** for user-facing changes
- **Update component documentation** in relevant directories
- **Include installation and configuration steps**
- **Add troubleshooting guides** for common issues
- **Update legal and compliance documentation** as needed

### Pull Request Process

1. **Create a clear PR title** that summarizes the change
2. **Fill out the PR template** completely
3. **Include tests** for new functionality
4. **Update documentation** as needed
5. **Ensure CI passes** all automated tests
6. **Request review** from maintainers

**PR Requirements:**
- [ ] Code follows project style guidelines
- [ ] Tests pass locally and in CI
- [ ] Documentation updated where necessary
- [ ] Legal/regulatory implications considered
- [ ] Security implications reviewed
- [ ] Breaking changes documented
- [ ] Appropriate license headers included

### Review Process

1. **Automated checks**: CI runs tests and security scans
2. **Code review**: Maintainers review for quality and compliance
3. **Testing**: Manual testing on reference hardware
4. **Documentation review**: Ensure completeness and accuracy
5. **Legal review**: For RF/networking changes, legal compliance check
6. **Merge**: After approval and any required changes

## Component Ownership

Different components have specialized maintainers:

- **SDR/HackRF**: Hardware interface and signal processing
- **WiFi Scanning**: Kismet integration and network monitoring
- **GPS/Location**: MAVLink and location services
- **Web Services**: Flask applications and user interfaces
- **Docker/Deployment**: Containerization and system integration
- **Documentation**: User guides and technical documentation

## Development Environment

### Local Development Setup

```bash
# Set up development tools
cd dev
./setup.sh

# Start development environment
./dev.sh

# Monitor logs
./tools/logview.sh
```

### Testing Guidelines

**Unit Tests:**
- Cover all new functions and methods
- Mock hardware dependencies appropriately
- Test edge cases and error conditions

**Integration Tests:**
- Test component interactions
- Validate hardware compatibility
- Test configuration variations

**Hardware Tests:**
- Test with actual SDR and GPS hardware
- Validate RF performance and compliance
- Test WiFi adapter compatibility

### Continuous Integration

Our CI pipeline includes:

- **Code quality**: Linting and style checks
- **Security scanning**: Vulnerability assessment
- **Unit testing**: Automated test execution
- **Documentation**: Link checking and formatting
- **License compliance**: Third-party license verification

## Legal and Compliance

### License Requirements

This project uses mixed licensing:
- **Main project**: MIT License
- **Some components**: GPL v2, AGPL v3
- **Third-party components**: Various licenses

Contributors must:
- Understand license implications
- Include appropriate license headers
- Maintain license compatibility
- Update THIRD_PARTY_LICENSES.md for new dependencies

### Regulatory Compliance

Contributors working with RF/wireless functionality must:
- Include appropriate regulatory warnings
- Document frequency ranges and power levels
- Ensure compliance with local regulations
- Consider international usage implications

### Export Control

Some functionality may be subject to export control regulations. Contributors should:
- Be aware of export control implications
- Consult legal counsel when necessary
- Document any export-controlled functionality
- Follow applicable government guidelines

## Getting Help

- **Documentation**: Check docs/ directory for detailed guides
- **Issues**: Search and create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Development Chat**: [If applicable, include chat/forum links]

## Recognition

We appreciate all contributions and recognize contributors through:
- **Contributors file**: Listed in project documentation
- **Release notes**: Credited for significant contributions
- **Community recognition**: Featured in project updates

Thank you for contributing to Stinkster! Your contributions help advance open-source SDR and networking tools while maintaining high standards for legal and technical compliance.