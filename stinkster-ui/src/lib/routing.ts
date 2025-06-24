// Application routing configuration for Stinkster Operations Center
export interface Route {
  id: string
  path: string
  label: string
  description: string
  component?: string
  external?: boolean
  target?: '_blank' | '_self'
  icon?: string
  category: 'main' | 'admin' | 'tools'
  port?: number
  status?: 'online' | 'offline' | 'maintenance'
}

export const routes: Route[] = [
  // Main application routes
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    description: 'Main operations dashboard and system overview',
    component: 'Dashboard',
    category: 'main',
    icon: '🎯'
  },
  
  // External application routes (different ports/servers)
  {
    id: 'wigle',
    path: '/wigle/',
    label: 'WigleToTAK',
    description: 'WiFi network detection with TAK integration for tactical mapping',
    external: true,
    target: '_blank',
    category: 'main',
    icon: '📡',
    port: 8000,
    status: 'online'
  },
  
  {
    id: 'kismet',
    path: '/kismet/',
    label: 'Kismet Operations',
    description: 'Advanced WiFi scanning and network analysis dashboard',
    external: true,
    target: '_blank',
    category: 'main',
    icon: '🔍',
    port: 8002,
    status: 'online'
  },
  
  {
    id: 'hackrf',
    path: '/hackrf/',
    label: 'HackRF Spectrum',
    description: 'Software-defined radio spectrum analysis and signal processing',
    external: true,
    target: '_blank',
    category: 'main',
    icon: '📊',
    port: 8092,
    status: 'online'
  },
  
  {
    id: 'operations',
    path: '/operations/',
    label: 'Operations Center',
    description: 'Unified operations dashboard with multi-panel views',
    external: true,
    target: '_blank',
    category: 'main',
    icon: '🎛️',
    port: 8002,
    status: 'online'
  },
  
  // Additional utility routes
  {
    id: 'openwebrx',
    path: '/openwebrx/',
    label: 'OpenWebRX',
    description: 'Web-based SDR receiver interface',
    external: true,
    target: '_blank',
    category: 'tools',
    icon: '📻',
    port: 8073,
    status: 'online'
  },
  
  {
    id: 'native-kismet',
    path: '/kismet-web/',
    label: 'Kismet Web UI',
    description: 'Native Kismet web interface',
    external: true,
    target: '_blank',
    category: 'tools',
    icon: '🌐',
    port: 2501,
    status: 'online'
  }
]

// Route utilities
export function getRouteById(id: string): Route | undefined {
  return routes.find(route => route.id === id)
}

export function getRoutesByCategory(category: Route['category']): Route[] {
  return routes.filter(route => route.category === category)
}

export function getMainRoutes(): Route[] {
  return getRoutesByCategory('main')
}

export function getToolRoutes(): Route[] {
  return getRoutesByCategory('tools')
}

export function getExternalRoutes(): Route[] {
  return routes.filter(route => route.external)
}

export function buildFullUrl(route: Route, baseUrl?: string): string {
  if (route.external && route.port) {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:${route.port}${route.path}`
  }
  
  if (baseUrl) {
    return `${baseUrl}${route.path}`
  }
  
  return route.path
}

// Navigation helpers
export interface NavigationItem {
  id: string
  label: string
  href: string
  target?: string
  icon?: string
  description?: string
  status?: string
}

export function routesToNavigationItems(routeList: Route[]): NavigationItem[] {
  return routeList.map(route => ({
    id: route.id,
    label: route.label,
    href: buildFullUrl(route),
    target: route.target,
    icon: route.icon,
    description: route.description,
    status: route.status
  }))
}

export function getMainNavigation(): NavigationItem[] {
  return routesToNavigationItems(getMainRoutes())
}

export function getToolNavigation(): NavigationItem[] {
  return routesToNavigationItems(getToolRoutes())
}

// Default exports for easy importing
export default {
  routes,
  getRouteById,
  getRoutesByCategory,
  getMainRoutes,
  getToolRoutes,
  getExternalRoutes,
  buildFullUrl,
  routesToNavigationItems,
  getMainNavigation,
  getToolNavigation
}