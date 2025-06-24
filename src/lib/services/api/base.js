import axios from 'axios'

/**
 * Base API service class with common functionality
 */
export class BaseAPIService {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      error => Promise.reject(error)
    )
    
    // Response interceptor
    this.client.interceptors.response.use(
      response => response.data,
      error => {
        console.error('API Error:', error)
        if (error.response) {
          // Server responded with error
          throw new Error(error.response.data.message || error.response.statusText)
        } else if (error.request) {
          // Request made but no response
          throw new Error('No response from server')
        } else {
          // Request setup error
          throw new Error(error.message)
        }
      }
    )
  }
  
  // Common HTTP methods
  async get(endpoint, params = {}) {
    return this.client.get(endpoint, { params })
  }
  
  async post(endpoint, data = {}) {
    return this.client.post(endpoint, data)
  }
  
  async put(endpoint, data = {}) {
    return this.client.put(endpoint, data)
  }
  
  async delete(endpoint) {
    return this.client.delete(endpoint)
  }
  
  async patch(endpoint, data = {}) {
    return this.client.patch(endpoint, data)
  }
}