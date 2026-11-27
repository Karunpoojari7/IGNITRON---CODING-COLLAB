import { BugHuntLanguageCode, BugHuntPlantedBug } from '@ignitron/shared';

export const ROUND2_SUPPORTED_LANGUAGES: BugHuntLanguageCode[] = [
  'javascript',
  'python',
  'cpp',
  'c',
  'java',
];

export const OFFICIAL_ROUND2_JS_STARTER_V2 = `/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Starter (JavaScript)
 * Rate Limiter Token Bucket Implementation
 */

class TokenBucketLimiter {
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Refills tokens based on elapsed wall-clock seconds.
   */
  refill() {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastRefillTimestamp) / 1000);

    const addedTokens = elapsedSeconds * this.refillRatePerSecond;
    this.tokens += addedTokens;
    this.lastRefillTimestamp = now;
  }

  /**
   * Attempts to consume requested tokens.
   */
  tryConsume(tokensRequested = 1) {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    this.tokens -= tokensRequested;
    return false;
  }

  getAvailableTokens() {
    return this.tokens;
  }
}

// --- STDIN / STDOUT HARNESS (Do not modify driver below) ---
const fs = require('fs');

function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8').trim();
  } catch (e) {
    input = '';
  }
  if (!input) {
    input = 'CAPACITY=10 REFILL=2 CONSUME=5';
  }

  const params = {};
  input.split(/\\s+/).forEach((pair) => {
    const [key, val] = pair.split('=');
    if (key && val !== undefined) {
      params[key.toUpperCase()] = parseFloat(val);
    }
  });

  const capacity = params.CAPACITY !== undefined ? params.CAPACITY : 10;
  const refillRate = params.REFILL !== undefined ? params.REFILL : 1;
  const consume = params.CONSUME !== undefined ? params.CONSUME : 1;

  let mockTime = 1000000;
  Date.now = () => mockTime;

  const limiter = new TokenBucketLimiter(capacity, refillRate);

  if (params.FIRST_CONSUME) {
    limiter.tryConsume(params.FIRST_CONSUME);
  }
  if (params.ELAPSED_MS) {
    mockTime += params.ELAPSED_MS;
  }
  if (params.CLOCK_SKEW_NEGATIVE) {
    mockTime += params.CLOCK_SKEW_NEGATIVE;
  }

  const consumed = limiter.tryConsume(consume);
  const remaining = limiter.getAvailableTokens();

  console.log(\`CONSUMED: \${consumed}, REMAINING: \${remaining}\`);
}

main();`;

export const OFFICIAL_ROUND2_PYTHON_STARTER = `"""
IGNITRON 2K26 — Round 2 Bug Hunt Starter (Python 3)
Rate Limiter Token Bucket Implementation
"""
import sys
import math

_mock_time_ms = 1000000.0

def current_time_ms():
    return _mock_time_ms

class TokenBucketLimiter:
    def __init__(self, capacity, refill_rate_per_second):
        self.capacity = float(capacity)
        self.refill_rate_per_second = float(refill_rate_per_second)
        self.tokens = float(capacity)
        self.last_refill_timestamp = current_time_ms()

    def refill(self):
        now = current_time_ms()
        elapsed_seconds = math.floor((now - self.last_refill_timestamp) / 1000.0)

        added_tokens = elapsed_seconds * self.refill_rate_per_second
        self.tokens += added_tokens
        self.last_refill_timestamp = now

    def try_consume(self, tokens_requested=1.0):
        self.refill()

        if self.tokens >= tokens_requested:
            self.tokens -= tokens_requested
            return True

        self.tokens -= tokens_requested
        return False

    def get_available_tokens(self):
        return self.tokens

# --- STDIN / STDOUT HARNESS (Do not modify driver below) ---
def _fmt(val):
    if abs(val - round(val)) < 1e-9:
        return str(int(round(val)))
    return f"{val:g}"

def main():
    global _mock_time_ms
    raw = sys.stdin.read().strip()
    if not raw:
        raw = "CAPACITY=10 REFILL=2 CONSUME=5"

    params = {}
    for pair in raw.split():
        if "=" in pair:
            k, v = pair.split("=", 1)
            params[k.upper()] = float(v)

    capacity = params.get("CAPACITY", 10.0)
    refill_rate = params.get("REFILL", 1.0)
    consume = params.get("CONSUME", 1.0)

    limiter = TokenBucketLimiter(capacity, refill_rate)

    if "FIRST_CONSUME" in params:
        limiter.try_consume(params["FIRST_CONSUME"])
    if "ELAPSED_MS" in params:
        _mock_time_ms += params["ELAPSED_MS"]
    if "CLOCK_SKEW_NEGATIVE" in params:
        _mock_time_ms += params["CLOCK_SKEW_NEGATIVE"]

    consumed = limiter.try_consume(consume)
    remaining = limiter.get_available_tokens()
    print(f"CONSUMED: {'true' if consumed else 'false'}, REMAINING: {_fmt(remaining)}")

if __name__ == "__main__":
    main()`;

