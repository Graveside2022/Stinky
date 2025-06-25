# LICENSING COMPLIANCE GUIDE

**Stinkster Project Legal Compliance Framework**

This guide provides detailed instructions for complying with the mixed license requirements in the Stinkster Project, particularly addressing the AGPL v3 compliance obligations.

**Document Version:** 1.0  
**Generated:** 2025-06-15  
**Maintainer:** Christian  

## EXECUTIVE SUMMARY

The Stinkster Project contains components under different licenses that create varying legal obligations:

- **Main Project Code**: MIT License (permissive, minimal obligations)
- **WigleToTAK Component**: AGPL v3 (copyleft, network service obligations)
- **OpenWebRX**: AGPL v3 (copyleft, network service obligations)
- **System Dependencies**: GPL v2, LGPL (various obligations)

**Key Compliance Requirement**: AGPL v3 components require source code disclosure when providing network services.

## UNDERSTANDING AGPL v3 OBLIGATIONS

### What Triggers AGPL Compliance?

AGPL v3 obligations are triggered when:

1. **Network Service Provision**: Users access AGPL software over a network
2. **Modified Versions**: You modify AGPL components and provide network access
3. **Combined Works**: You combine AGPL components with other software in network services

### Affected Components

#### WigleToTAK Web Interface
- **Location**: `src/wigletotak/WigleToTAK/`
- **Service**: Web interface on port 6969
- **User Access**: HTTP/HTTPS network access to conversion service
- **Trigger**: When users access the web interface over a network

#### OpenWebRX Container
- **Location**: Docker container `openwebrx-hackrf`
- **Service**: Web SDR interface on port 8073
- **User Access**: HTTP/HTTPS network access to SDR interface
- **Trigger**: When users access the web interface over a network

## AGPL v3 COMPLIANCE IMPLEMENTATION

### Method 1: Source Code Repository Access (Recommended)

**Implementation Steps**:

1. **Maintain Public Repository**:
   ```bash
   # Ensure git repository is publicly accessible
   git remote set-url origin https://github.com/[username]/stinkster.git
   git push --all
   git push --tags
   ```

2. **Add Source Access Notice**:
   - Include source repository URL in web interface footer
   - Add download links in service documentation
   - Provide clear instructions for obtaining complete source

3. **License Information Display**:
   ```html
   <!-- Example for web interfaces -->
   <footer>
     <p>This service includes AGPL v3 licensed software.</p>
     <p>Source code available at: <a href="https://github.com/[repo]/stinkster">GitHub Repository</a></p>
     <p><a href="/licenses">License Information</a></p>
   </footer>
   ```

### Method 2: Direct Source Download

**Implementation Steps**:

1. **Create Source Archive**:
   ```bash
   # Create complete source archive
   git archive --format=tar.gz --prefix=stinkster/ HEAD > stinkster-source.tar.gz
   
   # Include in web service directory
   cp stinkster-source.tar.gz /path/to/web/service/downloads/
   ```

2. **Provide Download Links**:
   - Direct download link from web interface
   - Include all source code and build instructions
   - Update archive when source changes

### Method 3: Network Server Access

**Implementation Steps**:

1. **Git Server Setup**:
   ```bash
   # Local git server (if internet access limited)
   git daemon --reuseaddr --base-path=/opt/git/ /opt/git/stinkster.git
   ```

2. **Service Integration**:
   - Provide git clone instructions in web interface
   - Include complete build and deployment instructions
   - Ensure access during service operation hours

## COMPLIANCE CHECKLIST

### Pre-Deployment Verification

- [ ] **Source Repository Ready**
  - [ ] All source code committed and pushed
  - [ ] Repository publicly accessible
  - [ ] Build instructions complete and tested
  - [ ] Dependencies documented in requirements files

- [ ] **License Documentation**
  - [ ] LICENSE file updated with mixed license notice
  - [ ] THIRD_PARTY_LICENSES.md created and current
  - [ ] All copyright notices preserved
  - [ ] License texts included for AGPL components

- [ ] **Web Interface Compliance**
  - [ ] Source access links added to WigleToTAK interface
  - [ ] Source access links added to OpenWebRX interface
  - [ ] License information page created
  - [ ] Download links functional and tested

### Ongoing Compliance Maintenance

- [ ] **Source Code Synchronization**
  - [ ] Repository updated with all modifications
  - [ ] Changes documented with dates and descriptions
  - [ ] New dependencies properly licensed and documented
  - [ ] Build instructions reflect current state

- [ ] **Service Monitoring**
  - [ ] Source access links remain functional
  - [ ] Repository availability monitored
  - [ ] License information kept current
  - [ ] User access to source verified

## MODIFICATION COMPLIANCE

### When Modifying AGPL Components

1. **Document Changes**:
   ```bash
   # Example change documentation
   echo "$(date): Modified WigleToTAK interface - added custom filtering" >> MODIFICATIONS.md
   git add MODIFICATIONS.md
   git commit -m "Document modification to AGPL component"
   ```

2. **License Preservation**:
   - Keep all existing copyright notices
   - Add modification notices as required
   - Maintain AGPL v3 license for modified components

3. **Source Disclosure**:
   - Update repository with modifications
   - Ensure complete source availability
   - Test build process with modifications

### Adding New Dependencies

1. **License Compatibility Check**:
   ```bash
   # Check new dependency license
   pip show [package-name] | grep License
   
   # Document in THIRD_PARTY_LICENSES.md
   ```

2. **Compatibility Matrix**:
   - ✅ MIT, BSD, Apache 2.0 → Compatible with all components
   - ✅ LGPL → Compatible when used as library
   - ⚠️ GPL v2/v3 → Check compatibility with AGPL v3
   - ❌ Proprietary → Generally incompatible with copyleft licenses

