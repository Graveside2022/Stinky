# Documentation Templates

This directory contains standardized templates for creating consistent wire diagram documentation across the Stinkster system. These templates ensure all documentation follows the same structure, format, and quality standards.

## Available Templates

### 📋 Component Documentation
- **[component-template.md](component-template.md)**: Template for individual component documentation
  - Hardware interfaces and connections
  - Software configuration and setup
  - Operational procedures and monitoring
  - Integration points and dependencies

### 🔄 Flow Documentation  
- **[flow-template.md](flow-template.md)**: Template for system flow documentation
  - Data flow sequences and timing
  - Processing steps and transformations
  - Performance characteristics
  - Error handling and recovery

### 🔗 Integration Documentation
- **[integration-template.md](integration-template.md)**: Template for integration pattern documentation
  - Connection patterns and protocols
  - Configuration and deployment
  - Monitoring and troubleshooting
  - Security considerations

## Template Usage Guidelines

### When to Use Each Template

#### Component Template
Use for documenting:
- Individual hardware devices (GPS, HackRF, WiFi adapters)
- Software services (GPSD, Kismet, OpenWebRX)
- System components (logging, configuration management)
- Web applications and interfaces

#### Flow Template
Use for documenting:
- End-to-end data processing pipelines
- Service startup and coordination sequences
- User interaction workflows
- Error handling and recovery procedures

#### Integration Template
Use for documenting:
- Network communication patterns
- File system sharing approaches
- Container orchestration patterns
- Security and authentication methods

### Template Customization

#### Required Sections
All templates include mandatory sections that must be completed:
- **Overview**: Purpose and scope
- **Wire Diagram**: Mermaid diagram with standard styling
- **Technical Details**: Interfaces, protocols, configuration
- **Cross References**: Links to related documentation

#### Optional Sections
Templates include optional sections that can be:
- **Removed**: If not applicable to the component/flow/pattern
- **Expanded**: With additional subsections as needed
- **Customized**: With domain-specific information

#### Standard Elements
All templates use standardized elements:
- **Color Coding**: Consistent with [legend.md](../legend.md)
- **Mermaid Styling**: Uses [mermaid-styles.css](../mermaid-styles.css)
- **Cross-References**: Links between related documentation
- **Version Control**: Document versioning and change tracking

## Template Structure

### Document Header
```markdown
# [Component/Flow/Pattern Name]

**Type**: [Category]
**Purpose**: Brief description
**Dependencies**: Required components
**Interfaces**: Primary communication methods
```

### Wire Diagram Section
```markdown
## Wire Diagram

```mermaid
flowchart TD
    %% Use standard color classes
    %% Include all interfaces and connections
    %% Label ports, protocols, data flows
```
```

### Technical Details
```markdown
## Technical Details

### Interface Specifications
[Standardized tables for ports, protocols, file paths]

### Configuration
[Environment variables, config files, parameters]

### Dependencies
[System requirements, other components]
```

### Cross References
```markdown
## Cross References

### Related Documentation
- [Related Component](../component-details/component.md)
- [Related Flow](../core-flows/flow.md)
- [Related Pattern](../integration-patterns/pattern.md)

### External Resources
- Official documentation links
- Community resources
- Source code repositories
```

## Quality Standards

### Documentation Quality Checklist
- [ ] **Completeness**: All required sections filled out
- [ ] **Accuracy**: Technical details verified and current
- [ ] **Clarity**: Clear, concise language without jargon
- [ ] **Consistency**: Follows template structure and standards
- [ ] **Cross-References**: Links to related documentation work
- [ ] **Diagrams**: Mermaid diagrams use standard colors and styling
- [ ] **Examples**: Include practical examples and code snippets
- [ ] **Testing**: Instructions for validation and verification

### Diagram Quality Standards
- [ ] **Standard Colors**: Uses color scheme from legend.md
- [ ] **Complete Interfaces**: Shows all input/output connections
- [ ] **Proper Labels**: All components, ports, and flows labeled
- [ ] **Flow Direction**: Clear data flow direction indicated
- [ ] **Grouping**: Related components grouped in subgraphs
- [ ] **Legend**: Custom symbols explained if used
- [ ] **Readability**: Diagram is clear at normal viewing size

