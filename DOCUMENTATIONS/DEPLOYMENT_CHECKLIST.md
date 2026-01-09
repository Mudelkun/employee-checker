# Deployment Checklist

## Pre-Deployment

- [ ] Review the [Migration Guide](./MIGRATION_GUIDE.md)
- [ ] Backup current `employees.json`:
  ```bash
  cp employees.json employees.json.backup-$(date +%Y%m%d)
  ```
- [ ] Review the PR changes:
  - Server endpoints modified
  - Frontend components updated
  - Tests added
  - Documentation included

## Deployment

### Option 1: Direct to Production (Recommended - Migration is automatic)

1. [ ] Merge PR to main branch
2. [ ] Deploy to production server
3. [ ] Monitor server startup logs for migration message
4. [ ] Verify backup file created: `employees.pre-hourly-migration-backup.json`

### Option 2: Staged Deployment (Extra Safe)

1. [ ] Deploy to staging/test environment first
2. [ ] Manually trigger migration: `POST /migrate/hourly-to-array`
3. [ ] Test thoroughly (see Testing section below)
4. [ ] Deploy to production
5. [ ] Verify production migration

## Post-Deployment Verification

### Check Server Logs
- [ ] Migration completed successfully
- [ ] No error messages
- [ ] Backup file created

### Test Hourly Employee
- [ ] Check in (first time)
- [ ] Check out (completes first shift)
- [ ] Check in (second time) ✨ **NEW!**
- [ ] Check out (completes second shift)
- [ ] View in admin panel - both shifts visible
- [ ] Calculate pay - total hours from both shifts

### Test Monthly Employee (Ensure No Regression)
- [ ] Check in
- [ ] Attempt second check-in (should be blocked)
- [ ] Check out
- [ ] View in admin panel - single shift visible
- [ ] Calculate pay - works correctly

### Test Frontend
- [ ] Admin employee list shows correct status
- [ ] Pay calculation page works
- [ ] Multiple check-ins appear correctly for hourly employees
- [ ] Single check-ins appear correctly for monthly/weekly employees

## Rollback Plan (If Needed)

If something goes wrong:

1. [ ] Stop the application
2. [ ] Restore backup:
   ```bash
   cp employees.pre-hourly-migration-backup.json employees.json
   ```
   OR
   ```bash
   cp employees.json.backup-YYYYMMDD employees.json
   ```
3. [ ] Revert code to previous version
4. [ ] Restart application
5. [ ] Report issue to development team

## Success Criteria

All items must be checked:

- [ ] Server started without errors
- [ ] Migration ran successfully (or skipped if already migrated)
- [ ] Backup file exists
- [ ] Hourly employees can check in/out multiple times per day
- [ ] Monthly/weekly employees still limited to one check-in per day
- [ ] Pay calculation accurate for both types
- [ ] No data loss
- [ ] Admin interface functioning correctly

## Notes

- Migration is **automatic** on server startup
- Migration is **idempotent** (safe to run multiple times)
- Migration only affects hourly employees
- All existing data is preserved
- Backup is created automatically

## Support Contacts

If issues arise:
- Check server logs first
- Review Migration Guide
- Contact: [Your support contact/team]

---

**Date Deployed:** _______________

**Deployed By:** _______________

**Sign-off:** _______________
