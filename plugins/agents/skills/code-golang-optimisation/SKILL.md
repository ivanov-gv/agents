---
description: Optimisation guidelines specific for Golang code. Read before refactoring and optimising any Golang code.
---

# Optimisation

Main concerns:

- Execution time
- Used amount of memory

# Execution time

## Garbage collector

- GC has stop-the-world events, which might result in latencies
- The fewer heap allocations your code makes, the less often GC runs, and the less STW pressure you produce
- Each allocation goes through mallocgc(), which checks the GC trigger threshold — so allocations are indirect votes
  toward the next GC cycle

## Allocations

- Fewer allocations is better
    - Preallocate structs such as maps and slices when the size is known
    - Reuse objects with sync.Pool for frequently allocated, short-lived structs (e.g. buffers, request objects)
    - Avoid fmt.Sprintf in hot paths — prefer strconv or strings.Builder
- Prefer stack allocations over heap allocations — stack is cheap (no GC involvement, just a pointer bump)
- Use escape analysis to understand what escapes to the heap: go build -gcflags='-m' ./...
- Common escape causes:
    - Returning a pointer to a local variable
    - Storing a value in an interface (causes boxing)
    - Closures capturing variables
    - Appending to a slice that grows beyond its initial capacity
    - Sending a value to a channel by pointer

### Stack vs Heap: Pointer and Value Passing Semantics in Go

1. **Pass structs as pointers, only if the pointer does not escape.** Write code that avoids escape — don't return them
   from constructors, don't store them in heap-allocated containers, don't send them through interfaces or channels.
   Verify with `-gcflags='-m'`
2. **Use an escaping pointer only** when the object must outlive its stack frame, allocated once per runtime (config,
   singleton, server instance)
3. **Use value for primitives and trivially small types** — where pointer indirection adds more complexity than the copy
   costs
4. **Never** use a short-lived escaping pointer for performance — always slower than a value copy at any size
