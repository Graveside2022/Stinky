const winston = require('winston');

// Configure logging for CORS
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'cors-access.log' })
  ]
});

// Development and production allowed origins
const allowedOrigins = [
  'http://localhost:8002',
  'http://localhost:2501',
  'http://localhost:8000',
  'http://localhost:3002',
  'http://localhost:8073',
  'http://localhost:8092',
  'http://localhost:8889',
  'http://10.42.0.1:8002',
  'http://10.42.0.1:2501',
  'http://10.42.0.1:8000',
  'http://10.42.0.1:8073',
  'http://10.42.0.1:8092',
  'http://10.42.0.1:8889',
  'http://192.168.0.217:8002',
  'http://192.168.0.217:2501',
  'http://192.168.0.217:8000',
  'http://192.168.0.217:8073',
  'http://192.168.0.217:8092',
  'http://192.168.0.217:8889',
  // Tailscale IP addresses
  'http://100.68.185.86:8002',
  'http://100.68.185.86:8073',
  'http://100.68.185.86:8092',
  'http://100.68.185.86:8889',
  process.env.FRONTEND_URL,
  undefined
].filter(Boolean);

// CORS options with comprehensive configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow requests from same hostname on any port
    const originUrl = new URL(origin);
    const allowedHosts = ['localhost', '10.42.0.1', '192.168.0.217', '100.68.185.86'];
    
    if (allowedHosts.includes(originUrl.hostname)) {
      logger.info('Allowing CORS from same hostname:', origin);
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('CORS request from unlisted origin:', origin);
        callback(null, true);
      } else {
        logger.warn('CORS request blocked from origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id',
    'X-Response-Time'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Preflight request handler
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    logger.info('Preflight request', {
      origin: req.headers.origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers']
    });
  }
  next();
};

// Dynamic CORS for specific routes
const dynamicCors = (req, res, next) => {
  const origin = req.headers.origin;
  
  if (req.path.startsWith('/api/kismet')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  next();
};

module.exports = {
  corsOptions,
  handlePreflight,
  dynamicCors,
  logger
};