// Test suite for toggleMinimize functionality
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Read the index.html file
const indexPath = path.join(__dirname, '../views/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// Create a JSDOM instance
const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('Testing toggleMinimize functionality...\n');
    
    let passed = 0;
    let failed = 0;
    
    function assert(condition, testName, details = '') {
        if (condition) {
            console.log(`✓ ${testName}`);
            if (details) console.log(`  ${details}`);
            passed++;
        } else {
            console.log(`✗ ${testName}`);
            if (details) console.log(`  ${details}`);
            failed++;
        }
    }
    
    // Test 1: Check if toggleMinimize function exists
    assert(
        typeof window.toggleMinimize === 'function',
        'toggleMinimize function exists',
        'Function is available in global scope'
    );
    
    // Test 2: Check if minimizedContainers Map exists
    assert(
        window.minimizedContainers instanceof Map,
        'minimizedContainers Map exists',
        'State tracking Map is initialized'
    );
    
    // Test 3: Check if minimized-tabs element exists
    const minimizedTabs = document.getElementById('minimized-tabs');
    assert(
        minimizedTabs !== null,
        'minimized-tabs element exists',
        'Tab container is present in DOM'
    );
    
    // Test 4: Check initial state
    assert(
        minimizedTabs.classList.contains('hidden'),
        'minimized-tabs initially hidden',
        'Tab container starts hidden'
    );
    
    // Test 5: Find a test container
    const testContainer = document.getElementById('kismet-container');
    assert(
        testContainer !== null,
        'Test container found',
        'kismet-container exists in DOM'
    );
    
    if (testContainer) {
        // Test 6: Find toggle button
        const toggleButton = testContainer.querySelector('button[onclick*="toggleMinimize"]');
        assert(
            toggleButton !== null,
            'Toggle button found',
            'Button with toggleMinimize onclick exists'
        );
        
        if (toggleButton) {
            // Test 7: Simulate minimize
            window.toggleMinimize(toggleButton);
            
            assert(
                testContainer.classList.contains('minimized'),
                'Container minimized',
                'minimized class added to container'
            );
            
            assert(
                !minimizedTabs.classList.contains('hidden'),
                'Tabs bar shown',
                'minimized-tabs no longer hidden'
            );
            
            assert(
                window.minimizedContainers.has('kismet-container'),
                'State tracked in Map',
                'Container ID added to minimizedContainers'
            );
            
            const tab = minimizedTabs.querySelector('[data-container-id="kismet-container"]');
            assert(
                tab !== null,
                'Tab created',
                'Minimized tab element created'
            );
            
            // Test 8: Check icon change
            const svgPath = toggleButton.querySelector('svg path');
            assert(
                svgPath && svgPath.getAttribute('d') === 'M4 6h16M4 12h16M4 18h16',
                'Icon changed to restore state',
                'SVG path updated to show three lines'
            );
            
            // Test 9: Simulate restore
            window.toggleMinimize(toggleButton);
            
            assert(
                !testContainer.classList.contains('minimized'),
                'Container restored',
                'minimized class removed from container'
            );
            
            assert(
                minimizedTabs.classList.contains('hidden'),
                'Tabs bar hidden',
                'minimized-tabs hidden again'
            );
            
            assert(
                !window.minimizedContainers.has('kismet-container'),
                'State removed from Map',
                'Container ID removed from minimizedContainers'
            );
            
            assert(
                svgPath && svgPath.getAttribute('d') === 'M20 12H4',
                'Icon changed back to minimize state',
                'SVG path updated to show single line'
            );
        }
    }
    
    // Test 10: CSS classes exist
    const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
            try {
                return Array.from(sheet.cssRules || []);
            } catch (e) {
                return [];
            }
        })
        .map(rule => rule.selectorText)
        .filter(Boolean);
    
    assert(
        styles.includes('.grid-item.minimized'),
        'CSS class .grid-item.minimized exists',
        'Minimized state CSS is defined'
    );
    
    assert(
        styles.includes('.minimized-tab'),
        'CSS class .minimized-tab exists',
        'Tab styling CSS is defined'
    );
    
    // Summary
    console.log(`\n==============================`);
    console.log(`Tests completed: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`==============================`);
    
    process.exit(failed > 0 ? 1 : 0);
});

// Set a timeout to ensure tests complete
setTimeout(() => {
    console.error('Tests timed out');
    process.exit(1);
}, 5000);