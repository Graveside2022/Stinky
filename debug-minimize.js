// Debug script to test minimize button functionality
// Run this in the browser console when on the Kismet Operations page

console.log('=== Minimize Button Debug ===');

// Check if minimizeToTab function exists
console.log('minimizeToTab function exists:', typeof minimizeToTab === 'function');
console.log('window.minimizeToTab exists:', typeof window.minimizeToTab === 'function');

// Find all minimize buttons
const buttons = document.querySelectorAll('button[onclick*="minimizeToTab"]');
console.log('\nFound', buttons.length, 'minimize buttons');

// Check each button
buttons.forEach((btn, idx) => {
    const container = btn.closest('.grid-item');
    const containerInfo = {
        id: container?.id || 'NO_ID',
        display: window.getComputedStyle(container || btn).display,
        visibility: window.getComputedStyle(container || btn).visibility
    };
    
    const buttonInfo = {
        onclick: btn.getAttribute('onclick'),
        clickable: !btn.disabled && window.getComputedStyle(btn).pointerEvents !== 'none',
        position: btn.getBoundingClientRect(),
        styles: {
            display: window.getComputedStyle(btn).display,
            visibility: window.getComputedStyle(btn).visibility,
            pointerEvents: window.getComputedStyle(btn).pointerEvents,
            zIndex: window.getComputedStyle(btn).zIndex
        }
    };
    
    console.log(`\nButton ${idx + 1}:`, {
        container: containerInfo,
        button: buttonInfo
    });
    
    // Try to simulate click
    try {
        console.log(`Testing click on button ${idx + 1}...`);
        btn.click();
        console.log('Click event triggered successfully');
    } catch (e) {
        console.error('Click failed:', e.message);
    }
});

// Check for any overlapping elements
console.log('\n=== Checking for overlapping elements ===');
buttons.forEach((btn, idx) => {
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    
    if (elementAtPoint !== btn && !btn.contains(elementAtPoint)) {
        console.warn(`Button ${idx + 1} might be blocked by:`, elementAtPoint);
    } else {
        console.log(`Button ${idx + 1} is accessible`);
    }
});

console.log('\n=== Debug complete ===');