<script lang="ts">
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let color: 'primary' | 'secondary' | 'white' | 'current' = 'primary';
	export let label = 'Loading';

	const sizes = {
		sm: { width: 24, height: 24, strokeWidth: 3 },
		md: { width: 36, height: 36, strokeWidth: 4 },
		lg: { width: 48, height: 48, strokeWidth: 5 }
	};

	const colors = {
		primary: '#3b82f6',
		secondary: '#6366f1',
		white: '#ffffff',
		current: 'currentColor'
	};

	$: dimensions = sizes[size];
	$: strokeColor = colors[color];
</script>

<div
	class="spinner-container"
	class:sm={size === 'sm'}
	class:md={size === 'md'}
	class:lg={size === 'lg'}
	role="status"
	aria-label={label}
>
	<svg
		class="spinner"
		width={dimensions.width}
		height={dimensions.height}
		viewBox="0 0 50 50"
		xmlns="http://www.w3.org/2000/svg"
	>
		<circle
			class="path"
			cx="25"
			cy="25"
			r="20"
			fill="none"
			stroke={strokeColor}
			stroke-width={dimensions.strokeWidth}
			stroke-linecap="round"
		/>
	</svg>
	<span class="sr-only">{label}</span>
</div>

<style>
	.spinner-container {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		animation: rotate 2s linear infinite;
	}

	.path {
		stroke-dasharray: 126;
		stroke-dashoffset: 0;
		transform-origin: center;
		animation: dash 1.5s ease-in-out infinite;
	}

	@keyframes rotate {
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes dash {
		0% {
			stroke-dasharray: 1 126;
			stroke-dashoffset: 0;
		}
		50% {
			stroke-dasharray: 100 126;
			stroke-dashoffset: -25;
		}
		100% {
			stroke-dasharray: 100 126;
			stroke-dashoffset: -125;
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Size modifiers for inline usage */
	.sm {
		font-size: 0.875rem;
	}

	.md {
		font-size: 1rem;
	}

	.lg {
		font-size: 1.25rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: rotate 4s linear infinite;
		}
		.path {
			animation: none;
			stroke-dasharray: 63 126;
		}
	}
</style>