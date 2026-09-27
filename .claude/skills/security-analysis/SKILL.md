---
description: Security-focused code analysis based on OWASP Top 10 and secure coding practices
---

# Security Analysis Expert

Specialist in identifying vulnerabilities, security anti-patterns, and secure coding practices based on OWASP standards.

## Injection Attacks (OWASP A03:2021)

### SQL Injection
```typescript
// VULNERABLE
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(query);

// SECURE - Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);
```

### Command Injection
```typescript
// VULNERABLE
const { exec } = require('child_process');
exec(`ping ${userInput}`);

// SECURE - Validate input and use array syntax
const { execFile } = require('child_process');
execFile('ping', ['-c', '4', validatedHostname]);
```

### XSS (Cross-Site Scripting)
```typescript
// VULNERABLE - Direct HTML insertion
element.innerHTML = userInput;

// SECURE - Use textContent or sanitize
element.textContent = userInput;
// OR use DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Path Traversal
```typescript
// VULNERABLE
const filePath = `/uploads/${userInput}`;
fs.readFile(filePath);

// SECURE - Validate and normalize paths
const path = require('path');
const basePath = path.resolve('/uploads');
const fullPath = path.resolve(basePath, userInput);
if (!fullPath.startsWith(basePath)) {
  throw new Error('Invalid path');
}
```

## Authentication & Authorization (OWASP A07:2021)

### Weak Password Policies
```typescript
// WEAK - No validation
if (password.length >= 6) { ... }

// STRONG - Comprehensive validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
if (!passwordRegex.test(password)) {
  throw new Error('Password must be 12+ chars with upper, lower, digit, special');
}
```

### Session Management Issues
```typescript
// INSECURE - Predictable session IDs
const sessionId = Date.now().toString();

// SECURE - Cryptographically random
const crypto = require('crypto');
const sessionId = crypto.randomBytes(32).toString('hex');
```

### JWT Vulnerabilities
```typescript
// VULNERABLE - Algorithm confusion attack
jwt.verify(token, publicKey);

// SECURE - Specify algorithm explicitly
jwt.verify(token, publicKey, { algorithms: ['RS256'] });

// VULNERABLE - Weak secret
const token = jwt.sign(payload, 'secret123');

// SECURE - Strong secret from environment
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '1h',
  algorithm: 'HS256'
});
```

### Missing Authorization Checks
```typescript
// VULNERABLE - No authz check
app.delete('/users/:id', async (req, res) => {
  await User.delete(req.params.id);
});

// SECURE - Verify ownership or admin role
app.delete('/users/:id', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await User.delete(req.params.id);
});
```

## Sensitive Data Exposure (OWASP A02:2021)

### Hardcoded Credentials
```typescript
// CRITICAL VULNERABILITY
const API_KEY = 'sk-1234567890abcdef';
const DB_PASSWORD = 'password123';

// SECURE - Use environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY not configured');
```

### Logging Sensitive Information
```typescript
// VULNERABLE
logger.info('User login', { username, password, ssn });

// SECURE - Redact sensitive data
logger.info('User login', { username, password: '[REDACTED]' });
```

### Unencrypted Storage
```typescript
// VULNERABLE
localStorage.setItem('token', authToken);

// BETTER - Use httpOnly cookies (server-side)
res.cookie('token', authToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

### Exposure in Error Messages
```typescript
// VULNERABLE - Leaks implementation details
catch (error) {
  res.status(500).json({ error: error.stack });
}

// SECURE - Generic errors in production
catch (error) {
  logger.error('Database error', { error });
  res.status(500).json({ error: 'Internal server error' });
}
```

## Security Misconfiguration (OWASP A05:2021)

### Default Credentials
```typescript
// VULNERABLE
const admin = { username: 'admin', password: 'admin' };

// SECURE - Force password change on first login
if (user.isFirstLogin) {
  return res.status(403).json({
    error: 'Password change required',
    changePasswordUrl: '/auth/change-password'
  });
}
```

### Verbose Error Messages in Production
```typescript
// VULNERABLE
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// SECURE - Environment-aware errors
app.use((err, req, res, next) => {
  logger.error(err);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  res.status(500).json({ error: message });
});
```

### Missing Security Headers
```typescript
// VULNERABLE - No security headers

// SECURE - Use helmet.js
const helmet = require('helmet');
app.use(helmet());

// Or manually:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### Outdated Dependencies
```bash
# Check for vulnerabilities
npm audit

# Fix automatically when possible
npm audit fix

# Review and update dependencies
npm outdated
```

## Cryptography (OWASP A02:2021)

### Weak Algorithms
```typescript
// VULNERABLE - MD5/SHA1 are broken
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(password).digest('hex');

// SECURE - Use bcrypt for passwords
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12); // 12 rounds

// For non-password hashing, use SHA-256+
const hash = crypto.createHash('sha256').update(data).digest('hex');
```

### Hardcoded Encryption Keys
```typescript
// VULNERABLE
const algorithm = 'aes-256-cbc';
const key = '12345678901234567890123456789012';
const cipher = crypto.createCipheriv(algorithm, key, iv);

// SECURE
const key = crypto.scryptSync(process.env.ENCRYPTION_PASSWORD, 'salt', 32);
const cipher = crypto.createCipheriv(algorithm, key, iv);
```

### Improper IV Generation
```typescript
// VULNERABLE - Reusing IV
const iv = Buffer.alloc(16, 0);

// SECURE - Random IV for each encryption
const iv = crypto.randomBytes(16);
```

### Insecure Random Number Generation
```typescript
// VULNERABLE - Predictable
const token = Math.random().toString(36);

// SECURE - Cryptographically random
const token = crypto.randomBytes(32).toString('hex');
```

## Additional Security Concerns

### Prototype Pollution
```typescript
// VULNERABLE
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key];
  }
}
// Attack: merge({}, JSON.parse('{"__proto__":{"isAdmin":true}}'))

// SECURE - Use Object.assign or spread with object checks
function merge(target, source) {
  return Object.assign({}, target, source);
}
```

### RegEx Denial of Service (ReDoS)
```typescript
// VULNERABLE - Catastrophic backtracking
const regex = /^(a+)+$/;
regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!'); // Hangs

// SECURE - Avoid nested quantifiers
const regex = /^a+$/;
```

### Insecure Deserialization
```typescript
// VULNERABLE
const obj = eval('(' + userInput + ')');

// SECURE - Use JSON.parse with validation
try {
  const obj = JSON.parse(userInput);
  // Validate schema with Zod or similar
  const validated = schema.parse(obj);
} catch {
  throw new Error('Invalid input');
}
```

## CORS Misconfiguration
```typescript
// VULNERABLE - Allow all origins
app.use(cors({ origin: '*' }));

// SECURE - Whitelist specific origins
const allowedOrigins = ['https://example.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## Output:
For each vulnerability provide:
1. **Vulnerability Type**: OWASP category and specific issue
2. **Risk Level**:
   - `critical` - Immediate exploitation risk, data breach potential
   - `high` - Significant security flaw, should be fixed urgently
   - `medium` - Security weakness, requires attention
   - `low` - Minor security concern, best practice improvement
3. **Attack Scenario**: How this could be exploited
4. **Mitigation**: Specific code fix with secure example
5. **References**: Link to OWASP page if applicable
