import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import CesiumGlobe from './CesiumGlobe.svelte'

// Mock Cesium modules
vi.mock('cesium', () => ({
  Viewer: vi.fn(() => ({
    cesiumWidget: {
      screenSpaceEventHandler: {
        removeInputAction: vi.fn()
      }
    },
    dataSources: {
      add: vi.fn()
    },
    entities: {
      collectionChanged: {
        addEventListener: vi.fn()
      }
    },
    camera: {
      setView: vi.fn(),
      flyTo: vi.fn()
    },
    scene: {
      canvas: {},
      pick: vi.fn()
    },
    destroy: vi.fn()
  })),
  Cartesian3: {
    fromDegrees: vi.fn()
  },
  Color: {
    CYAN: { withAlpha: vi.fn() },
    GREEN: { withAlpha: vi.fn() },
    BLUE: { withAlpha: vi.fn() },
    YELLOW: { withAlpha: vi.fn() },
    WHITE: {},
    BLACK: {},
    multiplyByScalar: vi.fn()
  },
  ScreenSpaceEventHandler: vi.fn(() => ({
    setInputAction: vi.fn(),
    destroy: vi.fn()
  })),
  ScreenSpaceEventType: {
    LEFT_CLICK: 'LEFT_CLICK',
    LEFT_DOUBLE_CLICK: 'LEFT_DOUBLE_CLICK'
  },
  CustomDataSource: vi.fn(() => ({
    entities: {
      add: vi.fn(),
      remove: vi.fn(),
      removeAll: vi.fn()
    },
    clustering: {
      enabled: false,
      pixelRange: 50,
      minimumClusterSize: 2,
      clusterEvent: {
        addEventListener: vi.fn()
      }
    }
  })),
  PinBuilder: vi.fn(() => ({
    fromColor: vi.fn(() => ({
      toDataURL: vi.fn(() => 'data:image/png;base64,')
    })),
    fromText: vi.fn(() => ({
      toDataURL: vi.fn(() => 'data:image/png;base64,')
    }))
  })),
  BillboardGraphics: vi.fn(),
  LabelGraphics: vi.fn(),
  PointGraphics: vi.fn(),
  VerticalOrigin: {
    BOTTOM: 'BOTTOM',
    TOP: 'TOP'
  },
  ConstantProperty: vi.fn(),
  defined: vi.fn(),
  Ion: {
    defaultAccessToken: null
  },
  Math: {
    toRadians: vi.fn(deg => deg * Math.PI / 180)
  }
}))

describe('CesiumGlobe', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(CesiumGlobe, {
      props: {
        height: '500px',
        showStats: true,
        enableClustering: true
      }
    })

    expect(container.querySelector('.cesium-container')).toBeTruthy()
    expect(container.querySelector('.stats-overlay')).toBeTruthy()
    expect(container.querySelector('.camera-controls')).toBeTruthy()
  })

  it('displays camera preset buttons', () => {
    const { container } = render(CesiumGlobe, {
      props: {
        height: '500px'
      }
    })

    const buttons = container.querySelectorAll('.preset-btn')
    expect(buttons).toHaveLength(4)
    expect(buttons[0].textContent).toBe('Global')
    expect(buttons[1].textContent).toBe('N. America')
    expect(buttons[2].textContent).toBe('Europe')
    expect(buttons[3].textContent).toBe('Local')
  })

  it('hides stats overlay when showStats is false', () => {
    const { container } = render(CesiumGlobe, {
      props: {
        height: '500px',
        showStats: false
      }
    })

    expect(container.querySelector('.stats-overlay')).toBeFalsy()
  })

  it('applies custom height style', () => {
    const { container } = render(CesiumGlobe, {
      props: {
        height: '600px'
      }
    })

    const cesiumContainer = container.querySelector('.cesium-container') as HTMLElement
    expect(cesiumContainer.style.height).toBe('600px')
  })
})