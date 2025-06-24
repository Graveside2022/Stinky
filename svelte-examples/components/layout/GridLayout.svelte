<script>
    import { onMount } from 'svelte';
    import ResizablePanel from './ResizablePanel.svelte';
    
    export let items = [];
    export let cols = 12;
    export let rowHeight = 60;
    export let gap = 10;
    
    let container;
    let containerWidth = 0;
    let gridItems = [...items];
    let isDragging = false;
    let draggedItem = null;
    
    // Calculate cell size based on container width
    $: cellWidth = containerWidth ? (containerWidth - (cols - 1) * gap) / cols : 0;
    
    onMount(() => {
        updateContainerWidth();
        window.addEventListener('resize', updateContainerWidth);
        
        return () => {
            window.removeEventListener('resize', updateContainerWidth);
        };
    });
    
    function updateContainerWidth() {
        if (container) {
            containerWidth = container.offsetWidth;
        }
    }
    
    function getItemStyle(item) {
        return {
            gridColumn: `${item.x + 1} / span ${item.w}`,
            gridRow: `${item.y + 1} / span ${item.h}`,
            minWidth: `${item.minW * cellWidth + (item.minW - 1) * gap}px`,
            minHeight: `${item.minH * rowHeight + (item.minH - 1) * gap}px`
        };
    }
    
    function handleDragStart(event, item) {
        isDragging = true;
        draggedItem = item;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
    }
    
    function handleDragEnd() {
        isDragging = false;
        draggedItem = null;
    }
    
    function handleDragOver(event) {
        if (isDragging) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
    }
    
    function handleDrop(event, targetItem) {
        event.preventDefault();
        
        if (draggedItem && draggedItem.id !== targetItem.id) {
            // Swap positions
            const draggedIndex = gridItems.findIndex(item => item.id === draggedItem.id);
            const targetIndex = gridItems.findIndex(item => item.id === targetItem.id);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const tempX = gridItems[draggedIndex].x;
                const tempY = gridItems[draggedIndex].y;
                
                gridItems[draggedIndex].x = gridItems[targetIndex].x;
                gridItems[draggedIndex].y = gridItems[targetIndex].y;
                gridItems[targetIndex].x = tempX;
                gridItems[targetIndex].y = tempY;
                
                gridItems = [...gridItems];
            }
        }
    }
</script>

<div class="grid-container" bind:this={container}>
    <div 
        class="grid" 
        style="
            grid-template-columns: repeat({cols}, 1fr);
            grid-template-rows: repeat(auto-fill, {rowHeight}px);
            gap: {gap}px;
        "
    >
        {#each gridItems as item (item.id)}
            <div
                class="grid-item"
                class:dragging={isDragging && draggedItem?.id === item.id}
                style={Object.entries(getItemStyle(item))
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('; ')}
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, item)}
                on:dragend={handleDragEnd}
                on:dragover={handleDragOver}
                on:drop={(e) => handleDrop(e, item)}
            >
                <ResizablePanel title={item.title}>
                    <svelte:component this={item.component} />
                </ResizablePanel>
            </div>
        {/each}
    </div>
</div>

<style>
    .grid-container {
        width: 100%;
        padding: 20px;
    }
    
    .grid {
        display: grid;
        width: 100%;
        min-height: 600px;
    }
    
    .grid-item {
        position: relative;
        transition: opacity 0.2s;
    }
    
    .grid-item.dragging {
        opacity: 0.5;
        cursor: move;
    }
    
    .grid-item:not(.dragging) {
        cursor: grab;
    }
    
    .grid-item:active:not(.dragging) {
        cursor: grabbing;
    }
</style>