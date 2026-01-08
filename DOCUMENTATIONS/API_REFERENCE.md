# API Reference - New Check-In/Check-Out Endpoints

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Check-In (Entrant)

**POST** `/pointage/entrant`

**Description**: Record an employee's arrival time

**Request**:

```json
{
  "employeeId": "100001",
  "submittedTime": "8:15 AM"
}
```

**Response (Success)**:

```json
{
  "success": true,
  "message": "✅ Jean DUPONT - Pointage entrant accepté à 8:15 AM",
  "dateKey": "08-01-2026",
  "data": {
    "entrer": "8:15 AM",
    "sorti": ""
  }
}
```

**Response (Error - Already checked in)**:

```json
{
  "success": false,
  "message": "❌ Jean DUPONT - Déjà pointée arrivée aujourd'hui",
  "dateKey": "08-01-2026"
}
```

**Response (Error - Time discrepancy)**:

```json
{
  "success": false,
  "message": "⏰ Décalage horaire: 8 minutes. Heure serveur: 8:23 AM",
  "requiredTime": "8:23 AM"
}
```

**Status Codes**:

- `200` - Success
- `400` - Bad request or validation error
- `404` - Employee not found
- `500` - Server error

---

### 2. Check-Out (Sortant)

**POST** `/pointage/sortant`

**Description**: Record an employee's departure time (can be for today or any previous unclosed date)

**Request**:

```json
{
  "employeeId": "100001",
  "dateKey": "08-01-2026",
  "submittedTime": "5:30 PM"
}
```

**Response (Success)**:

```json
{
  "success": true,
  "message": "✅ Jean DUPONT - Pointage sortant accepté (9.25h)",
  "dateKey": "08-01-2026",
  "data": {
    "entrer": "8:15 AM",
    "sorti": "5:30 PM",
    "heureTravailer": 9.25
  },
  "hoursWorked": 9.25
}
```

**Response (Error - No entry found)**:

```json
{
  "success": false,
  "message": "❌ Jean DUPONT - Aucun pointage ouvert à fermer",
  "dateKey": "08-01-2026"
}
```

**Response (Error - Already checked out)**:

```json
{
  "success": false,
  "message": "❌ Jean DUPONT - Déjà pointée sortie pour 08-01-2026",
  "dateKey": "08-01-2026"
}
```

---

### 3. Get Unclosed Shifts

**GET** `/pointage/unclosed/:employeeId`

**Description**: Get all unclosed shifts for an employee (check-in without check-out)

**URL Parameters**:

- `employeeId` (string, required): Employee ID

**Response (Success)**:

```json
{
  "success": true,
  "unclosedShifts": [
    {
      "dateKey": "07-01-2026",
      "entrer": "8:00 AM",
      "hoursToNow": 12.5
    },
    {
      "dateKey": "06-01-2026",
      "entrer": "7:45 AM",
      "hoursToNow": 36.25
    }
  ]
}
```

**Response (No unclosed shifts)**:

```json
{
  "success": true,
  "unclosedShifts": []
}
```

---

### 4. Get Working Today

**GET** `/working-today`

**Description**: Get all employees currently working today (checked in but not yet checked out)

**Response (Success)**:

```json
{
  "success": true,
  "count": 5,
  "employees": [
    {
      "id": "100001",
      "name": "Jean DUPONT",
      "role": "Directeur General",
      "entrer": "8:15 AM"
    }
  ]
}
```

---

### 5. Delete History by Date

**DELETE** `/history/date/:dateKey`

**Description**: Delete all attendance records for a specific date across all employees

**URL Parameters**:

- `dateKey` (string, required): Date in DD-MM-YYYY format

**Response (Success)**:

```json
{
  "success": true,
  "message": "Supprimé 12 enregistrements pour la date 08-01-2026",
  "deletedCount": 12
}
```

---

### 6. Migrate Old Format

**POST** `/migrate/convert-old-format`

**Description**: Convert old array format to new date-keyed object format

**Response (Success)**:

```json
{
  "success": true,
  "message": "Migration terminée: 335 enregistrements traités, 24 doublons supprimés"
}
```

---

### 7. Get Haiti Time

**GET** `/haiti-time`

**Description**: Get current server time in Haiti timezone

**Response**:

```json
{
  "ts": 1704980400000,
  "date": "08/01/2026",
  "hour": "8:15 AM",
  "tz": "America/Port-au-Prince"
}
```

**Fields**:

- `ts` (number): Epoch milliseconds (timezone-agnostic)
- `date` (string): Date in DD/MM/YYYY format
- `hour` (string): Time in HH:MM AM/PM format (fr-FR locale)
- `tz` (string): Timezone identifier

---

## Time Verification Rules

**Tolerance**: ±5 minutes from server time

**Examples**:

- Server: 8:15 AM
- Client submits: 8:10 AM → ✅ Accepted (5 min difference)
- Client submits: 8:09 AM → ❌ Rejected (6 min difference)
- Client submits: 8:20 AM → ✅ Accepted (5 min difference)

