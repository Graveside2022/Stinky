
# CLAUDE.md - PROJECT CONFIGURATION

## PROJECT IDENTITY

Project Name: [PROJECT NAME] 
User: Christian 
Project Type: [Detected: Python/Node.js/etc.] 
Created: [DATE]

**This file takes precedence over global CLAUDE.md**

---

## PROJECT AUTO-INITIALIZATION

When this CLAUDE.md is detected, automatically create required structure:

```bash
# Auto-initialization function (runs on first interaction)
initialize_project_structure() {
    echo "=== Initializing Project Structure for Christian ==="
    
    # Create pattern directories if missing
    [ ! -d "patterns" ] && {
        mkdir -p patterns/{bug_fixes,generation,refactoring,architecture}
        echo "✓ Created patterns/ directory structure"
        
        # Create initial README for patterns
        cat > patterns/README.md << 'EOF'
# Pattern Library

This directory contains reusable solutions organized by category:

- **bug_fixes/**: Known bug patterns and their solutions
- **generation/**: Code generation templates
- **refactoring/**: Clean code transformation patterns
- **architecture/**: Architecture decision patterns

Each pattern should follow the template in ../CLAUDE.md
EOF
    }
    
    # Create memory directory if missing
    [ ! -d "memory" ] && {
        mkdir -p memory
        
        # Initialize learning archive
        cat > memory/learning_archive.md << 'EOF'
# Learning Archive
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: Christian

## Efficiency Metrics
- Patterns created: 0
- Patterns reused: 0
- TDD applications: 0
- Direct implementations: 0
- Average complexity handled: 0
- Average time saved: 0 minutes
- Common problems solved: []
EOF
        
        # Initialize error patterns
        cat > memory/error_patterns.md << 'EOF'
# Error Patterns Log
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: Christian

## Recurring Errors
<!-- Document patterns of errors that occur multiple times -->
EOF
        
        # Initialize side effects log
        cat > memory/side_effects_log.md << 'EOF'
# Side Effects Log
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: Christian

## Known Side Effects
<!-- Document unexpected consequences of changes -->
EOF
        
        echo "✓ Created memory/ directory and tracking files"
    }
    
    # Create SESSION_CONTINUITY.md if missing
    [ ! -f "SESSION_CONTINUITY.md" ] && {
        cat > SESSION_CONTINUITY.md << 'EOF'
# SESSION CONTINUITY LOG
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: Christian
Project: [AUTO-DETECTED]

## Initial Setup - $(date -u +%Y-%m-%dT%H:%M:%SZ)

### Current Status
- **Task**: Project initialization
- **Progress**: Created memory system structure
- **Pattern Match**: N/A - Initial setup
- **Testing Approach**: To be determined
- **Next Step**: Await first task from user

### Files Modified
- SESSION_CONTINUITY.md: Created initial file
- patterns/: Created directory structure
- memory/: Created tracking files

### Testing Decision
- **Complexity Score**: N/A
- **TDD Required**: N/A
- **Tests Written**: None yet

### Patterns Used/Created
- **Applied**: None yet
- **Created**: None yet

### Decisions & Rationale
- Initialized project memory system for pattern recognition and learning

### Time Saved
- Pattern reuse saved: 0 minutes (initial setup)
EOF
        echo "✓ Created SESSION_CONTINUITY.md"
    }
    
    # Create tests directory if missing (common need)
    [ ! -d "tests" ] && {
        mkdir -p tests
        echo "✓ Created tests/ directory"
    }
    
    # Create docs directory if missing
    [ ! -d "docs" ] && {
        mkdir -p docs
        echo "✓ Created docs/ directory"
    }
    
    # Create src directory if missing and no other source directory exists
    if [ ! -d "src" ] && [ ! -d "app" ] && [ ! -d "lib" ]; then
        mkdir -p src
        echo "✓ Created src/ directory"
    fi
    
    echo "✓ Project structure initialized for Christian"
    echo ""
}

# Run initialization on every interaction
initialize_project_structure
```

