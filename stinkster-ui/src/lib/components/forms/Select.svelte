<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let value: string | number = '';
	export let options: Array<{ value: string | number; label: string }> = [];
	export let placeholder: string = 'Select an option';
	export let disabled: boolean = false;
	export let id: string = '';
	export let name: string = '';

	const dispatch = createEventDispatcher();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		dispatch('change', target.value);
	}
</script>

<div class="select-wrapper" class:disabled>
	<select
		{id}
		{name}
		{value}
		{disabled}
		on:change={handleChange}
		on:blur
		on:focus
		class="select"
	>
		{#if placeholder}
			<option value="" disabled selected hidden>{placeholder}</option>
		{/if}
		{#each options as option}
			<option value={option.value}>
				{option.label}
			</option>
		{/each}
	</select>
	
	<div class="select-icon" aria-hidden="true">
		<ChevronDown size={16} />
	</div>
</div>

<style>
	.select-wrapper {
		position: relative;
		display: inline-block;
		width: 100%;
	}

	.select-wrapper.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.select {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		backdrop-filter: blur(10px);
		position: relative;
	}

	.select::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.05) 0%,
			transparent 100%
		);
		border-radius: inherit;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.select:hover::before {
		opacity: 1;
	}

	.select:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.select:focus {
		outline: none;
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(0, 255, 255, 0.5);
		box-shadow: 
			0 0 0 2px rgba(0, 255, 255, 0.1),
			0 0 20px rgba(0, 255, 255, 0.2);
	}

	.select option {
		background: #1a1a1a;
		color: #ffffff;
		padding: 0.5rem;
	}

	.select option:hover {
		background: #2a2a2a;
	}

	.select option:checked {
		background: rgba(0, 255, 255, 0.2);
	}

	.select-icon {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: rgba(255, 255, 255, 0.5);
		pointer-events: none;
		transition: all 0.3s ease;
	}

	.select:hover ~ .select-icon {
		color: rgba(255, 255, 255, 0.7);
	}

	.select:focus ~ .select-icon {
		color: #00ffff;
		filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5));
	}

	/* Firefox specific styling */
	@-moz-document url-prefix() {
		.select {
			padding-right: 2.5rem;
		}
	}

	/* Remove default IE arrow */
	.select::-ms-expand {
		display: none;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.select {
			padding: 0.625rem 2.25rem 0.625rem 0.875rem;
			font-size: 0.8125rem;
		}

		.select-icon {
			right: 0.875rem;
		}
	}
</style>