---
title: Optimisation Techniques
description: General optimisation techniques and workflow. Read before any task related to performance, refactoring for speed, or reducing resource usage.
---

# Your algorithm

1. Define the problem.
2. Define metrics, write benchmarks to show the problem in numbers.
3. Define the goal. For example, metric 1 must be improved by at least 10%.
4. Define the strategy, step by step.
5. Implement the strategy.
6. Check metrics by running benchmarks.
7. Repeat until satisfied.

# General principles

Every optimisation effort must have a strategy with:

- Measurable metrics and benchmarks
- Concrete plan of implementation
- Clearly defined success criteria

Do not optimise by intuition.

General concerns:

- Compile time
- Execution time
- Memory usage

## Compile time

Compile time optimisations are language-specific. Consult the relevant language guide.

## Execution time

Start with language-specific best practices — they are usually straightforward, well-documented, and deliver the most
improvement for the least effort.

Then, if further optimisation is needed, work top-down through the system:
1. Architecture — identify structural bottlenecks (e.g. synchronous where async would suffice, missing caching layer, chatty I/O)
2. Control and data flow — find redundant work, unnecessary passes over data, or avoidable blocking
3. Implementation — tighten hot paths, reduce allocations, prefer cheaper primitives

Use a CPU profiler to locate actual bottlenecks before making changes.

## Memory usage

Start with language-specific best practices for reducing allocations and controlling heap growth.

Then, work top-down through the system:
1. Architecture — identify structural over-retention (e.g. caches without eviction, long-lived request contexts holding large objects)
2. Data flow — find where large objects are unnecessarily copied, buffered, or kept alive longer than needed
3. Data structures — prefer flat, value-oriented layouts over pointer-heavy ones; right-size collections at initialisation

Use a heap profiler to identify what is allocated, how often, and what is retaining memory.
