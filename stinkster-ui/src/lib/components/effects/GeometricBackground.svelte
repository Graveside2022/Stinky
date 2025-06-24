<script>
	import { onMount } from 'svelte';
	
	let mounted = false;
	
	onMount(() => {
		mounted = true;
		return () => {
			mounted = false;
		};
	});
</script>

<div class="geometric-background">
	<!-- Depth gradient layer -->
	<div class="depth-gradient"></div>
	
	<!-- Floating shapes layer -->
	<div class="floating-shapes">
		{#each Array(15) as _, i}
			<div 
				class="shape shape-{i % 3}" 
				style="
					--delay: {i * 0.5}s;
					--duration: {20 + (i % 4) * 5}s;
					left: {(i * 7) % 100}%;
					top: {(i * 13) % 100}%;
				"
			></div>
		{/each}
	</div>
	
	<!-- Grid pattern -->
	<div class="grid-pattern">
		<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern id="tech-grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
					<rect width="50" height="50" fill="none" stroke="rgba(100, 255, 218, 0.1)" stroke-width="0.5"/>
					<circle cx="25" cy="25" r="1" fill="rgba(100, 255, 218, 0.3)"/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#tech-grid)"/>
		</svg>
	</div>
	
	<!-- Hexagon overlay -->
	<div class="hexagon-overlay">
		<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern id="hexagon-pattern" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
					<polygon 
						points="30,1 45,13 45,39 30,51 15,39 15,13" 
						fill="none" 
						stroke="rgba(138, 43, 226, 0.1)" 
						stroke-width="0.5"
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#hexagon-pattern)"/>
		</svg>
	</div>
	
	<!-- Circuit lines -->
	<div class="circuit-lines">
		{#each Array(5) as _, i}
			<svg 
				class="circuit-line" 
				style="--index: {i}; --delay: {i * 2}s;"
				viewBox="0 0 1000 100" 
				preserveAspectRatio="none"
			>
				<path 
					d="M0,50 L200,50 L250,20 L400,20 L450,50 L600,50 L650,80 L800,80 L850,50 L1000,50"
					fill="none"
					stroke="rgba(100, 255, 218, 0.3)"
					stroke-width="2"
				/>
				<circle cx="250" cy="20" r="3" fill="rgba(100, 255, 218, 0.8)"/>
				<circle cx="450" cy="50" r="3" fill="rgba(100, 255, 218, 0.8)"/>
				<circle cx="650" cy="80" r="3" fill="rgba(100, 255, 218, 0.8)"/>
			</svg>
		{/each}
	</div>
	
	<!-- Accent triangles -->
	<div class="accent-triangles">
		{#each Array(8) as _, i}
			<div 
				class="triangle" 
				style="
					--rotation: {i * 45}deg;
					--delay: {i * 0.5}s;
					left: {20 + (i * 10) % 60}%;
					top: {10 + (i * 15) % 80}%;
				"
			></div>
		{/each}
	</div>
	
	<!-- Node patterns -->
	<div class="node-patterns">
		<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern id="node-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
					<circle cx="10" cy="10" r="2" fill="rgba(138, 43, 226, 0.2)">
						<animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite"/>
					</circle>
					<circle cx="90" cy="90" r="2" fill="rgba(100, 255, 218, 0.2)">
						<animate attributeName="r" values="2;4;2" dur="3s" begin="1.5s" repeatCount="indefinite"/>
					</circle>
					<line x1="10" y1="10" x2="90" y2="90" stroke="rgba(100, 255, 218, 0.1)" stroke-width="0.5">
						<animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
					</line>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#node-pattern)"/>
		</svg>
	</div>
</div>

<style>
	.geometric-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		z-index: -1;
	}
	
	/* Depth gradient */
	.depth-gradient {
		position: absolute;
		inset: 0;
		background: 
			radial-gradient(ellipse at 20% 30%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
			radial-gradient(ellipse at 80% 70%, rgba(100, 255, 218, 0.1) 0%, transparent 50%),
			radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.8) 0%, transparent 70%);
		animation: gradient-shift 20s ease-in-out infinite;
	}
	
	/* Floating shapes */
	.floating-shapes {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	
	.shape {
		position: absolute;
		opacity: 0.1;
		animation: float-shapes var(--duration) ease-in-out infinite;
		animation-delay: var(--delay);
		will-change: transform;
	}
	
	.shape-0 {
		width: 30px;
		height: 30px;
		background: rgba(100, 255, 218, 0.3);
		border-radius: 50%;
		filter: blur(2px);
	}
	
	.shape-1 {
		width: 40px;
		height: 40px;
		background: rgba(138, 43, 226, 0.3);
		transform: rotate(45deg);
		filter: blur(2px);
	}
	
	.shape-2 {
		width: 0;
		height: 0;
		border-left: 20px solid transparent;
		border-right: 20px solid transparent;
		border-bottom: 35px solid rgba(100, 255, 218, 0.3);
		filter: blur(2px);
	}
	
	/* Grid pattern */
	.grid-pattern {
		position: absolute;
		inset: 0;
		opacity: 0.3;
		animation: grid-drift 30s linear infinite;
		will-change: transform;
	}
	
	/* Hexagon overlay */
	.hexagon-overlay {
		position: absolute;
		inset: 0;
		opacity: 0.2;
		animation: hexagon-pulse 15s ease-in-out infinite;
	}
	
	/* Circuit lines */
	.circuit-lines {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	
	.circuit-line {
		position: absolute;
		width: 100%;
		height: 100px;
		top: calc(var(--index) * 20%);
		opacity: 0.5;
		animation: circuit-flow 10s linear infinite;
		animation-delay: var(--delay);
	}
	
	/* Accent triangles */
	.accent-triangles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	
	.triangle {
		position: absolute;
		width: 0;
		height: 0;
		border-left: 15px solid transparent;
		border-right: 15px solid transparent;
		border-bottom: 26px solid rgba(100, 255, 218, 0.2);
		transform: rotate(var(--rotation));
		animation: triangle-rotate 20s linear infinite;
		animation-delay: var(--delay);
		will-change: transform;
	}
	
	/* Node patterns */
	.node-patterns {
		position: absolute;
		inset: 0;
		opacity: 0.5;
		mix-blend-mode: screen;
	}
	
	/* Animations */
	@keyframes gradient-shift {
		0%, 100% { transform: scale(1) rotate(0deg); }
		50% { transform: scale(1.1) rotate(180deg); }
	}
	
	@keyframes float-shapes {
		0% {
			transform: translateY(0) translateX(0) rotate(0deg);
		}
		33% {
			transform: translateY(-30px) translateX(20px) rotate(120deg);
		}
		66% {
			transform: translateY(20px) translateX(-30px) rotate(240deg);
		}
		100% {
			transform: translateY(0) translateX(0) rotate(360deg);
		}
	}
	
	@keyframes grid-drift {
		0% { transform: translateX(0) translateY(0); }
		100% { transform: translateX(50px) translateY(50px); }
	}
	
	@keyframes hexagon-pulse {
		0%, 100% { opacity: 0.2; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(1.05); }
	}
	
	@keyframes circuit-flow {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}
	
	@keyframes triangle-rotate {
		0% { transform: rotate(var(--rotation)) scale(1); }
		50% { transform: rotate(calc(var(--rotation) + 180deg)) scale(1.2); }
		100% { transform: rotate(calc(var(--rotation) + 360deg)) scale(1); }
	}
	
	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.shape,
		.grid-pattern,
		.hexagon-overlay,
		.circuit-line,
		.triangle {
			animation: none;
		}
		
		.depth-gradient {
			animation: gradient-shift 60s ease-in-out infinite;
		}
	}
</style>