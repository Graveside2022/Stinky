import { writable, derived } from 'svelte/store';

// UI state interfaces
export interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeTab: string;
  activePanel: string | null;
  loading: boolean;
  fullscreen: boolean;
  mobileView: boolean;
  notifications: {
    panelOpen: boolean;
    badgeVisible: boolean;
    count: number;
  };
  modals: {
    active: string | null;
    stack: string[];
  };
  panels: {
    [key: string]: {
      visible: boolean;
      collapsed: boolean;
      position: { x: number; y: number };
      size: { width: number; height: number };
    };
  };
  filters: {
    [key: string]: boolean;
  };
  view: {
    mode: 'grid' | 'list' | 'map' | 'chart';
    density: 'compact' | 'comfortable' | 'spacious';
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  theme: {
    current: 'dark' | 'light' | 'auto';
    accent: string;
  };
}

// Initial UI state
const initialUIState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeTab: 'dashboard',
  activePanel: null,
  loading: false,
  fullscreen: false,
  mobileView: false,
  notifications: {
    panelOpen: false,
    badgeVisible: true,
    count: 0
  },
  modals: {
    active: null,
    stack: []
  },
  panels: {},
  filters: {},
  view: {
    mode: 'grid',
    density: 'comfortable',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  },
  theme: {
    current: 'dark',
    accent: '#00d2ff'
  }
};

// Load UI state from localStorage
function loadUIState(): UIState {
  if (typeof window === 'undefined') return initialUIState;
  
  try {
    const stored = localStorage.getItem('uiState');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...initialUIState,
        ...parsed,
        // Reset temporary states
        loading: false,
        modals: { active: null, stack: [] },
        // Ensure theme properties exist
        theme: {
          current: parsed.theme?.current || 'dark',
          accent: parsed.theme?.accent || '#00d2ff'
        },
        // Ensure notification count exists
        notifications: {
          ...parsed.notifications,
          count: parsed.notifications?.count || 0
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load UI state from localStorage:', error);
  }
  
  return initialUIState;
}

// Main UI state store
export const uiState = writable<UIState>(loadUIState());

// Subscribe to changes and save to localStorage
uiState.subscribe((state) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Don't save temporary states but preserve theme and notification settings
    const stateToSave = {
      ...state,
      loading: false,
      modals: { active: null, stack: [] }
    };
    localStorage.setItem('uiState', JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save UI state to localStorage:', error);
  }
});

// Derived stores for easy access
export const sidebarOpen = derived(uiState, ($state) => $state.sidebarOpen);
export const sidebarCollapsed = derived(uiState, ($state) => $state.sidebarCollapsed);
export const activeTab = derived(uiState, ($state) => $state.activeTab);
export const activePanel = derived(uiState, ($state) => $state.activePanel);
export const loading = derived(uiState, ($state) => $state.loading);
export const fullscreen = derived(uiState, ($state) => $state.fullscreen);
export const mobileView = derived(uiState, ($state) => $state.mobileView);
export const notificationsPanelOpen = derived(uiState, ($state) => $state.notifications.panelOpen);
export const notificationCount = derived(uiState, ($state) => $state.notifications.count);
export const activeModal = derived(uiState, ($state) => $state.modals.active);
export const modalStack = derived(uiState, ($state) => $state.modals.stack);
export const viewMode = derived(uiState, ($state) => $state.view.mode);
export const viewDensity = derived(uiState, ($state) => $state.view.density);
export const sortBy = derived(uiState, ($state) => $state.view.sortBy);
export const sortOrder = derived(uiState, ($state) => $state.view.sortOrder);
export const currentTheme = derived(uiState, ($state) => $state.theme.current);
export const accentColor = derived(uiState, ($state) => $state.theme.accent);

// Sidebar controls
export function toggleSidebar() {
  uiState.update(state => ({
    ...state,
    sidebarOpen: !state.sidebarOpen
  }));
}

export function openSidebar() {
  uiState.update(state => ({
    ...state,
    sidebarOpen: true
  }));
}

export function closeSidebar() {
  uiState.update(state => ({
    ...state,
    sidebarOpen: false
  }));
}

export function toggleSidebarCollapse() {
  uiState.update(state => ({
    ...state,
    sidebarCollapsed: !state.sidebarCollapsed
  }));
}

export function setSidebarCollapsed(collapsed: boolean) {
  uiState.update(state => ({
    ...state,
    sidebarCollapsed: collapsed
  }));
}

// Tab management
export function setActiveTab(tab: string) {
  uiState.update(state => ({
    ...state,
    activeTab: tab
  }));
}

// Panel management
export function setActivePanel(panel: string | null) {
  uiState.update(state => ({
    ...state,
    activePanel: panel
  }));
}

export function togglePanel(panelId: string) {
  uiState.update(state => ({
    ...state,
    panels: {
      ...state.panels,
      [panelId]: {
        ...state.panels[panelId],
        visible: !state.panels[panelId]?.visible
      }
    }
  }));
}

export function showPanel(panelId: string) {
  uiState.update(state => ({
    ...state,
    panels: {
      ...state.panels,
      [panelId]: {
        ...state.panels[panelId],
        visible: true
      }
    }
  }));
}

export function hidePanel(panelId: string) {
  uiState.update(state => ({
    ...state,
    panels: {
      ...state.panels,
      [panelId]: {
        ...state.panels[panelId],
        visible: false
      }
    }
  }));
}

