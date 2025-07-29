// Security Configuration for GTD Tool
// This file contains security policies and configurations

export const securityConfig = {
  // Content Security Policy
  csp: {
    // Development CSP (more permissive)
    development: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite HMR
        "'unsafe-eval'", // Required for development
        'blob:',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
        'https://fonts.googleapis.com',
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
      ],
      'connect-src': [
        "'self'",
        'ws:', // WebSocket for HMR
        'wss:',
        'https://api.gtd-tool.com',
        'https://sync.gtd-tool.com',
      ],
      'worker-src': [
        "'self'",
        'blob:',
      ],
      'manifest-src': ["'self'"],
      'media-src': ["'self'", 'blob:', 'data:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
    },
    
    // Production CSP (more restrictive)
    production: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        // Add specific hashes for inline scripts if needed
        // "'sha256-HASH_HERE'",
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Still needed for CSS-in-JS
        'https://fonts.googleapis.com',
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
      ],
      'connect-src': [
        "'self'",
        'https://api.gtd-tool.com',
        'https://sync.gtd-tool.com',
        'https://csp-report.gtd-tool.com',
      ],
      'worker-src': [
        "'self'",
      ],
      'manifest-src': ["'self'"],
      'media-src': ["'self'", 'blob:', 'data:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
      'report-uri': ['https://csp-report.gtd-tool.com/report'],
    },
  },
  
  // Security Headers
  headers: {
    // Common security headers
    common: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', '),
    },
    
    // Development-specific headers
    development: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    
    // Production-specific headers
    production: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  },
  
  // Trusted domains for external resources
  trustedDomains: {
    fonts: [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ],
    apis: [
      'api.gtd-tool.com',
      'sync.gtd-tool.com',
    ],
    analytics: [
      // Add analytics domains if needed
    ],
    cdn: [
      // Add CDN domains if needed
    ],
  },
  
  // Security validation rules
  validation: {
    // Input validation patterns
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    },
    
    // Maximum lengths for inputs
    maxLengths: {
      title: 200,
      description: 1000,
      note: 5000,
      tag: 50,
      context: 100,
    },
    
    // Sanitization rules
    sanitization: {
      allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
      allowedAttributes: {},
    },
  },
};

// Generate CSP string from policy object
export function generateCSPString(policy) {
  return Object.entries(policy)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Generate security headers for different environments
export function getSecurityHeaders(environment = 'production') {
  const headers = {
    ...securityConfig.headers.common,
    ...securityConfig.headers[environment],
  };
  
  // Add CSP header
  const cspPolicy = securityConfig.csp[environment];
  headers['Content-Security-Policy'] = generateCSPString(cspPolicy);
  
  return headers;
}

// Validate input against security rules
export function validateInput(input, type) {
  const { patterns, maxLengths } = securityConfig.validation;
  
  // Check length
  if (maxLengths[type] && input.length > maxLengths[type]) {
    return {
      valid: false,
      error: `Input too long. Maximum ${maxLengths[type]} characters allowed.`,
    };
  }
  
  // Check pattern if applicable
  if (patterns[type] && !patterns[type].test(input)) {
    return {
      valid: false,
      error: `Invalid ${type} format.`,
    };
  }
  
  return { valid: true };
}

// Sanitize HTML content
export function sanitizeHTML(html) {
  const { allowedTags, allowedAttributes } = securityConfig.validation.sanitization;
  
  // This is a basic implementation - in production, use a library like DOMPurify
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove disallowed tags
  const allElements = div.querySelectorAll('*');
  allElements.forEach(element => {
    if (!allowedTags.includes(element.tagName.toLowerCase())) {
      element.remove();
    } else {
      // Remove disallowed attributes
      Array.from(element.attributes).forEach(attr => {
        const allowedAttrs = allowedAttributes[element.tagName.toLowerCase()] || [];
        if (!allowedAttrs.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
    }
  });
  
  return div.innerHTML;
}

export default securityConfig;