<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  
  interface ResizablePanelProps extends HTMLAttributes<HTMLDivElement> {
    direction?: 'horizontal' | 'vertical';
    minSize?: number;
    maxSize?: number;
    defaultSize?: number;
    class?: string;
  }
  
  let {
    direction = 'horizontal',
    minSize = 100,
    maxSize = 800,
    defaultSize = 300,
    class: className = '',
    children,
    ...restProps
  }: ResizablePanelProps = $props();
  
  let containerEl: HTMLDivElement;
  let size = $state(defaultSize);
  let isResizing = $state(false);
  let startPos = $state(0);
  let startSize = $state(0);
  
  function handleMouseDown(e: MouseEvent) {
    isResizing = true;
    startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize = size;
    
    // Prevent text selection while resizing
    e.preventDefault();
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const diff = currentPos - startPos;
    const newSize = Math.min(maxSize, Math.max(minSize, startSize + diff));
    
    size = newSize;
  }
  
  function handleMouseUp() {
    isResizing = false;
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    const step = 10;
    let newSize = size;
    
    if ((direction === 'horizontal' && e.key === 'ArrowLeft') || 
        (direction === 'vertical' && e.key === 'ArrowUp')) {
      newSize = Math.max(minSize, size - step);
    } else if ((direction === 'horizontal' && e.key === 'ArrowRight') || 
               (direction === 'vertical' && e.key === 'ArrowDown')) {
      newSize = Math.min(maxSize, size + step);
    }
    
    if (newSize !== size) {
      size = newSize;
      e.preventDefault();
    }
  }
  
  $effect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  });
  
  const panelStyle = $derived(direction === 'horizontal' 
    ? `width: ${size}px` 
    : `height: ${size}px`);
    
  const handleClasses = $derived(direction === 'horizontal'
    ? 'absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary-500 transition-colors'
    : 'absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-primary-500 transition-colors');
</script>

<div
  bind:this={containerEl}
  class="relative bg-surface-100 dark:bg-surface-800 {className}"
  style={panelStyle}
  {...restProps}
>
  <div class="w-full h-full overflow-auto">
    {@render children?.()}
  </div>
  
  <div
    class={handleClasses}
    class:bg-primary-500={isResizing}
    onmousedown={handleMouseDown}
    onkeydown={handleKeyDown}
    role="slider"
    aria-orientation={direction}
    aria-valuenow={size}
    aria-valuemin={minSize}
    aria-valuemax={maxSize}
    aria-label="Resize panel"
    tabindex="0"
  ></div>
</div>