export function updatePanelPosition(panelId: string, position: { x: number; y: number }) {
  uiState.update(state => ({
    ...state,
    panels: {
      ...state.panels,
      [panelId]: {
        ...state.panels[panelId],
        position
      }
    }
  }));
}

export function updatePanelSize(panelId: string, size: { width: number; height: number }) {
  uiState.update(state => ({
    ...state,
    panels: {
      ...state.panels,
      [panelId]: {
        ...state.panels[panelId],
        size
      }
    }
  }));
}

// Loading state
export function setLoading(isLoading: boolean) {
  uiState.update(state => ({
    ...state,
    loading: isLoading
  }));
}

export function startLoading() {
  setLoading(true);
}

export function stopLoading() {
  setLoading(false);
}

// Fullscreen management
export function toggleFullscreen() {
  uiState.update(state => ({
    ...state,
    fullscreen: !state.fullscreen
  }));
}

export function enterFullscreen() {
  uiState.update(state => ({
    ...state,
    fullscreen: true
  }));
}

export function exitFullscreen() {
  uiState.update(state => ({
    ...state,
    fullscreen: false
  }));
}

// Mobile view detection
export function setMobileView(isMobile: boolean) {
  uiState.update(state => ({
    ...state,
    mobileView: isMobile
  }));
}

// Notifications panel
export function toggleNotificationsPanel() {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      panelOpen: !state.notifications.panelOpen
    }
  }));
}

export function openNotificationsPanel() {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      panelOpen: true
    }
  }));
}

export function closeNotificationsPanel() {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      panelOpen: false
    }
  }));
}

// Modal management
export function openModal(modalId: string) {
  uiState.update(state => ({
    ...state,
    modals: {
      active: modalId,
      stack: state.modals.active ? [...state.modals.stack, state.modals.active] : state.modals.stack
    }
  }));
}

export function closeModal() {
  uiState.update(state => {
    const previousModal = state.modals.stack.pop();
    return {
      ...state,
      modals: {
        active: previousModal || null,
        stack: state.modals.stack
      }
    };
  });
}

export function closeAllModals() {
  uiState.update(state => ({
    ...state,
    modals: {
      active: null,
      stack: []
    }
  }));
}

// Filter management
export function toggleFilter(filterId: string) {
  uiState.update(state => ({
    ...state,
    filters: {
      ...state.filters,
      [filterId]: !state.filters[filterId]
    }
  }));
}

export function setFilter(filterId: string, enabled: boolean) {
  uiState.update(state => ({
    ...state,
    filters: {
      ...state.filters,
      [filterId]: enabled
    }
  }));
}

export function clearAllFilters() {
  uiState.update(state => ({
    ...state,
    filters: {}
  }));
}

// View controls
export function setViewMode(mode: UIState['view']['mode']) {
  uiState.update(state => ({
    ...state,
    view: {
      ...state.view,
      mode
    }
  }));
}

export function setViewDensity(density: UIState['view']['density']) {
  uiState.update(state => ({
    ...state,
    view: {
      ...state.view,
      density
    }
  }));
}

export function setSorting(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') {
  uiState.update(state => ({
    ...state,
    view: {
      ...state.view,
      sortBy,
      sortOrder
    }
  }));
}

export function toggleSortOrder() {
  uiState.update(state => ({
    ...state,
    view: {
      ...state.view,
      sortOrder: state.view.sortOrder === 'asc' ? 'desc' : 'asc'
    }
  }));
}

// Utility functions
export function resetUIState() {
  uiState.set(initialUIState);
}

export function updateUIState(updates: Partial<UIState>) {
  uiState.update(state => ({
    ...state,
    ...updates
  }));
}

// Responsive breakpoint detection
export function initializeResponsiveDetection() {
  if (typeof window === 'undefined') return;
  
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  const updateMobileView = (e: MediaQueryListEvent | MediaQueryList) => {
    setMobileView(e.matches);
    if (e.matches) {
      // Auto-collapse sidebar on mobile
      setSidebarCollapsed(true);
    }
  };
  
  // Initial check
  updateMobileView(mediaQuery);
  
  // Listen for changes
  mediaQuery.addEventListener('change', updateMobileView);
  
  return () => {
    mediaQuery.removeEventListener('change', updateMobileView);
  };
}

// Theme management
export function setTheme(theme: UIState['theme']['current']) {
  uiState.update(state => ({
    ...state,
    theme: {
      ...state.theme,
      current: theme
    }
  }));
}

export function setAccentColor(color: string) {
  uiState.update(state => ({
    ...state,
    theme: {
      ...state.theme,
      accent: color
    }
  }));
}

export function toggleTheme() {
  uiState.update(state => ({
    ...state,
    theme: {
      ...state.theme,
      current: state.theme.current === 'dark' ? 'light' : 'dark'
    }
  }));
}

// Notification count management
export function setNotificationCount(count: number) {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      count: Math.max(0, count)
    }
  }));
}

export function incrementNotificationCount() {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      count: state.notifications.count + 1
    }
  }));
}

export function decrementNotificationCount() {
  uiState.update(state => ({
    ...state,
    notifications: {
      ...state.notifications,
      count: Math.max(0, state.notifications.count - 1)
    }
  }));
}

export function clearNotificationCount() {
  setNotificationCount(0);
}

// Initialize responsive detection if in browser
if (typeof window !== 'undefined') {
  initializeResponsiveDetection();
}