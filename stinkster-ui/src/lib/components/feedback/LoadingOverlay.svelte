<script lang="ts">
	import { fade, blur } from 'svelte/transition';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import { onMount } from 'svelte';

	export let show = false;
	export let message = 'Loading...';
	export let zIndex = 1000;

	let previousActiveElement: HTMLElement | null = null;

	$: if (show) {
		// Store current focus and trap focus
		previousActiveElement = document.activeElement as HTMLElement;
		document.body.style.overflow = 'hidden';
	} else {
		// Restore focus and scroll
		if (previousActiveElement) {
			previousActiveElement.focus();
			previousActiveElement = null;
		}
		document.body.style.overflow = '';
	}

	onMount(() => {
		return () => {
			// Cleanup on unmount
			document.body.style.overflow = '';
		};
	});
</script>

{#if show}
	<div
		class="loading-overlay"
		style="z-index: {zIndex}"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-live="polite"
		aria-busy="true"
		aria-label={message}
	>
		<div class="backdrop" aria-hidden="true" />
		<div class="content" transition:blur={{ duration: 300, amount: 10 }}>
			<div class="glass-panel">
				<LoadingSpinner size="lg" />
				<p class="message">{message}</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.backdrop {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.content {
		position: relative;
		z-index: 1;
	}

	.glass-panel {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 16px;
		padding: 2rem 3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		min-width: 200px;
	}

	.message {
		margin: 0;
		color: white;
		font-size: 1.1rem;
		font-weight: 500;
		text-align: center;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	@media (prefers-reduced-motion: reduce) {
		.loading-overlay,
		.content {
			transition: none;
		}
		.backdrop {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background-color: rgba(0, 0, 0, 0.8);
		}
	}

	@media (max-width: 640px) {
		.glass-panel {
			padding: 1.5rem 2rem;
		}
		.message {
			font-size: 1rem;
		}
	}
</style>