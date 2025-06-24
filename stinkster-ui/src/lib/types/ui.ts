// UI Types for Interface Components, Themes, and User Interactions
// Types for UI components, themes, and user interactions

export type Theme = 'default' | 'dark' | 'light' | 'cyber' | 'military';

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  glow: {
    primary: string;
    success: string;
    error: string;
    warning: string;
  };
  animation: {
    duration: string;
    easing: string;
  };
}

export interface UISettings {
  theme: Theme;
  layout: 'grid' | 'list' | 'compact';
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  showNotifications: boolean;
  soundEnabled: boolean;
  animations: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
  fullscreen: boolean;
}

export interface ComponentState {
  id: string;
  visible: boolean;
  expanded: boolean;
  loading: boolean;
  error: string | null;
  data: any;
  lastUpdate: string;
  refreshing: boolean;
}

export interface GridItem {
  id: string;
  title: string;
  component: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  visible: boolean;
  resizable: boolean;
  draggable: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  items: GridItem[];
  created: string;
  modified: string;
  isDefault: boolean;
  responsive: boolean;
  breakpoints?: Record<string, GridItem[]>;
}

export interface ControlButton {
  id: string;
  label: string;
  icon?: string;
  action: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
  loading: boolean;
  tooltip?: string;
  confirmation?: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
  };
}

export interface StatusIndicator {
  id: string;
  label: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown' | 'maintenance';
  value?: string | number;
  unit?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  color?: string;
  blink?: boolean;
  pulse?: boolean;
  lastUpdate?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  children?: NavigationItem[];
  badge?: number;
  external?: boolean;
  disabled?: boolean;
  visible?: boolean;
  permission?: string;
}

export interface Modal {
  id: string;
  title: string;
  content: string | any;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm' | 'custom';
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  closable: boolean;
  backdrop: boolean;
  actions: ModalAction[];
  data?: Record<string, any>;
}

export interface ModalAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  action: string;
  closeModal?: boolean;
  disabled?: boolean;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration: number; // milliseconds, 0 for persistent
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  icon?: string;
  actions?: ToastAction[];
  dismissible: boolean;
  progress?: boolean;
}

export interface ToastAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary';
}

export interface ContextMenu {
  id: string;
  x: number;
  y: number;
  items: ContextMenuItem[];
  target?: string;
  data?: Record<string, any>;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: string;
  disabled?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  shortcut?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'gauge';
  data: ChartData;
  options: ChartOptions;
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins?: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
      mode: string;
    };
  };
  scales?: {
    x: ChartScale;
    y: ChartScale;
  };
}

export interface ChartScale {
  display: boolean;
  type: 'linear' | 'logarithmic' | 'category' | 'time';
  min?: number;
  max?: number;
  title: {
    display: boolean;
    text: string;
  };
  grid: {
    display: boolean;
    color: string;
  };
}

export interface TableColumn {
  id: string;
  label: string;
  field: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'action' | 'custom';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  align: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  render?: (value: any, row: any) => string;
  className?: string;
  headerClassName?: string;
}

export interface TableConfig {
  columns: TableColumn[];
  data: any[];
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  pagination: {
    enabled: boolean;
    pageSize: number;
    currentPage: number;
    totalItems: number;
    showInfo: boolean;
    showSizeSelector: boolean;
    pageSizes: number[];
  };
  selection: {
    enabled: boolean;
    multiple: boolean;
    selected: string[];
  };
  filtering: {
    enabled: boolean;
    globalFilter: string;
    columnFilters: Record<string, any>;
  };
  actions: {
    enabled: boolean;
    items: TableAction[];
  };
  striped: boolean;
  bordered: boolean;
  hover: boolean;
  compact: boolean;
  responsive: boolean;
  loading: boolean;
  error: string | null;
}

export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  action: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: (row: any) => boolean;
  visible?: (row: any) => boolean;
  tooltip?: string;
}

export interface UserPreferences {
  theme: Theme;
  layout: string;
  dashboard: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    levels: ('info' | 'warning' | 'error' | 'critical')[];
  };
  display: {
    animations: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  data: {
    autoRefresh: boolean;
    refreshInterval: number;
    historicalData: boolean;
    dataRetention: number; // days
  };
  shortcuts: Record<string, string>;
  customCss?: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  touchSupported: boolean;
}