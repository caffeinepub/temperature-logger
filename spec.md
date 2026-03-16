# Temperature Logger

## Current State
- Backend stores temperatures as a flat list of `Int` values.
- Frontend displays temperatures with value, label, and sequential index.
- No timestamp data is recorded or displayed.

## Requested Changes (Diff)

### Add
- Each temperature entry now stores both the value and a timestamp (nanoseconds since epoch from `Time.now()`).
- `getTemperatures` returns an array of records: `{ value: Int, timestamp: Int }`.

### Modify
- `addTemperature` captures `Time.now()` and stores it alongside the temperature value.
- Frontend displays the timestamp for each entry (formatted as a readable date/time).

### Remove
- Nothing removed.

## Implementation Plan
1. Update backend data model to use a record type `{ value: Int; timestamp: Int }`.
2. Update `addTemperature` to capture and store `Time.now()`.
3. Update `getTemperatures` to return the full record array.
4. Update `backend.d.ts` types to reflect new return shape.
5. Update frontend list rendering to show the timestamp alongside each entry.