export const OFFICIAL_ROUND2_CPP_STARTER = `/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Starter (C++17)
 * Rate Limiter Token Bucket Implementation
 */
#include <iostream>
#include <string>
#include <sstream>
#include <map>
#include <cmath>
#include <algorithm>

double mockTimeMs = 1000000.0;
double currentTimeMs() { return mockTimeMs; }

class TokenBucketLimiter {
private:
    double capacity;
    double refillRatePerSecond;
    double tokens;
    double lastRefillTimestamp;

public:
    TokenBucketLimiter(double cap, double rate)
        : capacity(cap), refillRatePerSecond(rate), tokens(cap), lastRefillTimestamp(currentTimeMs()) {}

    void refill() {
        double now = currentTimeMs();
        double elapsedSeconds = std::floor((now - lastRefillTimestamp) / 1000.0);

        double addedTokens = elapsedSeconds * refillRatePerSecond;
        tokens += addedTokens;
        lastRefillTimestamp = now;
    }

    bool tryConsume(double tokensRequested = 1.0) {
        refill();

        if (tokens >= tokensRequested) {
            tokens -= tokensRequested;
            return true;
        }

        tokens -= tokensRequested;
        return false;
    }

    double getAvailableTokens() const {
        return tokens;
    }
};

// --- STDIN / STDOUT HARNESS (Do not modify driver below) ---
int main() {
    std::string line, allInput;
    while (std::getline(std::cin, line)) {
        if (!allInput.empty()) allInput += " ";
        allInput += line;
    }
    if (allInput.empty()) {
        allInput = "CAPACITY=10 REFILL=2 CONSUME=5";
    }

    std::map<std::string, double> params;
    std::istringstream iss(allInput);
    std::string token;
    while (iss >> token) {
        size_t pos = token.find('=');
        if (pos != std::string::npos) {
            std::string k = token.substr(0, pos);
            for (auto& c : k) c = std::toupper(static_cast<unsigned char>(c));
            params[k] = std::stod(token.substr(pos + 1));
        }
    }

    double capacity = params.count("CAPACITY") ? params["CAPACITY"] : 10.0;
    double refillRate = params.count("REFILL") ? params["REFILL"] : 1.0;
    double consume = params.count("CONSUME") ? params["CONSUME"] : 1.0;

    TokenBucketLimiter limiter(capacity, refillRate);

    if (params.count("FIRST_CONSUME")) {
        limiter.tryConsume(params["FIRST_CONSUME"]);
    }
    if (params.count("ELAPSED_MS")) {
        mockTimeMs += params["ELAPSED_MS"];
    }
    if (params.count("CLOCK_SKEW_NEGATIVE")) {
        mockTimeMs += params["CLOCK_SKEW_NEGATIVE"];
    }

    bool consumed = limiter.tryConsume(consume);
    double remaining = limiter.getAvailableTokens();

    std::cout << "CONSUMED: " << (consumed ? "true" : "false") << ", REMAINING: " << remaining << std::endl;
    return 0;
}`;