### Technical Accuracy Requirements
- [ ] **Port Numbers**: Verified against actual system configuration
- [ ] **File Paths**: Confirmed to exist and be accessible
- [ ] **Commands**: All example commands tested and working
- [ ] **Configuration**: Sample configurations valid and complete
- [ ] **Dependencies**: All dependencies correctly identified
- [ ] **Version Info**: Current software versions documented

## Template Maintenance

### Version Control
Each template tracks:
- **Template Version**: Version of the template structure
- **Last Updated**: When template was last modified
- **Change History**: What changes were made and why
- **Compatibility**: Which documentation versions it supports

### Update Procedures
When updating templates:
1. **Backwards Compatibility**: Ensure existing docs still work
2. **Migration Guide**: Document how to update existing docs
3. **Notification**: Inform documentation maintainers
4. **Testing**: Verify templates work with documentation tools

### Review Process
Template changes go through:
1. **Technical Review**: Verify technical accuracy
2. **Usability Review**: Ensure templates are easy to use
3. **Standard Compliance**: Check against documentation standards
4. **Community Feedback**: Get input from documentation users

## Creating New Documentation

### Step-by-Step Process

#### 1. Choose Template
Select the appropriate template based on what you're documenting:
- Component: Individual system elements
- Flow: Multi-step processes or data pipelines
- Integration: Connection patterns and protocols

#### 2. Copy Template
```bash
# Copy appropriate template to target location
cp templates/component-template.md component-details/new-component.md
cp templates/flow-template.md core-flows/new-flow.md
cp templates/integration-template.md integration-patterns/new-pattern.md
```

#### 3. Customize Content
- Replace all placeholder text ([Component Name], [Description], etc.)
- Fill in technical specifications (ports, paths, protocols)
- Create appropriate Mermaid diagrams
- Add cross-references to related documentation

#### 4. Validate Documentation
```bash
# Check for broken links
./dev/tools/check-links.sh docs/

# Validate Mermaid diagrams
./dev/tools/validate-mermaid.sh docs/

# Spell check
aspell check new-component.md
```

#### 5. Review and Update
- Technical review by component owner
- Documentation review for clarity and completeness
- Integration testing with related documentation
- Final approval and publication

### Tools and Utilities

#### Documentation Helpers
```bash
# Generate component outline from template
./dev/tools/generate-component-doc.sh component-name

# Validate documentation against template
./dev/tools/validate-doc.sh component-details/component.md

# Update cross-references automatically
./dev/tools/update-cross-refs.sh
```

#### Diagram Utilities
```bash
# Generate diagram from configuration
./dev/tools/config-to-diagram.sh config.json > component-diagram.mmd

# Validate Mermaid syntax
npx @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.png

# Apply standard styling
./dev/tools/apply-mermaid-styles.sh diagram.mmd
```

## Best Practices

### Writing Guidelines
1. **Be Specific**: Use exact port numbers, file paths, command syntax
2. **Be Complete**: Include all necessary information for implementation
3. **Be Current**: Keep documentation synchronized with code changes
4. **Be Consistent**: Follow template structure and naming conventions
5. **Be Helpful**: Include troubleshooting and common issues

### Diagram Guidelines
1. **Start Simple**: Begin with high-level overview, add details as needed
2. **Use Standards**: Follow color coding and symbol conventions
3. **Show Data Flow**: Make it clear how data moves through the system
4. **Group Related**: Use subgraphs to group related components
5. **Label Everything**: All components, connections, and data should be labeled

### Maintenance Guidelines
1. **Regular Updates**: Review documentation quarterly or on major changes
2. **Version Tracking**: Update version information when making changes
3. **Link Validation**: Check that all cross-references remain valid
4. **Accuracy Verification**: Verify technical details against running systems
5. **User Feedback**: Incorporate feedback from documentation users

For examples of completed documentation using these templates, see the component-details, core-flows, and integration-patterns directories.