<script lang="ts">
	import { fade } from 'svelte/transition';

	export let title = '';
	export let description = '';
	export let showPattern = true;
</script>

<div class="empty-state" transition:fade={{ duration: 300 }}>
	{#if showPattern}
		<div class="pattern" aria-hidden="true">
			<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
						<circle cx="20" cy="20" r="1" fill="currentColor" opacity="0.1" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />
			</svg>
		</div>
	{/if}

	<div class="content">
		{#if $$slots.icon}
			<div class="icon">
				<slot name="icon" />
			</div>
		{/if}

		{#if title}
			<h3 class="title">{title}</h3>
		{/if}

		{#if description}
			<p class="description">{description}</p>
		{/if}

		{#if $$slots.action}
			<div class="action">
				<slot name="action" />
			</div>
		{/if}
	</div>
</div>

<style>
	.empty-state {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		padding: 3rem 2rem;
		text-align: center;
	}

	.pattern {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		color: var(--text-primary, #e5e7eb);
		pointer-events: none;
	}

	.content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 400px;
	}

	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		margin-bottom: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: var(--text-secondary, #9ca3af);
	}

	.icon :global(svg) {
		width: 32px;
		height: 32px;
	}

	.title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #e5e7eb);
	}

	.description {
		margin: 0;
		color: var(--text-secondary, #9ca3af);
		line-height: 1.6;
	}

	.action {
		margin-top: 1rem;
	}

	@media (max-width: 640px) {
		.empty-state {
			min-height: 250px;
			padding: 2rem 1.5rem;
		}

		.title {
			font-size: 1.125rem;
		}

		.description {
			font-size: 0.875rem;
		}
	}
</style>