**Error Response**:

```json
{
  "success": false,
  "message": "⏰ Décalage horaire: 8 minutes. Heure serveur: 8:23 AM",
  "requiredTime": "8:23 AM"
}
```

---

## Data Format

### Date Keys

- **Format**: `DD-MM-YYYY` (e.g., `08-01-2026`)
- **Used as**: Object key in `hdePointage` object
- **Unique**: One entry per date per employee
- **Enforced**: No duplicate dates allowed

### Time Format

- **Format**: `H:MM AM/PM` or `HH:MM AM/PM` (fr-FR locale)
- **Examples**: `8:15 AM`, `12:30 PM`, `11:45 AM`
- **Always**: 12-hour format with AM/PM

### Hours Worked

- **Format**: Decimal hours (e.g., `9.25` = 9 hours 15 minutes)
- **Calculated**: `heureTravailer` field
- **Precision**: 2 decimal places
- **Handles**: Midnight crossing (checkout after midnight)

---

## Employee Record Structure

```json
{
  "id": "100001",
  "name": "Jean DUPONT",
  "role": "Directeur General",
  "email": "jean@fierbout.com",
  "hdePointage": {
    "08-01-2026": {
      "entrer": "8:15 AM",
      "sorti": "5:30 PM",
      "heureTravailer": 9.25
    },
    "07-01-2026": {
      "entrer": "8:00 AM",
      "sorti": "",
      "pendingAdminReview": true
    },
    "06-01-2026": {
      "entrer": "7:45 AM",
      "sorti": "4:30 PM",
      "heureTravailer": 8.75,
      "modifiedOn": "08-01-2026, 2:15:30 PM"
    }
  }
}
```

**Fields**:

- `entrer` (string): Check-in time, empty string if not checked in
- `sorti` (string): Check-out time, empty string if not checked out
- `heureTravailer` (number): Hours worked (calculated), 0 if not checked out
- `modifiedOn` (string, optional): Timestamp if admin modified record
- `pendingAdminReview` (boolean, optional): Flag for admin to review

---

## Error Codes

| Code | Message (French)                            | Cause                         |
| ---- | ------------------------------------------- | ----------------------------- |
| 400  | ID employé et heure soumise sont requis     | Missing required fields       |
| 400  | ❌ [Nom] - Déjà pointée arrivée aujourd'hui | Duplicate check-in attempted  |
| 400  | ❌ [Nom] - Aucun pointage ouvert à fermer   | Check-out without check-in    |
| 400  | ❌ [Nom] - Déjà pointée sortie              | Duplicate check-out attempted |
| 400  | ⏰ Décalage horaire: X minutes              | Time not within tolerance     |
| 404  | ❌ Employé [ID] introuvable!                | Invalid employee ID           |
| 500  | Erreur serveur                              | Internal server error         |

---

## Client-Side Implementation Example

### Check-In

```javascript
async function checkIn(employeeId) {
  const haiti = await getHaitiTime();

  const result = await fetch("/pointage/entrant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId,
      submittedTime: haiti.hour,
    }),
  });

  const data = await result.json();

  if (data.success) {
    console.log("Check-in successful:", data.message);
  } else {
    console.error("Check-in failed:", data.message);
  }
}
```

### Check-Out

```javascript
async function checkOut(employeeId, dateKey) {
  const haiti = await getHaitiTime();

  const result = await fetch("/pointage/sortant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId,
      dateKey,
      submittedTime: haiti.hour,
    }),
  });

  const data = await result.json();

  if (data.success) {
    console.log("Checked out:", data.hoursWorked, "hours worked");
  } else {
    console.error("Check-out failed:", data.message);
  }
}
```

---

## Testing with cURL

### Check-In

```bash
curl -X POST http://localhost:3000/pointage/entrant \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"100001","submittedTime":"8:15 AM"}'
```

### Check-Out

```bash
curl -X POST http://localhost:3000/pointage/sortant \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"100001","dateKey":"08-01-2026","submittedTime":"5:30 PM"}'
```

### Get Unclosed Shifts

```bash
curl http://localhost:3000/pointage/unclosed/100001
```

### Get Haiti Time

```bash
curl http://localhost:3000/haiti-time
```

---

## Migration Notes

**Old Array Format** (No longer used):

```javascript
hdePointage: [{ date: "08/01/2026", entrer: "8:15 AM", sorti: "5:30 PM" }];
```

**New Object Format** (Current):

```javascript
hdePointage: {
  "08-01-2026": { entrer: "8:15 AM", sorti: "5:30 PM" }
}
```

**Backup**: `employees.json.pre-migration-backup` contains original data

---

## Support

For API questions or issues, check:

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details
- [EMPLOYEE_ADMIN_GUIDE.md](EMPLOYEE_ADMIN_GUIDE.md) - User guide
- Server logs: `npm start` output