export const OFFICIAL_ROUND2_C_STARTER = `/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Starter (C GCC)
 * Rate Limiter Token Bucket Implementation
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

double mockTimeMs = 1000000.0;
double currentTimeMs(void) { return mockTimeMs; }

typedef struct {
    double capacity;
    double refillRatePerSecond;
    double tokens;
    double lastRefillTimestamp;
} TokenBucketLimiter;

void initLimiter(TokenBucketLimiter* l, double cap, double rate) {
    l->capacity = cap;
    l->refillRatePerSecond = rate;
    l->tokens = cap;
    l->lastRefillTimestamp = currentTimeMs();
}

void refill(TokenBucketLimiter* l) {
    double now = currentTimeMs();
    double elapsedSeconds = floor((now - l->lastRefillTimestamp) / 1000.0);

    double addedTokens = elapsedSeconds * l->refillRatePerSecond;
    l->tokens += addedTokens;
    l->lastRefillTimestamp = now;
}

int tryConsume(TokenBucketLimiter* l, double tokensRequested) {
    refill(l);

    if (l->tokens >= tokensRequested) {
        l->tokens -= tokensRequested;
        return 1;
    }

    l->tokens -= tokensRequested;
    return 0;
}

double getAvailableTokens(const TokenBucketLimiter* l) {
    return l->tokens;
}

// --- STDIN / STDOUT HARNESS (Do not modify driver below) ---
int main(void) {
    char buf[4096];
    size_t n = fread(buf, 1, sizeof(buf) - 1, stdin);
    buf[n] = '\\0';
    if (n == 0) {
        strcpy(buf, "CAPACITY=10 REFILL=2 CONSUME=5");
    }

    double capacity = 10.0, refillRate = 1.0, consume = 1.0;
    double firstConsume = 0.0, elapsedMs = 0.0, clockSkew = 0.0;

    char* tok = strtok(buf, " \\t\\r\\n");
    while (tok != NULL) {
        char* eq = strchr(tok, '=');
        if (eq != NULL) {
            *eq = '\\0';
            double val = atof(eq + 1);
            for (char* p = tok; *p; ++p) *p = (char)toupper((unsigned char)*p);
            if (strcmp(tok, "CAPACITY") == 0) capacity = val;
            else if (strcmp(tok, "REFILL") == 0) refillRate = val;
            else if (strcmp(tok, "CONSUME") == 0) consume = val;
            else if (strcmp(tok, "FIRST_CONSUME") == 0) firstConsume = val;
            else if (strcmp(tok, "ELAPSED_MS") == 0) elapsedMs = val;
            else if (strcmp(tok, "CLOCK_SKEW_NEGATIVE") == 0) clockSkew = val;
        }
        tok = strtok(NULL, " \\t\\r\\n");
    }

    TokenBucketLimiter limiter;
    initLimiter(&limiter, capacity, refillRate);

    if (firstConsume > 0.0) tryConsume(&limiter, firstConsume);
    if (elapsedMs != 0.0) mockTimeMs += elapsedMs;
    if (clockSkew != 0.0) mockTimeMs += clockSkew;

    int consumed = tryConsume(&limiter, consume);
    double remaining = getAvailableTokens(&limiter);

    printf("CONSUMED: %s, REMAINING: %g\\n", consumed ? "true" : "false", remaining);
    return 0;
}`;

