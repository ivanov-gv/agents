---
name: code-general
description: Read before doing any coding related tasks like editing, writing, reviewing code, etc.
---

# Coding

# Make it readable

## Make the meaning clear through names

A name carries the meaning of the code. If the reader needs the surrounding code or the author to know what a name
means, the meaning is hidden and the name is wrong.

- Name the concept at the level the code works at. Shared code uses the general idea; a concrete case appears only where
  the code depends on it. Test: if another kind were added, would this name become wrong?
- Never use two words to encode a difference. State the difference in the name.

<bad-example>

```go
// shared tracker: a "vehicle" is the current position, a "bus" the remembered one
func matchVehiclesToPreviousBuses(vehicles []Vehicle) map[int]busMatch
```

</bad-example>

<good-example>

```go
// shared tracker: "bus" would be wrong as soon as trains are added
func matchToPreviousVehicles(vehicles []Vehicle) map[int]vehicleMatch
```

</good-example>

## Break complex expressions into named local variables

Avoid chaining operations or nesting calls when the result has a meaningful name. Each intermediate variable should
express one clear thought; the reader should be able to understand the code by reading it like a sentence.

<bad-example>

```go  
for _, station := range lo.Filter(integration.Stations, func (s integration.StationData, _ int) bool { return !s.Blacklisted }) {
for _, name := range lo.Uniq(lo.Compact([]string{station.Name, station.NameEn, station.NameCyr})) {

```

</bad-example>

<good-example>

```go
nonBlacklistedStations := lo.Filter(integration.Stations, func (s integration.StationData, _ int) bool {
  return !s.Blacklisted
})

for _, station := range nonBlacklistedStations {
  officialNames := lo.Uniq(lo.Compact([]string{station.Name, station.NameEn, station.NameCyr}))
    for _, name := range officialNames {  
```  

</good-example> 

This applies everywhere, not just in tests: if a sub-expression has a name, give it one.

## Do not extract single-use constructors into helper functions

Use a **local variable** when the value is constructed in one place and the name documents intent.
Use a **function** when logic is reused across multiple call sites, or complex enough to deserve its own
unit of reasoning.

Do not create a function whose only purpose is to name a one-time, one-liner construction. That is what
local variables are for:

<bad-example>

```go
func newMatcher() *approxmatch.Matcher {
  return approxmatch.NewMatcher(lo.Keys(nameToStationName), nil)
}

matcher := newMatcher()

```

</bad-example>

<good-example>

```go
  matcher := approxmatch.NewMatcher(lo.Keys(nameToStationName), nil)
```

</good-example>

