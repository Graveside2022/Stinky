<script>
	export let position = 'top'; // 'top' or 'bottom'
	export let color = 'rgba(100, 255, 218, 0.8)';
	export let speed = 3; // seconds
	export let height = 2; // pixels
	export let delay = 0; // animation delay in seconds
	export let continuous = true; // continuous scanning or single pass
	export let direction = 'horizontal'; // 'horizontal' or 'vertical'
	export let blurAmount = 4; // pixels
	
	// Calculate animation duration based on speed
	$: duration = `${speed}s`;
	$: animationDelay = `${delay}s`;
	$: iterationCount = continuous ? 'infinite' : '1';
	
	// Position styles
	$: positionStyles = position === 'top' 
		? 'top: 0; left: 0;' 
		: 'bottom: 0; left: 0;';
		
	$: dimensionStyles = direction === 'horizontal'
		? `width: 100%; height: ${height}px;`
		: `width: ${height}px; height: 100%;`;
		
	$: animationName = direction === 'horizontal' 
		? 'scan-horizontal' 
		: 'scan-vertical';
</script>

<div 
	class="scan-line-container"
	style="{positionStyles} {dimensionStyles}"
>
	<div 
		class="scan-line {direction}"
		style="
			--scan-color: {color};
			--scan-duration: {duration};
			--scan-delay: {animationDelay};
			--scan-iterations: {iterationCount};
			--scan-blur: {blurAmount}px;
			--animation-name: {animationName};
		"
	>
		<div class="scan-core"></div>
		<div class="scan-trail"></div>
		<div class="scan-glow"></div>
	</div>
</div>

<style>
	.scan-line-container {
		position: absolute;
		overflow: hidden;
		pointer-events: none;
		z-index: 10;
	}
	
	.scan-line {
		position: absolute;
		animation: var(--animation-name) var(--scan-duration) linear var(--scan-iterations);
		animation-delay: var(--scan-delay);
		will-change: transform;
	}
	
	.scan-line.horizontal {
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
	}
	
	.scan-line.vertical {
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
	}
	
	/* Core scan line */
	.scan-core {
		position: absolute;
		background: var(--scan-color);
		filter: blur(0);
		z-index: 3;
	}
	
	.horizontal .scan-core {
		width: 100%;
		height: 100%;
		transform: scaleY(1);
	}
	
	.vertical .scan-core {
		width: 100%;
		height: 100%;
		transform: scaleX(1);
	}
	
	/* Trailing glow */
	.scan-trail {
		position: absolute;
		background: linear-gradient(
			to right,
			transparent,
			var(--scan-color),
			transparent
		);
		opacity: 0.5;
		filter: blur(calc(var(--scan-blur) * 0.5));
		z-index: 2;
	}
	
	.horizontal .scan-trail {
		width: 200%;
		height: 300%;
		top: -100%;
		left: -50%;
	}
	
	.vertical .scan-trail {
		width: 300%;
		height: 200%;
		top: -50%;
		left: -100%;
		background: linear-gradient(
			to bottom,
			transparent,
			var(--scan-color),
			transparent
		);
	}
	
	/* Outer glow */
	.scan-glow {
		position: absolute;
		background: var(--scan-color);
		opacity: 0.3;
		filter: blur(var(--scan-blur));
		z-index: 1;
	}
	
	.horizontal .scan-glow {
		width: 100%;
		height: 500%;
		top: -200%;
		left: 0;
	}
	
	.vertical .scan-glow {
		width: 500%;
		height: 100%;
		top: 0;
		left: -200%;
	}
	
	/* Animations */
	@keyframes scan-horizontal {
		0% {
			transform: translateY(-100vh);
		}
		100% {
			transform: translateY(100vh);
		}
	}
	
	@keyframes scan-vertical {
		0% {
			transform: translateX(-100vw);
		}
		100% {
			transform: translateX(100vw);
		}
	}
	
	/* Flicker effect */
	.scan-line::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--scan-color);
		opacity: 0;
		animation: flicker 0.1s ease-in-out infinite;
		animation-delay: var(--scan-delay);
		pointer-events: none;
	}
	
	@keyframes flicker {
		0%, 100% { opacity: 0; }
		50% { opacity: 0.1; }
	}
	
	/* Performance optimizations */
	.scan-line,
	.scan-core,
	.scan-trail,
	.scan-glow {
		transform-origin: center;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		perspective: 1000px;
		-webkit-perspective: 1000px;
	}
	
	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.scan-line {
			animation: none !important;
		}
		
		.scan-line::before {
			animation: none !important;
		}
	}
	
	/* Mobile optimizations */
	@media (max-width: 768px) {
		.scan-trail,
		.scan-glow {
			filter: blur(calc(var(--scan-blur) * 0.5));
		}
		
		.scan-line::before {
			animation: none;
		}
	}
</style>