export const OFFICIAL_ROUND2_JAVA_STARTER = `/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Starter (Java 17)
 * Rate Limiter Token Bucket Implementation
 */
import java.util.*;

public class Main {
    static double mockTimeMs = 1000000.0;
    static double currentTimeMs() { return mockTimeMs; }

    static class TokenBucketLimiter {
        double capacity;
        double refillRatePerSecond;
        double tokens;
        double lastRefillTimestamp;

        TokenBucketLimiter(double capacity, double refillRatePerSecond) {
            this.capacity = capacity;
            this.refillRatePerSecond = refillRatePerSecond;
            this.tokens = capacity;
            this.lastRefillTimestamp = currentTimeMs();
        }

        void refill() {
            double now = currentTimeMs();
            double elapsedSeconds = Math.floor((now - this.lastRefillTimestamp) / 1000.0);

            double addedTokens = elapsedSeconds * this.refillRatePerSecond;
            this.tokens += addedTokens;
            this.lastRefillTimestamp = now;
        }

        boolean tryConsume(double tokensRequested) {
            this.refill();

            if (this.tokens >= tokensRequested) {
                this.tokens -= tokensRequested;
                return true;
            }

            this.tokens -= tokensRequested;
            return false;
        }

        double getAvailableTokens() {
            return this.tokens;
        }
    }

    // --- STDIN / STDOUT HARNESS (Do not modify driver below) ---
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (sc.hasNextLine()) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(sc.nextLine());
        }
        String input = sb.toString().trim();
        if (input.isEmpty()) {
            input = "CAPACITY=10 REFILL=2 CONSUME=5";
        }

        Map<String, Double> params = new HashMap<>();
        for (String pair : input.split("\\\\s+")) {
            String[] kv = pair.split("=");
            if (kv.length == 2) {
                params.put(kv[0].toUpperCase(), Double.parseDouble(kv[1]));
            }
        }

        double capacity = params.getOrDefault("CAPACITY", 10.0);
        double refillRate = params.getOrDefault("REFILL", 1.0);
        double consume = params.getOrDefault("CONSUME", 1.0);

        TokenBucketLimiter limiter = new TokenBucketLimiter(capacity, refillRate);

        if (params.containsKey("FIRST_CONSUME")) {
            limiter.tryConsume(params.get("FIRST_CONSUME"));
        }
        if (params.containsKey("ELAPSED_MS")) {
            mockTimeMs += params.get("ELAPSED_MS");
        }
        if (params.containsKey("CLOCK_SKEW_NEGATIVE")) {
            mockTimeMs += params.get("CLOCK_SKEW_NEGATIVE");
        }

        boolean consumed = limiter.tryConsume(consume);
        double remaining = limiter.getAvailableTokens();
        String remStr = (Math.abs(remaining - Math.round(remaining)) < 1e-9)
            ? String.valueOf(Math.round(remaining))
            : String.valueOf(remaining);

        System.out.println("CONSUMED: " + consumed + ", REMAINING: " + remStr);
    }
}`;

export const OFFICIAL_ROUND2_LANGUAGE_STARTERS: Record<BugHuntLanguageCode, string> = {
  javascript: OFFICIAL_ROUND2_JS_STARTER_V2,
  python: OFFICIAL_ROUND2_PYTHON_STARTER,
  cpp: OFFICIAL_ROUND2_CPP_STARTER,
  c: OFFICIAL_ROUND2_C_STARTER,
  java: OFFICIAL_ROUND2_JAVA_STARTER,
};

