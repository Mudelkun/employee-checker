# Check-In/Check-Out System - Employee & Admin Guide

## For Employees

### Normal Workflow (Today)

**Morning - Check In:**

1. Enter your employee ID number on the keypad
2. Click **"Pointage entrant"** (Check-In button)
3. **Immediate response:**
   - ✅ **Success**: "✅ [Your Name] - Pointage entrant accepté" (green)
   - ❌ **Already checked in**: "❌ [Your Name] - Déjà pointée arrivée aujourd'hui" (red)
   - ❌ **Not found**: "❌ Employé [ID] introuvable!" (red)
4. You'll hear a confirmation sound on success
5. No confirmation popup needed - direct processing!

**Afternoon - Check Out:**

1. Enter your employee ID number
2. Click **"Pointage sortant"** (Check-Out button)
3. **Immediate response:**
   - ✅ **Success**: "✅ [Your Name] - Pointage sortant accepté (8.5h)" (green)
   - ❌ **No open shift**: "❌ [Your Name] - Aucun pointage ouvert à fermer" (red)
   - ❌ **Not found**: "❌ Employé [ID] introuvable!" (red)
4. Confirmation sound indicates success
5. Hours worked displayed in the message

---

## Special Situation: You Forgot to Check Out Yesterday

**If you forgot to check out the previous day:**

**Morning - New Check In (with Warning):**

1. Enter your employee ID and click "Pointage entrant"
2. The system detects your unclosed shift from yesterday
3. **Warning message shown**: "⚠️ [Your Name] - Shift antérieur détecté (07-01-2026)" (orange)
4. System then **continues automatically** with your check-in
5. **Success message**: "✅ [Your Name] - Pointage entrant accepté" (green)
6. Admin will be notified to review the unclosed shift

**If You Want to Close Yesterday's Shift First:**

1. Enter your employee ID and click **"Pointage sortant"** (Check-Out)
2. System finds the oldest unclosed shift (yesterday's)
3. **Success message**: "✅ [Your Name] - Pointage sortant accepté (Xh)" (green)
4. NOW you can check in for today

---

## If You See "Time Discrepancy" Error

**What it means**: Your device's time is more than 5 minutes different from the server.

**What you'll see:**

- "❌ [Your Name] - [Error message]" (red)
- "⏰ Heure serveur: 8:32 AM" (orange) - shows the correct server time

**What to do:**

1. Check your phone/device's clock
2. Note the correct server time shown in the message
3. Try checking in/out again
4. If error persists, contact your supervisor

---

## For Administrators

### Monitoring Unclosed Shifts

**When Will You Be Notified?**

- When an employee checks in while having an unclosed shift from a previous day
- The response shows `"pendingAdminReview": true`

**What Information You Get:**

- Employee name and ID
- Which date had the unclosed shift
- When the employee checked in today

**What To Do:**

1. Review the employee's record in the admin panel
2. Check if there's a legitimate reason for late checkout
3. Manually correct the checkout time if needed
4. Add a note in `modifiedOn` field to document the change

### Accessing Employee History

**In Admin Dashboard:**

1. Select an employee
2. View their attendance history (now organized by date)
3. Each date shows:
   - Check-in time
   - Check-out time
   - Hours worked
   - Modification notes (if admin edited)

**Generating Reports:**

1. Click the employee's card
2. Select year and month
3. Click "Télécharger" (Download) for PDF
4. Report includes all data in new format

### Manual Corrections

**To fix an unclosed shift or incorrect time:**

1. Find the employee in admin panel
2. Locate the date that needs correction
3. Edit the check-out time field
4. The system will automatically recalculate hours worked
5. Your correction is timestamped for audit trail

---

## New Features Explained

### Pre-Submission Confirmation Modal

**What is it?** A popup that appears before any check-in or check-out is recorded.

**Why?** Prevents mistakes by letting you verify all details before they're saved to the system.

**What to check:**

- ✅ Your name is correct
- ✅ The date is correct
- ✅ The time is correct (within ~5 minutes)
- ✅ For checkout: hours calculated seem reasonable

---

### Unclosed Shift Detection

**What changed:**

- **Before**: If you forgot to check out, you couldn't check in the next day
- **After**: You can check in the next day, but the system alerts admin

**How it works:**

1. Employee checks in with an unclosed shift
2. System records: "This employee has pending unclosed shift"
3. Admin gets a flag in the system
4. Admin can manually complete the unclosed shift

---

### Time Verification

**What it does:**

- Checks that your submitted time is reasonable
- Prevents backdating check-ins/outs by many hours
- Allows ±5 minute tolerance for clock differences

**Why it matters:**

- Protects data integrity
- Ensures accurate hour tracking
- Prevents accidental wrong times

---

## Troubleshooting

### "Employee already checked in today"

**Problem**: You clicked check-in twice  
**Solution**: You're already checked in. Click check-out when leaving.

### "No unclosed shift found"

**Problem**: Tried to check-out but no check-in for today  
**Solution**: Click check-in first, then check-out.

### "Time discrepancy" error

**Problem**: Your device time differs too much from server  
**Solution**: Adjust your device clock to match the time shown in the error message.

### Modal won't confirm

**Problem**: Confirmation button not working  
**Solution**: Make sure you clicked the green "Confirmer" button (not anywhere else).

---

## Data Format Changes (Technical Reference)

### Old Format (Array - No Longer Used)

```json
"hdePointage": [
  {"date": "01/07/2026", "entrer": "8:00 AM", "sorti": "4:30 PM"}
]
```

### New Format (Date-Keyed Object)

```json
"hdePointage": {
  "01-07-2026": {
    "entrer": "8:00 AM",
    "sorti": "4:30 PM",
    "heureTravailer": 8.5
  }
}
```

**Benefits:**

- One entry per date (no duplicates)
- Cleaner structure
- Easier to query by date
- Better data integrity

---

## Key Statistics (Migration Results)

- **Total Records**: 335 attendance records processed
- **Duplicates Removed**: 24 (employees who checked in multiple times same day)
- **Unclosed Shifts Flagged**: 3 (waiting for admin review)
- **Data Backup**: `employees.json.pre-migration-backup` (safe copy)

---

## Questions?

For issues with:

- **Check-in/Check-out**: Ask your supervisor or IT support
- **Time discrepancies**: Check your device clock
- **History records**: Contact admin to review your attendance

For administrators:

- **System errors**: Check server logs
- **Data corrections**: Use admin dashboard
- **Backups**: Available as `employees.json.pre-migration-backup`

---

**System Updated**: January 8, 2026  
**Status**: Production Ready  
**Last Tested**: January 8, 2026
