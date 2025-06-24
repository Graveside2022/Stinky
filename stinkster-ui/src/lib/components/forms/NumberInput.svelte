<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Minus, Plus } from 'lucide-svelte';

	export let value: number = 0;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let step: number = 1;
	export let unit: string = '';
	export let placeholder: string = '';
	export let disabled: boolean = false;
	export let showControls: boolean = true;
	export let id: string = '';
	export let name: string = '';

	const dispatch = createEventDispatcher();

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = parseFloat(target.value);
		
		if (!isNaN(newValue)) {
			value = clampValue(newValue);
			dispatch('change', value);
		}
	}

	function increment() {
		if (!disabled) {
			value = clampValue(value + step);
			dispatch('change', value);
		}
	}

	function decrement() {
		if (!disabled) {
			value = clampValue(value - step);
			dispatch('change', value);
		}
	}

	function clampValue(val: number): number {
		if (min !== undefined && val < min) return min;
		if (max !== undefined && val > max) return max;
		return val;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			increment();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			decrement();
		}
	}

	$: canDecrement = min === undefined || value > min;
	$: canIncrement = max === undefined || value < max;
</script>

<div class="number-input-wrapper" class:disabled>
	<div class="input-container">
		<input
			type="number"
			{id}
			{name}
			{value}
			{min}
			{max}
			{step}
			{placeholder}
			{disabled}
			on:input={handleInput}
			on:keydown={handleKeyDown}
			on:blur
			on:focus
			class="number-input"
			class:with-unit={unit}
		/>
		
		{#if unit}
			<span class="unit">{unit}</span>
		{/if}
	</div>

	{#if showControls}
		<div class="controls">
			<button
				type="button"
				class="control-button decrement"
				on:click={decrement}
				disabled={disabled || !canDecrement}
				aria-label="Decrease value"
			>
				<Minus size={14} />
			</button>
			<div class="divider" />
			<button
				type="button"
				class="control-button increment"
				on:click={increment}
				disabled={disabled || !canIncrement}
				aria-label="Increase value"
			>
				<Plus size={14} />
			</button>
		</div>
	{/if}
</div>

<style>
	.number-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	.number-input-wrapper.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.input-container {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.number-input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.3s ease;
		-webkit-appearance: none;
		-moz-appearance: textfield;
		backdrop-filter: blur(10px);
	}

	.number-input.with-unit {
		padding-right: 3rem;
	}

	.number-input::-webkit-inner-spin-button,
	.number-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.number-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.number-input:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.number-input:focus {
		outline: none;
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(0, 255, 255, 0.5);
		box-shadow: 
			0 0 0 2px rgba(0, 255, 255, 0.1),
			0 0 20px rgba(0, 255, 255, 0.2);
	}

	.unit {
		position: absolute;
		right: 1rem;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.75rem;
		font-weight: 500;
		pointer-events: none;
	}

	.controls {
		display: flex;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		overflow: hidden;
		backdrop-filter: blur(10px);
	}

	.control-button {
		padding: 0.75rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	.control-button::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at center,
			rgba(0, 255, 255, 0.2),
			transparent
		);
		opacity: 0;
		transform: scale(0);
		transition: all 0.3s ease;
	}

	.control-button:hover:not(:disabled) {
		color: #00ffff;
		background: rgba(0, 255, 255, 0.05);
	}

	.control-button:hover:not(:disabled)::before {
		opacity: 1;
		transform: scale(1);
	}

	.control-button:active:not(:disabled) {
		transform: scale(0.95);
		background: rgba(0, 255, 255, 0.1);
	}

	.control-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		color: rgba(255, 255, 255, 0.3);
	}

	.divider {
		width: 1px;
		background: rgba(255, 255, 255, 0.1);
		align-self: stretch;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.number-input {
			padding: 0.625rem 0.875rem;
			font-size: 0.8125rem;
		}

		.number-input.with-unit {
			padding-right: 2.5rem;
		}

		.unit {
			right: 0.875rem;
		}

		.control-button {
			padding: 0.625rem;
		}
	}
</style>