# rust-learning

Rust learning guidance: explain ownership, lifetimes, and idiomatic patterns when writing or reviewing Rust code.

## Ownership mental model

- Every value has exactly one owner at a time.
- When the owner goes out of scope, the value is dropped (memory freed automatically).
- Moving a value transfers ownership; the old binding becomes invalid.

```rust
let s1 = String::from("hello");
let s2 = s1;          // s1 is moved; using s1 now is a compile error
println!("{}", s2);   // ok
```

## Borrowing rules (enforced at compile time)

- You can have *either* one mutable reference (`&mut T`) *or* any number of immutable references (`&T`) — never both simultaneously.
- References must not outlive the data they point to (lifetime rule).

## Lifetimes

- Lifetimes are just names for scopes; the compiler infers most of them.
- Annotate explicitly only when the compiler cannot infer (`'a`, `'b`, `'static`).
- `'static` means the value lives for the entire program (string literals, leaked allocations).

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

## Idiomatic patterns

| Pattern | Preferred | Avoid |
|---------|-----------|-------|
| Optional value | `Option<T>` | nullable raw pointer |
| Fallible operation | `Result<T, E>` | panicking on failure |
| Error propagation | `?` operator | manual `match` on every error |
| Iteration | `iter()` / `map` / `filter` | explicit index loops |
| String ownership | `String` (owned), `&str` (borrowed) | `String` everywhere |

## Common beginner pitfalls

- **Clone overuse**: cloning to satisfy the borrow checker is a code smell; redesign ownership instead.
- **Unwrap in production**: replace `.unwrap()` with `?` or proper error handling.
- **Ignoring `clippy`**: run `cargo clippy -- -D warnings` and fix all lints.
- **Fighting the borrow checker**: if you are fighting it, your data model is usually wrong.

## Useful commands

```bash
cargo check          # fast type/borrow check without full build
cargo clippy         # linter
cargo test           # run all tests
cargo doc --open     # browse generated docs
```
