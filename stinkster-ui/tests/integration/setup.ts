import { vi } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'
import fetch from 'node-fetch'

const exec = promisify(execCallback)

// Global test state
export let backendProcess: ChildProcess | null = null
export const TEST_PORT = 8001
export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`

// Check if port is in use
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await exec(`lsof -i :${port} -t`)
    return !!stdout.trim()
  } catch {
    return false
  }
}

// Wait for server to be ready
async function waitForServer(url: string, timeout = 30000): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/api/health`)
      if (response.ok) {
        console.log('Backend server is ready')
        return
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  throw new Error(`Server failed to start within ${timeout}ms`)
}

// Kill process on port
async function killProcessOnPort(port: number): Promise<void> {
  try {
    const { stdout } = await exec(`lsof -i :${port} -t`)
    const pids = stdout.trim().split('\n').filter(Boolean)
    
    for (const pid of pids) {
      try {
        await exec(`kill -9 ${pid}`)
        console.log(`Killed process ${pid} on port ${port}`)
      } catch (error) {
        console.error(`Failed to kill process ${pid}:`, error)
      }
    }
  } catch {
    // No process on port
  }
}

// Start backend server
export async function startBackend(): Promise<void> {
  console.log('Starting backend server for integration tests...')
  
  // Kill any existing process on the test port
  if (await isPortInUse(TEST_PORT)) {
    console.log(`Port ${TEST_PORT} is in use, killing existing process...`)
    await killProcessOnPort(TEST_PORT)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Start the backend process
  backendProcess = spawn('npm', ['run', 'start'], {
    cwd: '/home/pi/projects/stinkster_christian/stinkster/stinkster-ui/backend',
    env: {
      ...process.env,
      PORT: TEST_PORT.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  
  // Handle process output
  backendProcess.stdout?.on('data', (data) => {
    if (process.env.DEBUG_TESTS) {
      console.log(`Backend: ${data.toString()}`)
    }
  })
  
  backendProcess.stderr?.on('data', (data) => {
    console.error(`Backend Error: ${data.toString()}`)
  })
  
  // Handle process exit
  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend process exited with code ${code}`)
    }
  })
  
  // Wait for server to be ready
  await waitForServer(TEST_BASE_URL)
}

// Stop backend server
export async function stopBackend(): Promise<void> {
  if (backendProcess) {
    console.log('Stopping backend server...')
    
    backendProcess.kill('SIGTERM')
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('Force killing backend process...')
        backendProcess?.kill('SIGKILL')
        resolve()
      }, 5000)
      
      backendProcess?.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    
    backendProcess = null
  }
  
  // Ensure port is free
  if (await isPortInUse(TEST_PORT)) {
    await killProcessOnPort(TEST_PORT)
  }
}

// Global setup
export async function setup() {
  console.log('Running global setup for integration tests...')
  
  try {
    await startBackend()
  } catch (error) {
    console.error('Failed to start backend:', error)
    throw error
  }
}

// Global teardown
export async function teardown() {
  console.log('Running global teardown for integration tests...')
  
  try {
    await stopBackend()
  } catch (error) {
    console.error('Failed to stop backend:', error)
  }
}

// Make fetch available globally for tests
global.fetch = fetch as any

// Export test utilities
export const testUtils = {
  baseUrl: TEST_BASE_URL,
  
  async makeRequest(path: string, options: RequestInit = {}) {
    const url = `${TEST_BASE_URL}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    const contentType = response.headers.get('content-type')
    let data = null
    
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else if (contentType?.includes('text/')) {
      data = await response.text()
    } else {
      data = await response.blob()
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    }
  },
  
  async waitForWebSocket(url: string, timeout = 5000): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error('WebSocket connection timeout'))
      }, timeout)
      
      ws.onopen = () => {
        clearTimeout(timer)
        resolve(ws)
      }
      
      ws.onerror = (error) => {
        clearTimeout(timer)
        reject(error)
      }
    })
  },
  
  async uploadFile(path: string, file: File | Blob, fieldName = 'file') {
    const formData = new FormData()
    formData.append(fieldName, file)
    
    return testUtils.makeRequest(path, {
      method: 'POST',
      body: formData as any,
      headers: {}, // Let fetch set the content-type for multipart
    })
  },
  
  createMockWigleFile(deviceCount = 10): File {
    const header = 'WigleWifi-1.4,appRelease=2.62,model=SM-G973U,release=12,device=beyond1,display=SP1A.210812.016.G973USQS6HVA1,board=msmnile,brand=samsung\n'
    const columns = 'MAC,SSID,AuthMode,FirstSeen,Channel,Frequency,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type\n'
    
    let content = header + columns
    
    for (let i = 0; i < deviceCount; i++) {
      const mac = `AA:BB:CC:DD:${i.toString(16).padStart(2, '0').toUpperCase()}:${(i % 256).toString(16).padStart(2, '0').toUpperCase()}`
      const ssid = `TestNetwork${i}`
      const lat = 40.7128 + (Math.random() - 0.5) * 0.1
      const lon = -74.0060 + (Math.random() - 0.5) * 0.1
      const signal = -50 - Math.floor(Math.random() * 40)
      
      content += `${mac},${ssid},[WPA2-PSK-CCMP][ESS],2024-01-01 12:00:00,6,2437,${signal},${lat},${lon},10,5,WIFI\n`
    }
    
    return new File([content], 'test.wiglecsv', { type: 'text/csv' })
  },
}

// Setup and teardown for test files
beforeAll(async () => {
  if (!backendProcess) {
    await setup()
  }
})

afterAll(async () => {
  await teardown()
})