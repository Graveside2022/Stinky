// Common Utilities JavaScript
// Shared functionality for all setup pages

// Smooth scroll to elements
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Copy text to clipboard
async function copyToClipboard(text, buttonElement) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show feedback
        const originalText = buttonElement ? buttonElement.textContent : '';
        if (buttonElement) {
            buttonElement.textContent = 'Copied!';
            buttonElement.style.backgroundColor = '#00ff88';
            
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.backgroundColor = '';
            }, 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

// Add copy functionality to code blocks
function initializeCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(codeBlock => {
        const wrapper = codeBlock.parentElement;
        wrapper.style.position = 'relative';
        
        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = 'code-copy-button';
        copyButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            background: rgba(0, 210, 255, 0.8);
            color: #030610;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        
        // Add hover effect
        copyButton.addEventListener('mouseenter', () => {
            copyButton.style.background = 'rgba(0, 255, 136, 0.9)';
        });
        
        copyButton.addEventListener('mouseleave', () => {
            copyButton.style.background = 'rgba(0, 210, 255, 0.8)';
        });
        
        // Add click handler
        copyButton.addEventListener('click', () => {
            copyToClipboard(codeBlock.textContent, copyButton);
        });
        
        wrapper.appendChild(copyButton);
    });
}

// Add external link indicators
function initializeExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]');
    
    links.forEach(link => {
        // Skip if it's the same origin
        if (link.hostname === window.location.hostname) return;
        
        // Add external link indicator
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        // Add visual indicator
        if (!link.querySelector('.external-link-icon')) {
            const icon = document.createElement('span');
            icon.className = 'external-link-icon';
            icon.innerHTML = ' ↗';
            icon.style.fontSize = '0.8em';
            link.appendChild(icon);
        }
    });
}

// Handle responsive navigation
function initializeResponsiveNav() {
    const backButton = document.querySelector('.back-button');
    
    if (backButton) {
        // Add touch feedback for mobile
        backButton.addEventListener('touchstart', () => {
            backButton.style.transform = 'scale(0.95)';
        });
        
        backButton.addEventListener('touchend', () => {
            backButton.style.transform = '';
        });
    }
}

// Format timestamps
function formatTimestamp(date) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    return new Date(date).toLocaleString('en-US', options);
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Add fade-in animation to elements
function initializeFadeInAnimations() {
    const elements = document.querySelectorAll('.grid-item');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.5s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    elements.forEach(element => {
        element.style.opacity = '0';
        observer.observe(element);
    });
}

// Add fade-in animation
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(fadeInStyle);

// Initialize all utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCodeBlocks();
    initializeExternalLinks();
    initializeResponsiveNav();
    initializeFadeInAnimations();
});

// Export utilities for use in other scripts
window.utils = {
    smoothScrollTo,
    copyToClipboard,
    formatTimestamp,
    debounce,
    isInViewport
};