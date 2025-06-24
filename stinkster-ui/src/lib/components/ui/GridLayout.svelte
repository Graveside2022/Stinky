<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  
  interface GridLayoutProps extends HTMLAttributes<HTMLDivElement> {
    cols?: 1 | 2 | 3 | 4 | 6 | 12;
    gap?: 'none' | 'sm' | 'md' | 'lg';
    responsive?: boolean;
    class?: string;
  }
  
  let {
    cols = 1,
    gap = 'md',
    responsive = true,
    class: className = '',
    children,
    ...restProps
  }: GridLayoutProps = $props();
  
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12'
  };
  
  const responsiveColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-3 md:grid-cols-6 lg:grid-cols-12'
  };
  
  const gridClasses = $derived(`grid ${gapClasses[gap]} ${responsive ? responsiveColsClasses[cols] : colsClasses[cols]} ${className}`);
</script>

<div
  class={gridClasses}
  {...restProps}
>
  {@render children?.()}
</div>