export const OFFICIAL_ROUND2_LANGUAGE_BUGS: Record<BugHuntLanguageCode, BugHuntPlantedBug[]> = {
  javascript: [
    {
      key: 'BUG_INTEGER_TRUNCATION',
      name: 'Integer Division Truncation',
      description: 'Math.floor truncation on elapsed time prevents fractional token refills during high-frequency requests.',
      lineNumber: 19,
      expression: 'Math.floor((now - this.lastRefillTimestamp) / 1000)',
      correctedExpression: '(now - this.lastRefillTimestamp) / 1000',
      marks: 5,
      repairValidationTestIndices: [0],
      acceptableTokens: ['Math.floor', 'Math.floor((now - this.lastRefillTimestamp) / 1000)', '(now - this.lastRefillTimestamp) / 1000'],
    },
    {
      key: 'BUG_CLOCK_SKEW_NEGATIVE',
      name: 'Negative Refill on Clock Skew',
      description: 'Missing non-negative floor check allows clock skew backwards to subtract tokens from the bucket.',
      lineNumber: 21,
      expression: 'elapsedSeconds * this.refillRatePerSecond',
      correctedExpression: 'Math.max(0, elapsedSeconds) * this.refillRatePerSecond',
      marks: 5,
      repairValidationTestIndices: [1],
      acceptableTokens: ['elapsedSeconds * this.refillRatePerSecond', 'const addedTokens = elapsedSeconds * this.refillRatePerSecond;'],
    },
    {
      key: 'BUG_CAPACITY_OVERFLOW',
      name: 'Uncapped Capacity Overflow',
      description: 'Tokens are incremented without enforcing the maximum capacity upper bound ceiling.',
      lineNumber: 22,
      expression: 'this.tokens += addedTokens;',
      correctedExpression: 'this.tokens = Math.min(this.capacity, this.tokens + addedTokens);',
      marks: 5,
      repairValidationTestIndices: [2],
      acceptableTokens: ['this.tokens += addedTokens;', 'this.tokens += addedTokens'],
    },
    {
      key: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
      name: 'Token Deduction on Rejection',
      description: 'tryConsume deducts tokens even when request balance is insufficient and returns false.',
      lineNumber: 37,
      expression: 'this.tokens -= tokensRequested;',
      correctedExpression: '// Remove illegal deduction when returning false',
      marks: 5,
      repairValidationTestIndices: [3],
      acceptableTokens: ['this.tokens -= tokensRequested;', 'this.tokens -= tokensRequested'],
    },
  ],
  python: [
    {
      key: 'BUG_INTEGER_TRUNCATION',
      name: 'Integer Division Truncation',
      description: 'math.floor truncation on elapsed time prevents fractional token refills during high-frequency requests.',
      lineNumber: 22,
      expression: 'math.floor((now - self.last_refill_timestamp) / 1000.0)',
      correctedExpression: '(now - self.last_refill_timestamp) / 1000.0',
      marks: 5,
      repairValidationTestIndices: [0],
      acceptableTokens: ['math.floor', 'math.floor((now - self.last_refill_timestamp) / 1000.0)'],
    },
    {
      key: 'BUG_CLOCK_SKEW_NEGATIVE',
      name: 'Negative Refill on Clock Skew',
      description: 'Missing non-negative floor check allows clock skew backwards to subtract tokens from the bucket.',
      lineNumber: 24,
      expression: 'elapsed_seconds * self.refill_rate_per_second',
      correctedExpression: 'max(0.0, elapsed_seconds) * self.refill_rate_per_second',
      marks: 5,
      repairValidationTestIndices: [1],
      acceptableTokens: ['elapsed_seconds * self.refill_rate_per_second'],
    },
    {
      key: 'BUG_CAPACITY_OVERFLOW',
      name: 'Uncapped Capacity Overflow',
      description: 'Tokens are incremented without enforcing the maximum capacity upper bound ceiling.',
      lineNumber: 25,
      expression: 'self.tokens += added_tokens',
      correctedExpression: 'self.tokens = min(self.capacity, self.tokens + added_tokens)',
      marks: 5,
      repairValidationTestIndices: [2],
      acceptableTokens: ['self.tokens += added_tokens'],
    },
    {
      key: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
      name: 'Token Deduction on Rejection',
      description: 'try_consume deducts tokens even when request balance is insufficient and returns False.',
      lineNumber: 35,
      expression: 'self.tokens -= tokens_requested',
      correctedExpression: '# Remove illegal deduction when returning False',
      marks: 5,
      repairValidationTestIndices: [3],
      acceptableTokens: ['self.tokens -= tokens_requested'],
    },
  ],
  cpp: [
    {
      key: 'BUG_INTEGER_TRUNCATION',
      name: 'Integer Division Truncation',
      description: 'std::floor truncation on elapsed time prevents fractional token refills.',
      lineNumber: 26,
      expression: 'std::floor((now - lastRefillTimestamp) / 1000.0)',
      correctedExpression: '(now - lastRefillTimestamp) / 1000.0',
      marks: 5,
      repairValidationTestIndices: [0],
      acceptableTokens: ['std::floor', 'std::floor((now - lastRefillTimestamp) / 1000.0)'],
    },
    {
      key: 'BUG_CLOCK_SKEW_NEGATIVE',
      name: 'Negative Refill on Clock Skew',
      description: 'Missing non-negative check allows clock skew backwards to subtract tokens.',
      lineNumber: 28,
      expression: 'elapsedSeconds * refillRatePerSecond',
      correctedExpression: 'std::max(0.0, elapsedSeconds) * refillRatePerSecond',
      marks: 5,
      repairValidationTestIndices: [1],
      acceptableTokens: ['elapsedSeconds * refillRatePerSecond'],
    },
    {
      key: 'BUG_CAPACITY_OVERFLOW',
      name: 'Uncapped Capacity Overflow',
      description: 'Tokens are incremented without enforcing the maximum capacity ceiling.',
      lineNumber: 29,
      expression: 'tokens += addedTokens;',
      correctedExpression: 'tokens = std::min(capacity, tokens + addedTokens);',
      marks: 5,
      repairValidationTestIndices: [2],
      acceptableTokens: ['tokens += addedTokens;', 'tokens += addedTokens'],
    },
    {
      key: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
      name: 'Token Deduction on Rejection',
      description: 'tryConsume deducts tokens even when request balance is insufficient.',
      lineNumber: 41,
      expression: 'tokens -= tokensRequested;',
      correctedExpression: '// Remove illegal deduction when returning false',
      marks: 5,
      repairValidationTestIndices: [3],
      acceptableTokens: ['tokens -= tokensRequested;', 'tokens -= tokensRequested'],
    },
  ],
  c: [
    {
      key: 'BUG_INTEGER_TRUNCATION',
      name: 'Integer Division Truncation',
      description: 'floor truncation on elapsed time prevents fractional token refills.',
      lineNumber: 29,
      expression: 'floor((now - l->lastRefillTimestamp) / 1000.0)',
      correctedExpression: '(now - l->lastRefillTimestamp) / 1000.0',
      marks: 5,
      repairValidationTestIndices: [0],
      acceptableTokens: ['floor', 'floor((now - l->lastRefillTimestamp) / 1000.0)'],
    },
    {
      key: 'BUG_CLOCK_SKEW_NEGATIVE',
      name: 'Negative Refill on Clock Skew',
      description: 'Missing non-negative check allows clock skew backwards to subtract tokens.',
      lineNumber: 31,
      expression: 'elapsedSeconds * l->refillRatePerSecond',
      correctedExpression: '(elapsedSeconds > 0.0 ? elapsedSeconds : 0.0) * l->refillRatePerSecond',
      marks: 5,
      repairValidationTestIndices: [1],
      acceptableTokens: ['elapsedSeconds * l->refillRatePerSecond'],
    },
    {
      key: 'BUG_CAPACITY_OVERFLOW',
      name: 'Uncapped Capacity Overflow',
      description: 'Tokens are incremented without enforcing the maximum capacity ceiling.',
      lineNumber: 32,
      expression: 'l->tokens += addedTokens;',
      correctedExpression: 'l->tokens = fmin(l->capacity, l->tokens + addedTokens);',
      marks: 5,
      repairValidationTestIndices: [2],
      acceptableTokens: ['l->tokens += addedTokens;', 'l->tokens += addedTokens'],
    },
    {
      key: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
      name: 'Token Deduction on Rejection',
      description: 'tryConsume deducts tokens even when request balance is insufficient.',
      lineNumber: 44,
      expression: 'l->tokens -= tokensRequested;',
      correctedExpression: '// Remove illegal deduction when returning 0',
      marks: 5,
      repairValidationTestIndices: [3],
      acceptableTokens: ['l->tokens -= tokensRequested;', 'l->tokens -= tokensRequested'],
    },
  ],
  java: [
    {
      key: 'BUG_INTEGER_TRUNCATION',
      name: 'Integer Division Truncation',
      description: 'Math.floor truncation on elapsed time prevents fractional token refills.',
      lineNumber: 26,
      expression: 'Math.floor((now - this.lastRefillTimestamp) / 1000.0)',
      correctedExpression: '(now - this.lastRefillTimestamp) / 1000.0',
      marks: 5,
      repairValidationTestIndices: [0],
      acceptableTokens: ['Math.floor', 'Math.floor((now - this.lastRefillTimestamp) / 1000.0)'],
    },
    {
      key: 'BUG_CLOCK_SKEW_NEGATIVE',
      name: 'Negative Refill on Clock Skew',
      description: 'Missing non-negative check allows clock skew backwards to subtract tokens.',
      lineNumber: 28,
      expression: 'elapsedSeconds * this.refillRatePerSecond',
      correctedExpression: 'Math.max(0.0, elapsedSeconds) * this.refillRatePerSecond',
      marks: 5,
      repairValidationTestIndices: [1],
      acceptableTokens: ['elapsedSeconds * this.refillRatePerSecond'],
    },
    {
      key: 'BUG_CAPACITY_OVERFLOW',
      name: 'Uncapped Capacity Overflow',
      description: 'Tokens are incremented without enforcing the maximum capacity ceiling.',
      lineNumber: 29,
      expression: 'this.tokens += addedTokens;',
      correctedExpression: 'this.tokens = Math.min(this.capacity, this.tokens + addedTokens);',
      marks: 5,
      repairValidationTestIndices: [2],
      acceptableTokens: ['this.tokens += addedTokens;', 'this.tokens += addedTokens'],
    },
    {
      key: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
      name: 'Token Deduction on Rejection',
      description: 'tryConsume deducts tokens even when request balance is insufficient.',
      lineNumber: 41,
      expression: 'this.tokens -= tokensRequested;',
      correctedExpression: '// Remove illegal deduction when returning false',
      marks: 5,
      repairValidationTestIndices: [3],
      acceptableTokens: ['this.tokens -= tokensRequested;', 'this.tokens -= tokensRequested'],
    },
  ],
};

export const OFFICIAL_ROUND2_VERIFICATION_TESTS = [
  {
    bugKey: 'BUG_INTEGER_TRUNCATION',
    stdin: 'CAPACITY=10 REFILL=4 FIRST_CONSUME=8 ELAPSED_MS=500 CONSUME=3',
    expectedOutput: 'CONSUMED: true, REMAINING: 1',
  },
  {
    bugKey: 'BUG_CLOCK_SKEW_NEGATIVE',
    stdin: 'CAPACITY=10 REFILL=5 CLOCK_SKEW_NEGATIVE=-2000 CONSUME=1',
    expectedOutput: 'CONSUMED: true, REMAINING: 9',
  },
  {
    bugKey: 'BUG_CAPACITY_OVERFLOW',
    stdin: 'CAPACITY=100 REFILL=50 ELAPSED_MS=500 CONSUME=25',
    expectedOutput: 'CONSUMED: true, REMAINING: 75',
  },
  {
    bugKey: 'BUG_ILLEGAL_CONSUME_DEDUCTION',
    stdin: 'CAPACITY=5 REFILL=1 CONSUME=10',
    expectedOutput: 'CONSUMED: false, REMAINING: 5',
  },
];
