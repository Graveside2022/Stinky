<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	type AlertVariant = 'info' | 'warning' | 'error' | 'success';

	export let variant: AlertVariant = 'info';
	export let title = '';
	export let message = '';
	export let dismissible = true;
	export let autoDismiss = false;
	export let autoDismissDelay = 5000;

	const dispatch = createEventDispatcher();

	let visible = true;
	let timeoutId: ReturnType<typeof setTimeout>;

	const icons = {
		info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10ZM11 6C11 6.55228 10.5523 7 10 7C9.44772 7 9 6.55228 9 6C9 5.44772 9.44772 5 10 5C10.5523 5 11 5.44772 11 6ZM10 9C10.5523 9 11 9.44772 11 10V14C11 14.5523 10.5523 15 10 15C9.44772 15 9 14.5523 9 14V10C9 9.44772 9.44772 9 10 9Z" fill="currentColor"/>
		</svg>`,
		warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M8.2572 3.19239C9.02839 1.74095 10.9717 1.74095 11.7429 3.19239L18.2838 15.121C19.0064 16.482 18.0593 18.1429 16.541 18.1429H3.45906C1.94078 18.1429 0.993638 16.482 1.71631 15.121L8.2572 3.19239ZM10 8C10.5523 8 11 8.44772 11 9V11C11 11.5523 10.5523 12 10 12C9.44772 12 9 11.5523 9 11V9C9 8.44772 9.44772 8 10 8ZM10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15Z" fill="currentColor"/>
		</svg>`,
		error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM8.70711 7.29289C8.31658 6.90237 7.68342 6.90237 7.29289 7.29289C6.90237 7.68342 6.90237 8.31658 7.29289 8.70711L8.58579 10L7.29289 11.2929C6.90237 11.6834 6.90237 12.3166 7.29289 12.7071C7.68342 13.0976 8.31658 13.0976 8.70711 12.7071L10 11.4142L11.2929 12.7071C11.6834 13.0976 12.3166 13.0976 12.7071 12.7071C13.0976 12.3166 13.0976 11.6834 12.7071 11.2929L11.4142 10L12.7071 8.70711C13.0976 8.31658 13.0976 7.68342 12.7071 7.29289C12.3166 6.90237 11.6834 6.90237 11.2929 7.29289L10 8.58579L8.70711 7.29289Z" fill="currentColor"/>
		</svg>`,
		success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289C13.3166 6.90237 12.6834 6.90237 12.2929 7.29289L9 10.5858L7.70711 9.29289C7.31658 8.90237 6.68342 8.90237 6.29289 9.29289C5.90237 9.68342 5.90237 10.3166 6.29289 10.7071L8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.7071 8.70711Z" fill="currentColor"/>
		</svg>`
	};

	const variantStyles = {
		info: 'alert-info',
		warning: 'alert-warning',
		error: 'alert-error',
		success: 'alert-success'
	};

	function handleDismiss() {
		visible = false;
		dispatch('dismiss');
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && dismissible) {
			handleDismiss();
		}
	}

	onMount(() => {
		if (autoDismiss) {
			timeoutId = setTimeout(handleDismiss, autoDismissDelay);
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});
</script>

{#if visible}
	<div
		class="alert {variantStyles[variant]}"
		role="alert"
		aria-live={variant === 'error' ? 'assertive' : 'polite'}
		transition:fly={{ y: -20, duration: 300 }}
		on:keydown={handleKeydown}
	>
		<div class="icon" aria-hidden="true">
			{@html icons[variant]}
		</div>

		<div class="content">
			{#if title}
				<h4 class="title">{title}</h4>
			{/if}
			{#if message}
				<p class="message">{message}</p>
			{/if}
			{#if $$slots.default}
				<div class="custom-content">
					<slot />
				</div>
			{/if}
		</div>

		{#if dismissible}
			<button
				class="dismiss"
				on:click={handleDismiss}
				aria-label="Dismiss alert"
				type="button"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 20 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M4.29289 4.29289C4.68342 3.90237 5.31658 3.90237 5.70711 4.29289L10 8.58579L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L11.4142 10L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L10 11.4142L5.70711 15.7071C5.31658 16.0976 4.68342 16.0976 4.29289 15.7071C3.90237 15.3166 3.90237 14.6834 4.29289 14.2929L8.58579 10L4.29289 5.70711C3.90237 5.31658 3.90237 4.68342 4.29289 4.29289Z"
						fill="currentColor"
					/>
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 1rem;
	}

	.icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-top: 2px;
	}

	.content {
		flex: 1;
		min-width: 0;
	}

	.title {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #e5e7eb);
	}

	.message {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #9ca3af);
		line-height: 1.5;
	}

	.custom-content {
		margin-top: 0.5rem;
	}

	.dismiss {
		flex-shrink: 0;
		padding: 0.25rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.dismiss:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #e5e7eb);
	}

	.dismiss:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
	}

	/* Variant styles */
	.alert-info {
		border-color: rgba(59, 130, 246, 0.3);
	}

	.alert-info .icon {
		color: #3b82f6;
	}

	.alert-warning {
		border-color: rgba(245, 158, 11, 0.3);
	}

	.alert-warning .icon {
		color: #f59e0b;
	}

	.alert-error {
		border-color: rgba(239, 68, 68, 0.3);
	}

	.alert-error .icon {
		color: #ef4444;
	}

	.alert-success {
		border-color: rgba(34, 197, 94, 0.3);
	}

	.alert-success .icon {
		color: #22c55e;
	}

	@media (max-width: 640px) {
		.alert {
			padding: 0.75rem;
			gap: 0.75rem;
		}

		.title {
			font-size: 0.875rem;
		}

		.message {
			font-size: 0.8125rem;
		}
	}
</style>