## COMPLIANCE AUTOMATION

### Automated Compliance Checks

**Create compliance verification script**:

```bash
#!/bin/bash
# compliance-check.sh

echo "=== Stinkster AGPL Compliance Check ==="

# Check repository status
echo "1. Repository Status:"
git status --porcelain
if [ $? -eq 0 ]; then
    echo "   ✅ Repository clean"
else
    echo "   ⚠️  Repository has uncommitted changes"
fi

# Check license files
echo "2. License Documentation:"
[ -f LICENSE ] && echo "   ✅ Main LICENSE file present"
[ -f THIRD_PARTY_LICENSES.md ] && echo "   ✅ Third-party licenses documented"
[ -f src/wigletotak/WigleToTAK/LICENSE ] && echo "   ✅ WigleToTAK license present"

# Check web interfaces for source links
echo "3. Web Interface Compliance:"
grep -r "source.*code\|github\|repository" src/wigletotak/WigleToTAK/templates/ && echo "   ✅ WigleToTAK source links found"

echo "=== Compliance Check Complete ==="
```

### License Header Verification

**Check source files for proper headers**:

```bash
#!/bin/bash
# license-header-check.sh

find . -name "*.py" -not -path "./src/wigletotak/WigleToTAK/*" | while read file; do
    if ! grep -q "MIT License\|Copyright" "$file"; then
        echo "Missing license header: $file"
    fi
done
```

## DISTRIBUTION COMPLIANCE

### Source Distribution

When distributing complete source code:

1. **Include All Components**:
   ```bash
   # Complete source package
   tar czf stinkster-complete-source.tar.gz \
       --exclude='.git' \
       --exclude='*.pyc' \
       --exclude='__pycache__' \
       --exclude='venv' \
       .
   ```

2. **Documentation Requirements**:
   - Include all license files
   - Provide complete build instructions
   - Document all dependencies and requirements
   - Include this compliance guide

### Binary Distribution

When distributing compiled or containerized versions:

1. **Source Access Provision**:
   - Maintain source repository access
   - Include source download instructions
   - Provide complete corresponding source

2. **License Notice Requirements**:
   - Include all license texts
   - Provide third-party license documentation
   - Display appropriate license notices in interfaces

## COMMERCIAL USE CONSIDERATIONS

### License Compatibility for Commercial Use

- **MIT Components**: No restrictions on commercial use
- **AGPL Components**: Commercial use permitted with source disclosure
- **GPL Components**: Commercial use permitted with source disclosure

### Commercial Compliance Requirements

1. **Source Code Obligations**:
   - Provide source access to all users (including commercial customers)
   - Maintain source availability for duration of service provision
   - Include complete build and deployment instructions

2. **License Notice Requirements**:
   - Display license information in commercial interfaces
   - Provide access to all license texts
   - Include appropriate attribution notices

3. **Support and Warranty**:
   - No warranty obligations from original authors
   - Commercial distributors may provide additional warranties
   - Support obligations determined by commercial agreements

## LEGAL CONSULTATION GUIDANCE

### When to Consult Legal Counsel

Consult qualified legal counsel for:

- Complex commercial licensing arrangements
- International distribution requirements
- Government or regulated industry use
- License compatibility questions
- Patent-related concerns
- Export control requirements

### Information to Provide to Legal Counsel

When consulting with lawyers, provide:

1. **Complete license documentation** (this guide, LICENSE file, THIRD_PARTY_LICENSES.md)
2. **Usage description** (how the software will be used and distributed)
3. **Modification details** (any changes made to AGPL components)
4. **Distribution method** (network service, software distribution, etc.)
5. **Commercial context** (business use, revenue model, customer base)

## TROUBLESHOOTING COMPLIANCE ISSUES

### Common Compliance Problems

**Problem**: Users cannot access source code
- **Solution**: Verify repository accessibility, check network connectivity
- **Prevention**: Monitor source availability, implement automated checks

**Problem**: Modified AGPL components not disclosed
- **Solution**: Commit all changes, update repository, document modifications
- **Prevention**: Use version control for all modifications, regular commits

**Problem**: Missing license notices in web interfaces
- **Solution**: Add source access links, include license information pages
- **Prevention**: Template-based license notices, automated verification

**Problem**: Incomplete source distribution
- **Solution**: Include all dependencies, provide complete build instructions
- **Prevention**: Test build process, automate source packaging

### Emergency Compliance Response

If compliance issues are discovered:

1. **Immediate Actions**:
   - Stop service if necessary to prevent license violations
   - Identify scope of compliance gap
   - Document the issue and response actions

2. **Remediation Steps**:
   - Implement required source disclosure
   - Update license documentation
   - Notify affected users if required
   - Verify compliance restoration

3. **Prevention Measures**:
   - Implement automated compliance monitoring
   - Regular compliance audits
   - Staff training on license requirements
   - Legal review for significant changes

## CONCLUSION

AGPL v3 compliance requires ongoing attention to source code disclosure obligations. The key requirements are:

1. **Provide source access** to users of network services
2. **Maintain current documentation** of all license obligations
3. **Document all modifications** to AGPL components
4. **Verify compliance** before deployment and regularly thereafter

This compliance framework provides the foundation for legal operation of the Stinkster Project while respecting the rights and obligations of all license holders.

**Remember**: This guide provides general compliance guidance but does not constitute legal advice. Consult with qualified legal counsel for specific legal questions and compliance verification.

---

**Document Maintenance**: Update this guide when license obligations change, new components are added, or compliance procedures are modified.