---

## PERSISTENT MEMORY SYSTEM

### Pattern Recognition Protocol

**CRITICAL**: Before ANY implementation, check patterns/ directory (10 second limit)

```python
patterns/
├── bug_fixes/        # Known bug patterns and solutions
├── generation/       # Code generation templates
├── refactoring/      # Clean code patterns
└── architecture/     # Architecture decision patterns
```

If pattern match found (>80% confidence) → Skip investigation → Apply immediately

### Memory Files to Maintain

**UPDATE AFTER EVERY SIGNIFICANT ACTION:**

- `SESSION_CONTINUITY.md` - Track all actions, decisions, patterns used
- `patterns/*/*.md` - Capture successful patterns for reuse
- `memory/learning_archive.md` - Document what worked/didn't work
- `memory/error_patterns.md` - Track recurring errors
- `memory/side_effects_log.md` - Document known side effects

---

## TESTING DECISION PROTOCOL (SELECTIVE TDD)

Before writing any code whatsoever, you must first execute the complete Testing Decision Protocol to determine the appropriate testing strategy. This protocol consists of seven sequential steps that must be followed exactly.

### Step 1: Identify Code Purpose

Determine the purpose of the code you are about to write:

- If creating a **quick utility or automation script** → Proceed to Step 6
- If building a **learning exercise or tutorial** → Proceed to Step 6
- If writing **throwaway code to test a concept** → Proceed to Step 6
- If modifying **example code or snippets** → Proceed to Step 6
- For all other code → Continue to Step 2

### Step 2: Analyze Code Complexity

Count decision points to determine cyclomatic complexity:

- Each `if` statement = 1 point
- Each `case` in switch statement = 1 point
- Each loop = 1 point
- Each logical AND (`&&`) or OR (`||`) = 1 point

**Total complexity ≥ 7** → Proceed to Step 3 (TDD Required)  
**Total complexity < 7** → Continue to Step 4

### Step 3: Test-Driven Development (Complex Code)

For complex code, you MUST follow strict TDD:

1) Write **failing tests** that define expected behavior BEFORE any implementation
2) Implement **minimal code** to make tests pass
3) Run all tests to verify they pass
4) **Refactor** while keeping tests green
5) If complexity > 10 → Split into smaller functions and repeat TDD for each
6) Once complete → Proceed to Step 7

### Step 4: Check Significance Triggers

Even if complexity is low, check for these mandatory TDD triggers:

- Building a **reusable library/module** → Return to Step 3
- Code will be **shared on GitHub** → Return to Step 3
- Implementing an **algorithm for future reference** → Return to Step 3
- Working with **complex data structures** → Return to Step 3
- None apply → Continue to Step 5

### Step 5: AI-Generated Code Validation

For AI-generated code:

1) Verify compilation and execution without errors
2) Count complexity using Step 2 method
3) If complexity > 5 → Write at least ONE comprehensive test
4) Check for over-engineering (AI often creates complex solutions for simple problems)
5) If you'll maintain/extend this code → Return to Step 3
6) Otherwise → Proceed to Step 6

### Step 6: Direct Implementation (No Formal Tests)

When tests are not required:

1) Write code without formal test suites
2) Verify through manual testing or print statements
3) Run multiple times under different conditions
4) Add detailed comments for non-obvious logic
5) Proceed to Step 7

### Step 7: Final Validation

Regardless of path taken:

- Ensure all code runs without errors/warnings
- For tested code: Verify tests demonstrate core functionality
- For untested code: Ensure you understand every part
- If bugs appear later in untested code → Return to Step 3 immediately
- Save/commit with clear documentation of what changed and why

---

## PROJECT-SPECIFIC PARALLEL TASK CONFIGURATION

### Phase 0: Pattern Check (EXECUTE FIRST)

