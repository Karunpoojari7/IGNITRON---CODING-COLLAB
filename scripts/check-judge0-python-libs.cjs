const http = require('http');

const payload = JSON.stringify({
  source_code: `import sys
try:
    import numpy as np
    import pandas as pd
    print(f"NUMPY={np.__version__}")
    print(f"PANDAS={pd.__version__}")
except Exception as e:
    print(f"IMPORT_ERROR: {e}")
`,
  language_id: 71,
  stdin: ''
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 2358,
  path: '/submissions?wait=true&base64_encoded=false',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Judge0 Response:\n', d));
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();
