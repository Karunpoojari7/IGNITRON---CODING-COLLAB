# Arena State Transitions & Execution Lifecycle

## Architecture Overview

The IGNITRON 2K26 Coding Collab platform manages synchronized multi-round team competitions with strict access control and real-time state orchestration.

```
[Admin Control Dashboard]
        │
        ▼ (SSE / Polling State Broadcast)
[Team Arena Workspace] ─── (Code Submission) ───► [Judge0 Sandboxed Runner]
        │                                                    │
        ▼                                                    ▼
[TiDB Cloud Database] ◄──────── (Evaluation) ──────── [Automated Scoring]
```

## Round State Progression
1. **LOBBY / STANDBY:** Teams authenticate and wait for round activation.
2. **ACTIVE ROUND:**
   - **Round 1 (MCQ & Logic):** 30 questions, 30 minutes, 30 marks.
   - **Round 2 (Bug Hunt & Relay):** 4 flawed code modules, 40 minutes, 100 marks.
   - **Round 3 (Final):** 3 complex algorithmic challenges, 60 minutes, 100 marks.
3. **EVALUATION:** Automated test case validation and score normalization.
4. **COMPLETED / QUALIFICATION:** Shortlisted teams unlock subsequent arenas.

## Sandboxed Code Execution
- Submissions execute in isolated sandbox environments via Judge0.
- Strict CPU limits (2.0s per test case) and memory caps (128MB).
- Supported languages: Python 3, Java, C++, JavaScript.