```bash
# Before launching parallel tasks
check_existing_patterns() {
    echo "Checking patterns/ for existing solutions…"
    # Search patterns for similar problem
    # Time limit: 10 seconds
    # If match >80%: Report and skip to implementation
}
```

### Customized 7-Agent Workflow

1) **Component**: Create main component with pattern check
2) **Styles**: Apply project style patterns
3) **Tests**: Use Testing Decision Protocol to determine approach
4) **Types**: Generate types/interfaces
5) **Utilities**: Check for existing utils before creating
6) **Integration**: Update imports/exports
7) **Documentation**: Update docs + capture new patterns
8) **Validation**: Verify all tests pass + update SESSION_CONTINUITY.md

### Clean Code Integration

Each task includes clean code checks:

- Functions must be <20 lines (split if larger)
- Apply DRY principle (check patterns first)
- Single responsibility per component
- Maximum 3 levels of nesting
- Early returns over complex conditionals

---

## ENHANCED BACKUP PROCEDURES

### Project-Specific Backup Triggers

In addition to global 30-minute backups, create backups when:

- Pattern successfully captured → `create_backup "pattern_captured"`
- Before major refactoring → `create_backup "pre_refactor"`
- After clean code improvements → `create_backup "clean_code_applied"`
- Complex feature completed → `create_backup "feature_complete"`

### Extended Backup Function

```bash
# Project-specific backup enhancements
create_project_backup() {
    # Call global backup function
    create_backup "$1"
    
    # Additionally backup patterns and memory
    backup_dir="backups/$(date +%Y-%m-%d)_v$(ls -d backups/$(date +%Y-%m-%d)_v* 2>/dev/null | wc -l | xargs expr 1 +)"
    
    # Copy pattern library
    [ -d "patterns" ] && cp -r "patterns" "$backup_dir/"
    [ -d "memory" ] && cp -r "memory" "$backup_dir/"
    [ -f "SESSION_CONTINUITY.md" ] && cp "SESSION_CONTINUITY.md" "$backup_dir/"
    
    # Update backup info with pattern stats
    echo "Patterns captured: $(find patterns -name "*.md" 2>/dev/null | wc -l)" >> "$backup_dir/backup_info.txt"
    echo "Memory files: $(find memory -name "*.md" 2>/dev/null | wc -l)" >> "$backup_dir/backup_info.txt"
}
```

---

## SESSION CONTINUITY TEMPLATE

Update SESSION_CONTINUITY.md after EVERY action:

```markdown
## [Timestamp] - [Action Type]

### Current Status
- **Task**: [What you're working on]
- **Progress**: [What's been completed]
- **Pattern Match**: [If pattern was found/used]
- **Testing Approach**: [TDD/Direct/None based on protocol]
- **Next Step**: [What needs to be done next]

### Files Modified
- [filename]: [what changed and why]

### Testing Decision
- **Complexity Score**: [If calculated]
- **TDD Required**: [Yes/No and why]
- **Tests Written**: [List test files if any]

### Patterns Used/Created
- **Applied**: [pattern_name from patterns/]
- **Created**: [new_pattern_name if captured]

### Decisions & Rationale
- [Key decision]: [Why this approach]

### Time Saved
- Pattern reuse saved: [estimated minutes]
```

---

## PATTERN CAPTURE TEMPLATE

When capturing new patterns, create in patterns/[category]/[descriptive_name].md:

```markdown
# Pattern: [Descriptive Name]

## Problem
[Clear problem description this pattern solves]

## Solution
[Step-by-step approach]

## Code Template
```[language]
[Reusable code template]
```

## Testing Requirements

- Complexity score: [number]
- TDD used: [Yes/No]
- Test pattern: [If applicable]

## When to Use

- [Condition 1]
- [Condition 2]

## Time Saved

Estimated: [X minutes per use]

Actual uses: [Track each use]

```python

---

## PROJECT STRUCTURE

