const http = require('http');

const testCode = `
import json
import pandas as pd
import numpy as np

def solve(data):
    df = pd.DataFrame(data['participants'])
    return {"count": len(df), "columns": list(df.columns)}

if __name__ == '__main__':
    import sys
    raw = sys.stdin.read().strip()
    data = json.loads(raw) if raw else {}
    res = solve(data)
    print(json.dumps(res))
`;

const payload = JSON.stringify({
  source_code: testCode,
  language_id: 71,
  stdin: JSON.stringify({
    participants: [
      { id: 'P101', name: 'Alice' },
      { id: 'P102', name: 'Bob' }
    ]
  })
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
  res.on('end', () => console.log('Judge0 Execution Result:\n', d));
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();
