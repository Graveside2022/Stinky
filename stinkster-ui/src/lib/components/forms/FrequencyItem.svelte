<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { scale, fade } from 'svelte/transition';
	import { X } from 'lucide-svelte';

	export let index: number;
	export let frequency: number;
	export let isActive: boolean = false;
	export let disabled: boolean = false;

	const dispatch = createEventDispatcher();

	function handleRemove() {
		if (!disabled) {
			dispatch('remove', { index });
		}
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value > 0) {
			dispatch('change', { index, value });
		}
	}

	function handleFocus() {
		dispatch('focus', { index });
	}
</script>

<div
	class="frequency-item"
	class:active={isActive}
	class:disabled
	in:scale={{ duration: 200, opacity: 0, start: 0.8 }}
	out:fade={{ duration: 150 }}
>
	<div class="badge">{index + 1}</div>
	
	<div class="input-wrapper">
		<input
			type="number"
			value={frequency}
			on:input={handleChange}
			on:focus={handleFocus}
			step="0.1"
			min="0.1"
			{disabled}
			class="frequency-input"
		/>
		<span class="unit">MHz</span>
	</div>

	<button
		type="button"
		class="remove-button"
		on:click={handleRemove}
		{disabled}
		aria-label="Remove frequency"
	>
		<X size={16} />
	</button>
</div>

<style>
	.frequency-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		backdrop-filter: blur(10px);
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.frequency-item::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.05) 0%,
			transparent 100%
		);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.frequency-item:hover::before {
		opacity: 1;
	}

	.frequency-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.frequency-item.active {
		background: rgba(0, 255, 255, 0.05);
		border-color: rgba(0, 255, 255, 0.3);
		box-shadow: 
			0 0 20px rgba(0, 255, 255, 0.1),
			inset 0 0 20px rgba(0, 255, 255, 0.05);
	}

	.frequency-item.active::after {
		content: '';
		position: absolute;
		inset: -1px;
		background: linear-gradient(45deg, 
			transparent,
			rgba(0, 255, 255, 0.3),
			transparent
		);
		animation: shimmer 2s linear infinite;
		pointer-events: none;
	}

	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	.frequency-item.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.badge {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		flex-shrink: 0;
	}

	.frequency-item.active .badge {
		background: rgba(0, 255, 255, 0.1);
		border-color: rgba(0, 255, 255, 0.3);
		color: #00ffff;
		box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
	}

	.input-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.frequency-input {
		width: 100%;
		padding: 0.5rem 3rem 0.5rem 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.3s ease;
		-webkit-appearance: none;
		-moz-appearance: textfield;
	}

	.frequency-input::-webkit-inner-spin-button,
	.frequency-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.frequency-input:hover {
		background: rgba(0, 0, 0, 0.4);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.frequency-input:focus {
		outline: none;
		background: rgba(0, 0, 0, 0.5);
		border-color: rgba(0, 255, 255, 0.5);
		box-shadow: 
			0 0 0 2px rgba(0, 255, 255, 0.1),
			0 0 20px rgba(0, 255, 255, 0.2);
	}

	.unit {
		position: absolute;
		right: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.75rem;
		font-weight: 500;
		pointer-events: none;
	}

	.remove-button {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 0, 0, 0.1);
		border: 1px solid rgba(255, 0, 0, 0.2);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.3s ease;
		flex-shrink: 0;
	}

	.remove-button:hover {
		background: rgba(255, 0, 0, 0.2);
		border-color: rgba(255, 0, 0, 0.3);
		color: #ffffff;
		transform: scale(1.05);
		box-shadow: 0 0 15px rgba(255, 0, 0, 0.3);
	}

	.remove-button:active {
		transform: scale(0.95);
	}

	.remove-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>