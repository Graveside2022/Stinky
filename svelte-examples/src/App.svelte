<script>
    import { onMount } from 'svelte';
    import Router from './Router.svelte';
    import ThemeProvider from '$lib/components/theme/ThemeProvider.svelte';
    import Navigation from '$lib/components/layout/Navigation.svelte';
    
    let appReady = false;
    
    onMount(() => {
        // Initialize app
        console.log('Stinkster Svelte Frontend initialized');
        appReady = true;
    });
</script>

<ThemeProvider>
    <div class="app">
        {#if appReady}
            <Navigation />
            <main class="main-content">
                <Router />
            </main>
        {:else}
            <div class="app-loading">
                <div class="loader"></div>
                <p>Initializing Stinkster...</p>
            </div>
        {/if}
    </div>
</ThemeProvider>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    
    .app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }
    
    .main-content {
        flex: 1;
        position: relative;
    }
    
    .app-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
    }
    
    .loader {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(0, 210, 255, 0.1);
        border-top-color: #00d2ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>