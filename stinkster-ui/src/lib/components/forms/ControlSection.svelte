<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { fade } from 'svelte/transition';

	export let title: string;
	export let description: string = '';
	export let icon: ComponentType | undefined = undefined;
	export let collapsed: boolean = false;
</script>

<section class="control-section" transition:fade={{ duration: 200 }}>
	<header class="section-header" class:collapsed>
		{#if icon}
			<div class="icon-wrapper">
				<svelte:component this={icon} size={20} />
			</div>
		{/if}
		
		<div class="header-text">
			<h3 class="section-title">{title}</h3>
			{#if description}
				<p class="section-description">{description}</p>
			{/if}
		</div>
	</header>

	<div class="section-content" class:collapsed>
		<slot />
	</div>
</section>

<style>
	.control-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		backdrop-filter: blur(10px);
		overflow: hidden;
		transition: all 0.3s ease;
		position: relative;
	}

	.control-section::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.03) 0%,
			transparent 100%
		);
		pointer-events: none;
	}

	.control-section:hover {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.15);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.5rem 1.5rem 1rem;
		position: relative;
	}

	.section-header.collapsed {
		padding-bottom: 1.5rem;
	}

	.icon-wrapper {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 255, 255, 0.1);
		border: 1px solid rgba(0, 255, 255, 0.2);
		border-radius: 0.75rem;
		color: #00ffff;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.icon-wrapper::before {
		content: '';
		position: absolute;
		inset: -50%;
		background: conic-gradient(
			from 0deg,
			transparent,
			rgba(0, 255, 255, 0.3),
			transparent
		);
		animation: rotate 4s linear infinite;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.control-section:hover .icon-wrapper::before {
		opacity: 1;
	}

	@keyframes rotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.header-text {
		flex: 1;
	}

	.section-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #ffffff;
		line-height: 1.2;
	}

	.section-description {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.4;
	}

	.section-content {
		padding: 0 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.section-content.collapsed {
		display: none;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.control-section {
			border-radius: 0.75rem;
		}

		.section-header {
			padding: 1.25rem 1.25rem 0.75rem;
		}

		.section-content {
			padding: 0 1.25rem 1.25rem;
			gap: 0.75rem;
		}

		.icon-wrapper {
			width: 2.25rem;
			height: 2.25rem;
		}

		.section-title {
			font-size: 1rem;
		}

		.section-description {
			font-size: 0.8125rem;
		}
	}
</style>