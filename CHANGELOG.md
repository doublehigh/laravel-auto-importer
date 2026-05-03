# Changelog

# [1.0.22] - 2026-05-03

## Added

### New Laravel Facades
- Added `Hash`
- Added `Http`
- Added `Log`
- Added `Mail`
- Added `Storage`
- Added `Validator`
- Added `Notification`
- Added `Password`
- Added `Session`

### New Laravel Helpers / Support Classes
- Added `Arr`
- Added `Collection`

### HTTP Classes
- Added `Request`
- Added `Response`
- Added `JsonResponse`

### Eloquent Support
- Added:
  - `Model`
  - `Builder`
  - `SoftDeletes`
  - `HasFactory`

### Queue / Job Support
- Added:
  - `Dispatchable`
  - `Queueable`
  - `ShouldQueue`

### Morph Relationship Support
- Added:
  - `MorphMany`
  - `MorphTo`
  - `MorphOne`

### Model Resolution Improvements
- Added support for:
  - `app/Models`
  - `app`

### Trait Detection
- Added automatic import detection for:
  - `SoftDeletes`
  - `HasFactory`
  - `Dispatchable`
  - `Queueable`

### Stability Improvements
- Added safer processing flow using:
  - `try/catch`
  - execution guards
  - processing locks

---

## Changed

### Smart Import Engine
- Improved detection pipeline for:
  - Facades
  - Relations
  - Traits
  - Static class usage

### Import Insertion
- Improved namespace detection
- Improved import positioning
- Better handling of empty lines
- Prevented duplicate imports

### Code Structure
- Refactored sections for better readability
- Improved maintainability of engine architecture

---

## Removed

### Cleanup Engine
Removed automatic unused import cleanup system.

Reason:
The cleanup engine could incorrectly remove valid imports because the analyzer does not yet fully support:

- Custom classes
- DTOs
- Interfaces
- Repository patterns
- Traits
- Vendor packages
- Contracts
- Enums
- Advanced type hints
- Complex dependency injection patterns

This removal improves:
- Stability
- Developer trust
- Safety
- User experience

Cleanup engine will return in a future version with a smarter analyzer.

---

# [1.0.0] - Initial Release

## Features

- Automatic Laravel facade imports
- Automatic relationship imports
- Smart model detection
- Debounced file processing
- Safe import insertion
- PHP file detection
- Workspace model resolution
- Duplicate import prevention

## Supported Imports

### Facades
- Auth
- DB
- Cache
- Route
- Gate

### Helpers
- Str
- Carbon

### Relationships
- HasMany
- BelongsTo
- HasOne
- BelongsToMany