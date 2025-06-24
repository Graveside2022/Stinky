<script>
	import GeometricBackground from '$lib/components/effects/GeometricBackground.svelte';
	import AnimatedBlobs from '$lib/components/effects/AnimatedBlobs.svelte';
	import NeonGlow from '$lib/components/effects/NeonGlow.svelte';
	import ScanLine from '$lib/components/effects/ScanLine.svelte';
	
	let showBlobs = true;
	let blobIntensity = 'medium';
	let showScanLines = true;
</script>

<div class="effects-demo">
	<!-- Background effects -->
	<GeometricBackground />
	
	{#if showBlobs}
		<AnimatedBlobs intensity={blobIntensity} />
	{/if}
	
	{#if showScanLines}
		<ScanLine position="top" speed={4} color="rgba(100, 255, 218, 0.6)" />
		<ScanLine position="bottom" speed={6} delay={2} color="rgba(138, 43, 226, 0.6)" />
	{/if}
	
	<!-- Content -->
	<div class="content">
		<NeonGlow as="h1" color="#64ffda" intensity="high" pulse>
			Effects Demo
		</NeonGlow>
		
		<div class="controls">
			<NeonGlow as="div" color="#8a2be2" intensity="low" class="control-panel">
				<h2>Effect Controls</h2>
				
				<label>
					<input type="checkbox" bind:checked={showBlobs} />
					Show Animated Blobs
				</label>
				
				<label>
					Blob Intensity:
					<select bind:value={blobIntensity}>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</label>
				
				<label>
					<input type="checkbox" bind:checked={showScanLines} />
					Show Scan Lines
				</label>
			</NeonGlow>
		</div>
		
		<div class="demo-grid">
			<NeonGlow as="button" color="#64ffda" intensity="medium">
				Neon Button
			</NeonGlow>
			
			<NeonGlow as="button" color="#ff1493" intensity="high" pulse>
				Pulsing Button
			</NeonGlow>
			
			<NeonGlow as="a" href="#" color="#8a2be2" intensity="medium">
				Neon Link
			</NeonGlow>
		</div>
		
		<div class="input-demo">
			<NeonGlow as="input" type="text" placeholder="Neon Input" color="#64ffda" />
			<NeonGlow as="textarea" placeholder="Neon Textarea" color="#8a2be2" rows="3" />
		</div>
		
		<div class="scan-demo">
			<div class="scan-box">
				<ScanLine 
					position="top" 
					direction="vertical" 
					speed={2} 
					color="rgba(255, 20, 147, 0.8)" 
					height={3}
				/>
				<p>Vertical Scan Demo</p>
			</div>
		</div>
	</div>
</div>

<style>
	.effects-demo {
		position: relative;
		min-height: 100vh;
		overflow: hidden;
		color: white;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
	
	.content {
		position: relative;
		z-index: 100;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 3rem;
		align-items: center;
	}
	
	:global(.effects-demo h1) {
		font-size: 4rem;
		margin: 0;
		text-align: center;
		font-weight: 300;
		letter-spacing: 0.1em;
	}
	
	.controls {
		width: 100%;
		max-width: 400px;
	}
	
	:global(.control-panel) {
		padding: 2rem;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.control-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 400;
	}
	
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
	}
	
	input[type="checkbox"] {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}
	
	select {
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: 1px solid rgba(100, 255, 218, 0.3);
		padding: 0.5rem;
		border-radius: 4px;
		cursor: pointer;
	}
	
	.demo-grid {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	
	:global(.demo-grid button) {
		font-size: 1rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.5);
	}
	
	:global(.demo-grid a) {
		font-size: 1.2rem;
		padding: 0.5rem;
	}
	
	.input-demo {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 400px;
	}
	
	:global(.input-demo input),
	:global(.input-demo textarea) {
		width: 100%;
		font-size: 1rem;
		border-radius: 4px;
		font-family: inherit;
		color: white;
	}
	
	.scan-demo {
		width: 100%;
		max-width: 600px;
	}
	
	.scan-box {
		position: relative;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(100, 255, 218, 0.2);
		border-radius: 10px;
		padding: 4rem 2rem;
		text-align: center;
		overflow: hidden;
	}
	
	.scan-box p {
		margin: 0;
		font-size: 1.2rem;
		opacity: 0.8;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		:global(.effects-demo h1) {
			font-size: 2.5rem;
		}
		
		.content {
			padding: 1rem;
			gap: 2rem;
		}
		
		.demo-grid {
			flex-direction: column;
			align-items: center;
		}
	}
</style>