```python
project-root/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
├── CLAUDE.md              # This file
├── TODO.md                # Task tracking (30-min updates)
├── SESSION_CONTINUITY.md  # Memory persistence
├── patterns/              # Reusable solutions
│   ├── README.md
│   ├── bug_fixes/
│   ├── generation/
│   ├── refactoring/
│   └── architecture/
├── memory/                # Learning archive
│   ├── learning_archive.md
│   ├── error_patterns.md
│   └── side_effects_log.md
├── backups/               # Versioned backups
│   ├── YYYY-MM-DD_v1/
│   ├── YYYY-MM-DD_v2/
│   └── backup_log.txt
└── .project_context       # Auto-generated
```

---

## HANDOFF ENHANCEMENT

When generating handoff files, include pattern and testing statistics:

```bash
generate_project_handoff() {
    # Call global handoff generation
    generate_handoff_files
    
    # Add project-specific information
    cat >> HANDOFF_SUMMARY.md << EOF
## PATTERN LIBRARY STATUS
- Bug fixes: $(find patterns/bug_fixes -name "*.md" 2>/dev/null | wc -l) patterns
- Generation: $(find patterns/generation -name "*.md" 2>/dev/null | wc -l) patterns
- Refactoring: $(find patterns/refactoring -name "*.md" 2>/dev/null | wc -l) patterns
- Architecture: $(find patterns/architecture -name "*.md" 2>/dev/null | wc -l) patterns

## TESTING METRICS
- Files with TDD: $(grep -l "TDD Required: Yes" SESSION_CONTINUITY.md | wc -l)
- Direct implementations: $(grep -l "TDD Required: No" SESSION_CONTINUITY.md | wc -l)
- Average complexity: $(grep "Complexity Score:" SESSION_CONTINUITY.md | awk '{sum+=$3; count++} END {print sum/count}')

## MEMORY STATUS
- Total sessions tracked: $(grep -c "^##" SESSION_CONTINUITY.md 2>/dev/null || echo "0")
- Patterns applied: $(grep -c "Applied:" SESSION_CONTINUITY.md 2>/dev/null || echo "0")
- Time saved: $(grep "saved:" SESSION_CONTINUITY.md | awk '{sum+=$4} END {print sum}') minutes

## RECOMMENDED PATTERNS TO CHECK
[List patterns relevant to current work]
EOF
}
```

---

## WORKFLOW SUMMARY

1) **Start**: Check project CLAUDE.md (this file) + auto-initialize if needed
2) **Pattern Check**: Search patterns/ before any implementation (10s)
3) **If Match**: Apply pattern immediately (80% time saved)
4) **If No Match**: Execute Testing Decision Protocol
5) **Based on Protocol**: Either TDD or direct implementation
6) **During Work**: Update SESSION_CONTINUITY.md continuously
7) **After Success**: Capture as new pattern
8) **Every 30min**: TODO update + backup (includes patterns)
9) **At 90% Context**: Full backup + handoff with pattern/test stats

---

## EFFICIENCY METRICS

Track in memory/learning_archive.md:

- Patterns created: [count]
- Patterns reused: [count]
- TDD applications: [count]
- Direct implementations: [count]
- Average complexity handled: [number]
- Average time saved: [minutes]
- Common problems solved: [list]

**Goals:**

- 80% of repeated tasks should use existing patterns
- TDD for all complex code (complexity ≥ 7)
- Clean code principles in every implementation

---

## CRITICAL PROJECT RULES

1) **Pattern First**: ALWAYS check patterns/ before writing new code
2) **Testing Protocol**: ALWAYS run 7-step decision before coding
3) **Memory Persistence**: Update SESSION_CONTINUITY.md after EVERY action
4) **Capture Success**: Turn successful implementations into patterns
5) **Clean Code**: Enforce during implementation, not after
6) **Parallel Execution**: Use 7 agents for investigation, testing, validation
7) **Sequential Implementation**: Code changes must be sequential
8) **Inherit Global**: All global rules apply unless overridden here
9) **Auto-Initialize**: Run structure initialization on every first interaction
