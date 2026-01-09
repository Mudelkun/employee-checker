# Migration Guide: Hourly Employee Multiple Check-ins

## Overview

This guide explains how to safely migrate your deployed employee-checker application to support multiple daily check-ins for hourly employees without losing any existing data.

## What Changed?

**Data Structure Change for Hourly Employees Only:**

- **Before**: Hourly employees had a single object per date
  ```json
  "hdePointage": {
    "09-01-2026": { "entrer": "8:00 AM", "sorti": "5:00 PM", "heureTravailer": 8 }
  }
  ```

- **After**: Hourly employees have an array of check-in/out pairs per date
  ```json
  "hdePointage": {
    "09-01-2026": [
      { "entrer": "8:00 AM", "sorti": "12:00 PM", "heureTravailer": 4 },
      { "entrer": "1:00 PM", "sorti": "5:00 PM", "heureTravailer": 4 }
    ]
  }
  ```

**Non-hourly employees (monthly/weekly) are NOT affected** - their data structure remains unchanged.

## Migration Strategy

The migration happens **automatically** in three ways:

### 1. Automatic Startup Migration (Recommended)

When you deploy the new code, the server automatically runs a migration on startup that:
- Scans all hourly employees (`payType === "hourly"`)
- Converts any object-format entries to array format
- Creates a backup file before making changes
- Logs the migration status

**No manual action required!** This happens automatically when the server starts.

### 2. Runtime Migration

When an hourly employee checks in, the code automatically converts their old format to the new format if needed. This is a safety net in case the startup migration missed anything.

### 3. Manual Migration Endpoint (Optional)

For extra safety or testing, you can manually trigger the migration:

**Endpoint:** `POST /migrate/hourly-to-array`

**Response:**
```json
{
  "success": true,
  "message": "Migration complete: 3 hourly employees migrated, 2 already in array format",
  "migratedCount": 3,
  "skippedCount": 2,
  "employeesMigrated": [
    { "id": "100004", "name": "Sophie GARCIA" },
    { "id": "100005", "name": "Luc ROUSSEAU" },
    { "id": "100008", "name": "Emma MARTIN" }
  ]
}
```

## Deployment Steps

### Option A: Standard Deployment (Recommended)

1. **Backup your database** (always a good practice)
   ```bash
   cp employees.json employees.json.backup-$(date +%Y%m%d)
   ```

2. **Deploy the new code**
   - Merge the PR to main branch
   - Deploy to your server (Railway, Heroku, etc.)

3. **Verify migration**
   - Check server logs for: `"Migration: Converted hourly employees to array format"`
   - A backup file will be created: `employees.pre-hourly-migration-backup.json`

4. **Test hourly employee check-ins**
   - Have an hourly employee check in/out
   - Verify they can check in multiple times per day

### Option B: Manual Pre-deployment Migration

If you want to test the migration before deploying:

1. **Deploy to staging/test environment first**

2. **Manually trigger migration**
   ```bash
   curl -X POST http://your-server.com/migrate/hourly-to-array
   ```

3. **Verify the response** shows successful migration

4. **Test thoroughly** with hourly employees

5. **Deploy to production** with confidence

## Data Safety Features

### Automatic Backup
- **Startup migration** creates: `employees.pre-hourly-migration-backup.json`
- This backup is created BEFORE any changes are made
- Located in the same directory as `employees.json`

### Idempotent Migration
- Running the migration multiple times is safe
- Already-migrated employees are skipped
- No duplicate data or data loss

### Rollback Capability
If something goes wrong, you can restore from backup:
```bash
cp employees.pre-hourly-migration-backup.json employees.json
```
Then restart the server.

## What Gets Migrated?

**Only hourly employees are affected:**
- ✅ Employees with `payType === "hourly"`
- ❌ Monthly employees (`payType === "monthly"`)
- ❌ Weekly employees (`payType === "weekly"`)
- ❌ Employees with no `payType` set

**All data is preserved:**
- All check-in times (`entrer`)
- All check-out times (`sorti`)
- All calculated hours (`heureTravailer`)
- All metadata (`modifiedOn`, etc.)

## Verification Steps

After deployment, verify the migration:

1. **Check server logs:**
   ```
   Migration: Converted hourly employees to array format
   ```

2. **Check for backup file:**
   ```bash
   ls -la employees.pre-hourly-migration-backup.json
   ```

3. **Test hourly employee functionality:**
   - Check in an hourly employee
   - Check out
   - Check in again (should work!)
   - Check out again
   - Verify both check-in/out pairs are recorded

4. **Verify monthly employees still work:**
   - Check in a monthly employee
   - Try to check in again (should be blocked)
   - Verify single check-in/out behavior is maintained

## Troubleshooting

### Issue: Migration doesn't run automatically

**Solution:** Manually trigger the migration:
```bash
curl -X POST http://your-server.com/migrate/hourly-to-array
```

### Issue: Need to see what would be migrated

**Solution:** Check the response from the manual migration endpoint - it shows which employees would be migrated without changing anything until you actually call it.

### Issue: Want to verify data before/after

**Solution:** Compare the backup file with the current file:
```bash
# See hourly employees in backup
cat employees.pre-hourly-migration-backup.json | jq '.employees[] | select(.payType == "hourly") | {id, name, hdePointage}'

# See hourly employees in current file
cat employees.json | jq '.employees[] | select(.payType == "hourly") | {id, name, hdePointage}'
```

### Issue: Need to rollback

**Solution:**
1. Stop the server
2. Restore backup: `cp employees.pre-hourly-migration-backup.json employees.json`
3. Restart server with old code
4. Report the issue to the development team

## Testing Checklist

Before marking deployment as complete:

- [ ] Server started successfully
- [ ] Migration message appears in logs
- [ ] Backup file created
- [ ] Hourly employee can check in
- [ ] Hourly employee can check out
- [ ] Hourly employee can check in again (new feature!)
- [ ] Hourly employee can check out again
- [ ] Total hours calculated correctly
- [ ] Monthly employee can check in
- [ ] Monthly employee CANNOT check in twice (existing behavior)
- [ ] Pay calculation works for hourly employees
- [ ] Admin panel shows correct working status

## Support

If you encounter any issues during migration:

1. Check the server logs for detailed error messages
2. Verify the backup file exists
3. Test with a single hourly employee first
4. If needed, restore from backup and report the issue

## Summary

The migration is designed to be:
- ✅ **Automatic** - Runs on server startup
- ✅ **Safe** - Creates backups before changes
- ✅ **Idempotent** - Can run multiple times safely
- ✅ **Reversible** - Easy rollback if needed
- ✅ **Selective** - Only affects hourly employees
- ✅ **Non-destructive** - Preserves all existing data

**Bottom line:** Simply merge and deploy - the migration handles itself!
