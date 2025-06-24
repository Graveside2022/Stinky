/**
 * Test script to verify drag, resize, and minimize functionality
 * Run this in the browser console to test all features
 */

function testFunctionality() {
    console.log('Starting functionality tests...');
    
    // Test 1: Check if minimize buttons exist
    const minimizeButtons = document.querySelectorAll('.control-button-small[title="Minimize"]');
    console.log(`Found ${minimizeButtons.length} minimize buttons`);
    
    // Test 2: Check if grid items are draggable
    const gridItems = document.querySelectorAll('.grid-item');
    console.log(`Found ${gridItems.length} grid items`);
    
    let draggableCount = 0;
    gridItems.forEach((item, index) => {
        if (item.draggable || item.getAttribute('data-draggable') === 'true') {
            draggableCount++;
        }
    });
    console.log(`${draggableCount} items are draggable`);
    
    // Test 3: Check if resize handles exist
    const resizeHandles = document.querySelectorAll('.resize-handle');
    console.log(`Found ${resizeHandles.length} resize handles`);
    
    // Test 4: Check if minimized container exists
    const minimizedContainer = document.querySelector('.minimized-container');
    console.log(`Minimized container exists: ${!!minimizedContainer}`);
    
    // Test 5: Test minimize functionality
    if (minimizeButtons.length > 0) {
        console.log('Testing minimize on first button...');
        const firstButton = minimizeButtons[0];
        const gridItem = firstButton.closest('.grid-item');
        const itemId = gridItem?.id;
        
        // Simulate click
        firstButton.click();
        
        setTimeout(() => {
            const minimizedItems = document.querySelectorAll('.minimized-item');
            console.log(`After minimize: Found ${minimizedItems.length} minimized items`);
            
            // Check if item was properly minimized
            if (itemId) {
                const isMinimized = gridItem.classList.contains('minimized');
                console.log(`Grid item ${itemId} minimized: ${isMinimized}`);
            }
        }, 100);
    }
    
    // Test 6: Check theme functionality
    const themeToggle = document.querySelector('.theme-toggle');
    console.log(`Theme toggle button exists: ${!!themeToggle}`);
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    console.log(`Current theme: ${currentTheme}`);
    
    // Test 7: Check CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const cssVars = {
        '--bg-primary': computedStyle.getPropertyValue('--bg-primary'),
        '--accent-primary': computedStyle.getPropertyValue('--accent-primary'),
        '--text-primary': computedStyle.getPropertyValue('--text-primary')
    };
    console.log('CSS Variables:', cssVars);
    
    console.log('Tests completed!');
}

// Run the test
testFunctionality();