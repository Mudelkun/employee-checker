# Hourly Employee Multiple Check-ins Feature

## Overview
This feature allows hourly employees (`payType === "hourly"`) to check in and out multiple times per day, while maintaining the existing single check-in/out behavior for monthly and weekly employees.

## Implementation

### Data Structure

The `hdePointage` field now uses different formats based on employee type:

#### Hourly Employees (payType === "hourly")
```javascript
{
  "hdePointage": {
    "09-01-2026": [
      {
        "entrer": "8:00 AM",
        "sorti": "12:00 PM",
        "heureTravailer": 4
      },
      {
        "entrer": "1:00 PM",
        "sorti": "5:00 PM",
        "heureTravailer": 4
      }
    ]
  }
}
```

#### Non-Hourly Employees (payType === "monthly" or "weekly")
```javascript
{
  "hdePointage": {
    "09-01-2026": {
      "entrer": "9:00 AM",
      "sorti": "5:00 PM",
      "heureTravailer": 8
    }
  }
}
```

## Backend Changes

### `/pointage/entrant` (Check-in)
- **Hourly employees**: 
  - Stores check-ins in an array
  - Allows multiple check-ins per day
  - Blocks new check-in if there's an unclosed check-in
  - Automatically migrates old object format to array format

- **Non-hourly employees**:
  - Maintains single object format
  - Blocks multiple check-ins per day (existing behavior)

### `/pointage/sortant` (Check-out)
- **Hourly employees**: 
  - Finds the most recent unclosed check-in in the array
  - Closes that entry and calculates hours worked

- **Non-hourly employees**:
  - Maintains existing single check-out behavior

### `/pointage/unclosed/:employeeId`
- Returns unclosed shifts for both array and object formats
- Properly handles hourly employees with multiple unclosed shifts

### `/working-today`
- Correctly identifies working status for both formats

## Frontend Changes

### `admin-employees.js`
- Updated working status detection to handle both array and object formats
- Shows correct status for hourly employees with multiple check-ins

### `calculate-pay.js`
- Updated to calculate total hours from both formats
- Properly aggregates hours from multiple check-in/out pairs for hourly employees
- Maintains accurate pay calculation for all employee types

## Usage Examples

### Hourly Employee Workflow
1. **First check-in**: Employee checks in at 8:00 AM
2. **First check-out**: Employee checks out at 12:00 PM (4 hours logged)
3. **Second check-in**: Employee checks in at 1:00 PM
4. **Second check-out**: Employee checks out at 5:00 PM (4 hours logged)
5. **Total hours**: 8 hours for the day

### Monthly Employee Workflow (Unchanged)
1. **Check-in**: Employee checks in at 9:00 AM
2. **Check-out**: Employee checks out at 5:00 PM (8 hours logged)
3. **Blocked**: Cannot check in again until the next day

## Testing

### Unit Tests
- `tests/test_hourly_multiple_checkins.js`: Comprehensive data-level tests
  - Tests multiple check-ins/outs for hourly employees
  - Verifies single check-in/out for monthly employees
  - Tests total hours calculation

### API Integration Tests
- `tests/test_api_endpoints.js`: End-to-end API tests
  - Tests actual HTTP endpoints
  - Verifies blocking logic
  - Tests unclosed shift detection

### Existing Tests
All existing tests pass without modification:
- `tests/test_pointage_haiti.js`
- `tests/test_crossday_pointage.js`
- `tests/test_heure.js`

## Migration

The system automatically migrates existing hourly employees from object format to array format when they check in. No manual migration is required.

## Backward Compatibility

✅ All existing functionality for monthly and weekly employees remains unchanged
✅ All existing tests pass without modification
✅ Frontend components handle both formats seamlessly
✅ Automatic migration for hourly employees on first check-in

## Security

✅ No security vulnerabilities detected by CodeQL analysis
✅ No changes to authentication or authorization logic
✅ Input validation remains in place
