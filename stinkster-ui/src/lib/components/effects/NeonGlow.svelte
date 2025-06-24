<script>
	export let color = '#64ffda';
	export let intensity = 'medium';
	export let pulse = false;
	export let as = 'div';
	
	// Convert hex to RGB for glow effects
	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 100, g: 255, b: 218 };
	}
	
	$: rgb = hexToRgb(color);
	$: rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
	
	// Intensity mappings
	const glowSizes = {
		low: {
			small: '0 0 5px',
			medium: '0 0 10px',
			large: '0 0 15px'
		},
		medium: {
			small: '0 0 10px',
			medium: '0 0 20px',
			large: '0 0 30px'
		},
		high: {
			small: '0 0 15px',
			medium: '0 0 30px',
			large: '0 0 45px'
		}
	};
	
	$: glowSize = glowSizes[intensity] || glowSizes.medium;
	
	// Build shadow string
	$: textShadow = `
		${glowSize.small} rgba(${rgbString}, 0.8),
		${glowSize.medium} rgba(${rgbString}, 0.6),
		${glowSize.large} rgba(${rgbString}, 0.4)
	`.trim();
	
	$: boxShadow = `
		inset 0 0 10px rgba(${rgbString}, 0.2),
		${glowSize.small} rgba(${rgbString}, 0.8),
		${glowSize.medium} rgba(${rgbString}, 0.6),
		${glowSize.large} rgba(${rgbString}, 0.4)
	`.trim();
</script>

<svelte:element 
	this={as}
	class="neon-glow"
	class:pulse
	style="
		--glow-color: {color};
		--glow-rgb: {rgbString};
		--text-shadow: {textShadow};
		--box-shadow: {boxShadow};
	"
	{...$$restProps}
>
	<slot />
</svelte:element>

<style>
	.neon-glow {
		position: relative;
		color: var(--glow-color);
		text-shadow: var(--text-shadow);
		transition: all 0.3s ease;
		will-change: filter, transform;
	}
	
	/* For container elements */
	.neon-glow:not(:is(h1, h2, h3, h4, h5, h6, p, span, a, button)) {
		box-shadow: var(--box-shadow);
		border: 1px solid rgba(var(--glow-rgb), 0.3);
		background: rgba(var(--glow-rgb), 0.05);
		backdrop-filter: blur(10px);
	}
	
	/* Hover effect */
	.neon-glow:hover {
		filter: brightness(1.2);
		transform: translateY(-1px);
	}
	
	/* Active state */
	.neon-glow:active {
		filter: brightness(0.9);
		transform: translateY(0);
	}
	
	/* Pulse animation */
	.neon-glow.pulse {
		animation: neon-pulse 2s ease-in-out infinite;
	}
	
	@keyframes neon-pulse {
		0%, 100% {
			filter: brightness(1);
			text-shadow: var(--text-shadow);
			box-shadow: var(--box-shadow);
		}
		50% {
			filter: brightness(1.3);
			text-shadow: 
				0 0 15px rgba(var(--glow-rgb), 1),
				0 0 30px rgba(var(--glow-rgb), 0.8),
				0 0 45px rgba(var(--glow-rgb), 0.6);
			box-shadow: 
				inset 0 0 15px rgba(var(--glow-rgb), 0.3),
				0 0 15px rgba(var(--glow-rgb), 1),
				0 0 30px rgba(var(--glow-rgb), 0.8),
				0 0 45px rgba(var(--glow-rgb), 0.6);
		}
	}
	
	/* Button specific styles */
	:global(button).neon-glow {
		border: 2px solid rgba(var(--glow-rgb), 0.5);
		background: rgba(var(--glow-rgb), 0.1);
		padding: 0.75em 1.5em;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
	}
	
	:global(button).neon-glow::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		background: rgba(var(--glow-rgb), 0.3);
		border-radius: 50%;
		transform: translate(-50%, -50%);
		transition: width 0.6s, height 0.6s;
	}
	
	:global(button).neon-glow:hover::before {
		width: 300px;
		height: 300px;
	}
	
	/* Link specific styles */
	:global(a).neon-glow {
		text-decoration: none;
		display: inline-block;
		position: relative;
	}
	
	:global(a).neon-glow::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 2px;
		background: var(--glow-color);
		box-shadow: 0 0 10px rgba(var(--glow-rgb), 0.8);
		transition: width 0.3s ease;
	}
	
	:global(a).neon-glow:hover::after {
		width: 100%;
	}
	
	/* Input specific styles */
	:global(input).neon-glow,
	:global(textarea).neon-glow {
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid rgba(var(--glow-rgb), 0.3);
		padding: 0.5em 1em;
		outline: none;
		transition: all 0.3s ease;
	}
	
	:global(input).neon-glow:focus,
	:global(textarea).neon-glow:focus {
		border-color: rgba(var(--glow-rgb), 0.8);
		box-shadow: 
			inset 0 0 10px rgba(var(--glow-rgb), 0.2),
			0 0 10px rgba(var(--glow-rgb), 0.5);
	}
	
	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.neon-glow {
			animation: none !important;
			transition: none !important;
		}
		
		.neon-glow::before,
		.neon-glow::after {
			transition: none !important;
		}
	}
</style>