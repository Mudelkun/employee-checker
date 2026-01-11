const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const { Resend } = require("resend");

const app = express();
// Increase payload limit to handle base64 images
// Version: 1.1 - Testing persistent volume
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// Serve your frontend
app.use(express.static("public"));

// Data file path - use /app/data for Railway persistent volume, fallback to local
const DATA_DIR =
  process.env.NODE_ENV === "production" ? "/app/data" : __dirname;
const DATA_FILE = path.join(DATA_DIR, "employees.json");

// Ensure data directory exists
if (process.env.NODE_ENV === "production" && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Copy initial data if not exists in persistent volume
if (
  !fs.existsSync(DATA_FILE) &&
  fs.existsSync(path.join(__dirname, "employees.json"))
) {
  fs.copyFileSync(path.join(__dirname, "employees.json"), DATA_FILE);
  console.log("Copied initial employees.json to persistent volume");
}

// ----------- MIGRATION: Add pointageLogin if missing -----------
(function migratePointageLogin() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const data = JSON.parse(raw);

      if (!data.pointageLogin) {
        data.pointageLogin = {
          username: "pointage",
          password: "1234",
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("Migration: Added pointageLogin credentials to database");
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
})();

// ----------- MIGRATION: Add email field to employees if missing -----------
(function migrateEmployeeEmail() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const data = JSON.parse(raw);
      let migrated = false;

      if (data.employees && Array.isArray(data.employees)) {
        data.employees.forEach((emp) => {
          if (emp.email === undefined) {
            emp.email = null;
            migrated = true;
          }
        });
      }

      if (migrated) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("Migration: Added email field to employees");
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
})();

// ----------- MIGRATION: Convert hourly employees to array format -----------
(function migrateHourlyEmployeesToArrayFormat() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const data = JSON.parse(raw);
      let migrated = false;

      if (data.employees && Array.isArray(data.employees)) {
        data.employees.forEach((emp) => {
          // Only migrate hourly employees
          if (
            emp.payType === "hourly" &&
            emp.hdePointage &&
            typeof emp.hdePointage === "object"
          ) {
            // Check each date entry
            Object.keys(emp.hdePointage).forEach((dateKey) => {
              const entry = emp.hdePointage[dateKey];
              // If it's an object with entrer/sorti (old format), convert to array
              if (
                entry &&
                !Array.isArray(entry) &&
                entry.entrer !== undefined
              ) {
                emp.hdePointage[dateKey] = [entry];
                migrated = true;
              }
            });
          }
        });
      }

      if (migrated) {
        // Create backup before migrating
        const backupFile = DATA_FILE.replace(
          ".json",
          ".pre-hourly-migration-backup.json"
        );
        if (!fs.existsSync(backupFile)) {
          fs.writeFileSync(backupFile, raw);
          console.log(`Migration: Created backup at ${backupFile}`);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("Migration: Converted hourly employees to array format");
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
})();

// ----------- HELPER: Load database safely -----------
function getDB() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    // Ensure correct structure
    if (!parsed || !Array.isArray(parsed.employees)) {
      parsed = parsed || {};
      parsed.employees = [];
    }

    return parsed;
  } catch (err) {
    console.error("Error reading employees.json:", err);
    return {
      admin: { username: "admin@fierbout.com", password: "Goldcamel26!" },
      employees: [],
    };
  }
}

// ----------- HELPER: Save database safely -----------
function saveDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// -------------------------------------------
// AUTHENTICATION ENDPOINT
// -------------------------------------------
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  // Load credentials from database
  const db = getDB();
  const adminCreds = db.admin || {};

  // Check credentials against database
  if (username === adminCreds.username && password === adminCreds.password) {
    return res.json({
      success: true,
      message: "Authentication successful",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }
});

// -------------------------------------------
// POINTAGE LOGIN ENDPOINT (for index.html)
// -------------------------------------------
app.post("/auth/pointage-login", (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  // Load credentials from database
  const db = getDB();
  const pointageCreds = db.pointageLogin || {
    username: "pointage",
    password: "1234",
  };

  // Check credentials against database
  if (
    username === pointageCreds.username &&
    password === pointageCreds.password
  ) {
    return res.json({
      success: true,
      message: "Authentication successful",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }
});

// -------------------------------------------
// GET all employees
// -------------------------------------------
app.get("/employees", (req, res) => {
  const db = getDB();
  res.json(db.employees);
});

// -------------------------------------------
// GET data hash (for change detection)
// -------------------------------------------
app.get("/data-hash", (req, res) => {
  const db = getDB();
  const dataString = JSON.stringify(db);
  const hash = crypto.createHash("md5").update(dataString).digest("hex");
  res.json({ hash });
});

// -------------------------------------------
// ADD new employee
// -------------------------------------------
app.post("/employees", (req, res) => {
  try {
    const db = getDB();
    const newEmployee = req.body;

    // Validate that we have required fields
    if (!newEmployee.id || !newEmployee.name) {
      return res.status(400).json({
        message: "Missing required fields: id and name",
      });
    }

    // Check for duplicate ID (convert both to string for comparison)
    if (db.employees.some((emp) => String(emp.id) === String(newEmployee.id))) {
      return res.status(400).json({
        message: "Employee with this ID already exists",
      });
    }

    db.employees.push(newEmployee);
    saveDB(db);

    res.json({
      message: "Employee added!",
      employee: newEmployee,
    });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({
      message: "Failed to add employee",
      error: err.message,
    });
  }
});

// UPDATE ONE EMPLOYEE
app.put("/employees/:id", (req, res) => {
  const id = req.params.id;
  const updatedEmployee = req.body;

  const db = getDB();
  const index = db.employees.findIndex((emp) => String(emp.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ message: "Employee not found" });
  }

  // Replace only this employee
  db.employees[index] = updatedEmployee;

  saveDB(db);

  res.json({ message: "Employee updated!", employee: updatedEmployee });
});

// DELETE ONE EMPLOYEE
app.delete("/employees/:id", (req, res) => {
  const id = req.params.id;

  const db = getDB();
  const index = db.employees.findIndex((emp) => String(emp.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ message: "Employee not found" });
  }

  // Remove employee from array
  const deletedEmployee = db.employees.splice(index, 1);

  saveDB(db);

  res.json({ message: "Employee deleted!", employee: deletedEmployee[0] });
});

// -------------------------------------------
// SEND EMAIL ENDPOINT
// -------------------------------------------
app.post("/send-id-email", async (req, res) => {
  const { employeeEmail, employeeName, employeeId } = req.body;

  if (!employeeEmail || !employeeId) {
    return res.status(400).json({
      success: false,
      message: "Email et ID de l'employé requis",
    });
  }

  // Create Resend client (uses HTTP API - works on Railway)
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Use RESEND_FROM_EMAIL env var or default
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "Fierbout <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: employeeEmail,
      subject: "Votre numéro de pointage - Fierbout",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">Fierbout - Système de Pointage</h2>
          <p>Bonjour${employeeName ? ` ${employeeName}` : ""},</p>
          <p>Vous trouverez ci-dessous votre numéro de pointage pour accéder au système de pointage électronique de l'École Fierbout:</p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">Votre numéro de pointage:</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; letter-spacing: 3px;">${employeeId}</p>
          </div>
          <p>Veuillez conserver ce numéro en lieu sûr. Vous en aurez besoin pour enregistrer vos heures d'entrée et de sortie.</p>
          <p>Si vous avez des questions, veuillez contacter votre responsable.</p>
          <br>
          <p>Cordialement,<br><strong>Direction centrale, Canada</strong></p>
          <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
          <p style="font-size: 11px; color: #888; text-align: center;">Note : Ce courriel est transmis à titre informatif uniquement. Merci de ne pas y répondre et de ne pas envoyer de messages à cette adresse électronique.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Email error:", error);
      return res.status(500).json({
        success: false,
        message: `Échec de l'envoi: ${error.message}`,
      });
    }

    console.log(`Email sent to ${employeeEmail}`, data);

    // Update employee record with emailSentDate
    const db = getDB();
    const empIndex = db.employees.findIndex(
      (emp) => String(emp.id) === String(employeeId)
    );
    if (empIndex !== -1) {
      db.employees[empIndex].emailSentDate = new Date().toISOString();
      saveDB(db);
    }

    res.json({
      success: true,
      message: "Email envoyé avec succès!",
    });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({
      success: false,
      message: `Échec de l'envoi: ${error.message}`,
    });
  }
});

// -------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// -------------------------------------------
// HAITI TIME ENDPOINT
// Returns current Haiti local time (America/Port-au-Prince) and a server timestamp (ms)
// Useful for clients that must rely on a trusted timezone-aware time source.
app.get("/haiti-time", (req, res) => {
  try {
    const now = new Date();
    const TZ = "America/Port-au-Prince";

    // Return date in French format DD/MM/YYYY
    const fmtDate = new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const fmtTime = new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now);

    // Epoch ms for the current instant (unambiguous)
    const ts = now.getTime();

    res.json({ ts, date: fmtDate, hour: fmtTime, tz: TZ });
  } catch (err) {
    console.error("/haiti-time error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------
// HELPER: Get current Haiti date as DD-MM-YYYY (used as key for hdePointage object)
// -------------------------------------------
function getHaitiDateKey() {
  const now = new Date();
  const TZ = "America/Port-au-Prince";
  const fmtDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Convert DD/MM/YYYY -> DD-MM-YYYY for use as object key
  return fmtDate.replace(/\//g, "-");
}

// -------------------------------------------
// HELPER: Get current Haiti time as HH:MM AM/PM
// -------------------------------------------
function getHaitiTime() {
  const now = new Date();
  const TZ = "America/Port-au-Prince";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}

// -------------------------------------------
// HELPER: Verify time discrepancy (in minutes)
// Returns { isValid: boolean, discrepancy: number, requiredTime: string }
// -------------------------------------------
function verifyTimeDiscrepancy(submittedTime) {
  const TIME_TOLERANCE_MINUTES = 5;

  // Parse submitted time (HH:MM AM/PM) to minutes from midnight
  const timeRegex = /(\d+):(\d+)\s(AM|PM)/i;
  const match = submittedTime.match(timeRegex);

  if (!match) {
    return {
      isValid: false,
      discrepancy: -1,
      requiredTime: getHaitiTime(),
      message: "Invalid time format. Expected HH:MM AM/PM",
    };
  }

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  const submittedMinutes = hours * 60 + minutes;

  // Get current server time in minutes
  const now = new Date();
  const TZ = "America/Port-au-Prince";
  const timeStr = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const timeMatch = timeStr.match(timeRegex);
  let sHours = parseInt(timeMatch[1]);
  const sMinutes = parseInt(timeMatch[2]);
  const sPeriod = timeMatch[3].toUpperCase();

  if (sPeriod === "AM" && sHours === 12) sHours = 0;
  if (sPeriod === "PM" && sHours !== 12) sHours += 12;

  const serverMinutes = sHours * 60 + sMinutes;
  const discrepancy = Math.abs(submittedMinutes - serverMinutes);

  return {
    isValid: discrepancy <= TIME_TOLERANCE_MINUTES,
    discrepancy,
    requiredTime: getHaitiTime(),
    message:
      discrepancy <= TIME_TOLERANCE_MINUTES
        ? "Time verified"
        : `Time discrepancy: ${discrepancy} minutes. Server time is ${getHaitiTime()}`,
  };
}

// -------------------------------------------
// HELPER: Convert 12-hour time string to 24-hour decimal
// -------------------------------------------
function to24h(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return hours + minutes / 60;
}

// -------------------------------------------
// HELPER: Convert time string to hours worked
// -------------------------------------------
function heureTravailer(entrerStr, sortiStr) {
  if (!entrerStr || !sortiStr) return 0;

  const hrEntrant = to24h(entrerStr);
  const hrSortant = to24h(sortiStr);
  let diff = hrSortant - hrEntrant;

  if (diff < 0) diff += 24;

  return Math.round(diff * 100) / 100;
}

// -------------------------------------------
// ENDPOINT: Submit check-in (entrant)
// Request: { employeeId, submittedTime }
// Response: { success, message, dateKey, data }
// -------------------------------------------
app.post("/pointage/entrant", (req, res) => {
  try {
    const { employeeId, submittedTime } = req.body;

    if (!employeeId || !submittedTime) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and submitted time are required",
      });
    }

    // Verify time discrepancy
    const timeCheck = verifyTimeDiscrepancy(submittedTime);
    if (!timeCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: timeCheck.message,
        requiredTime: timeCheck.requiredTime,
      });
    }

    const db = getDB();
    const empIndex = db.employees.findIndex(
      (emp) => String(emp.id) === String(employeeId)
    );

    if (empIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Employee ${employeeId} not found`,
      });
    }

    const emp = db.employees[empIndex];
    const dateKey = getHaitiDateKey(); // DD-MM-YYYY
    const serverTime = getHaitiTime();

    // Ensure hdePointage is an object (new format)
    if (!emp.hdePointage || typeof emp.hdePointage !== "object") {
      emp.hdePointage = {};
    }

    const isHourlyEmployee = emp.payType === "hourly";

    // For hourly employees, allow multiple check-ins per day (array format)
    // For non-hourly employees, maintain single check-in per day (object format)
    if (isHourlyEmployee) {
      // Initialize as array if not exists or is object (migration)
      if (!emp.hdePointage[dateKey]) {
        emp.hdePointage[dateKey] = [];
      } else if (!Array.isArray(emp.hdePointage[dateKey])) {
        // Migrate from object to array for hourly employees
        emp.hdePointage[dateKey] = [emp.hdePointage[dateKey]];
      }

      // Check if there's an unclosed check-in for today
      const unclosedToday = emp.hdePointage[dateKey].find(
        (entry) => entry.entrer && !entry.sorti
      );
      if (unclosedToday) {
        return res.status(400).json({
          success: false,
          message: ` Vous avez un pointage ouvert.`,
          dateKey,
        });
      }

      // Add new check-in entry to the array
      emp.hdePointage[dateKey].push({
        entrer: submittedTime,
        sorti: "",
      });

      saveDB(db);

      res.json({
        success: true,
        message: `${emp.name} checked in at ${submittedTime}`,
        dateKey,
        data: emp.hdePointage[dateKey][emp.hdePointage[dateKey].length - 1],
      });
    } else {
      // Non-hourly employee: single check-in per day (existing behavior)
      if (emp.hdePointage[dateKey] && emp.hdePointage[dateKey].entrer) {
        return res.status(400).json({
          success: false,
          message: `Employee ${emp.name} already checked in today`,
          dateKey,
        });
      }

      // Check for unclosed shift from previous day
      const sortedDates = Object.keys(emp.hdePointage).sort((a, b) => {
        const [aD, aM, aY] = a.split("-").map(Number);
        const [bD, bM, bY] = b.split("-").map(Number);
        const dateA = new Date(aY, aM - 1, aD);
        const dateB = new Date(bY, bM - 1, bD);
        return dateB - dateA;
      });

      let unclosedShift = null;
      for (const date of sortedDates) {
        if (
          date !== dateKey &&
          emp.hdePointage[date].entrer &&
          !emp.hdePointage[date].sorti
        ) {
          unclosedShift = date;
          break;
        }
      }

      // Create new check-in entry
      emp.hdePointage[dateKey] = {
        entrer: submittedTime,
        sorti: "",
      };

      saveDB(db);

      const response = {
        success: true,
        message: `${emp.name} checked in at ${submittedTime}`,
        dateKey,
        data: emp.hdePointage[dateKey],
      };

      // Notify if there's an unclosed shift that needs admin attention
      if (unclosedShift) {
        response.pendingAdminReview = true;
        response.unclosedShiftDate = unclosedShift;
        response.message += ` (⚠️ Unclosed shift from ${unclosedShift} - admin notification sent)`;
      }

      res.json(response);
    }
  } catch (err) {
    console.error("Error in /pointage/entrant:", err);
    res.status(500).json({
      success: false,
      message: "Server error during check-in",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Submit check-out (sortant) - can be for any date
// Request: { employeeId, dateKey (DD-MM-YYYY), submittedTime }
// Response: { success, message, dateKey, data, hoursWorked }
// -------------------------------------------
app.post("/pointage/sortant", (req, res) => {
  try {
    const { employeeId, dateKey, submittedTime } = req.body;

    if (!employeeId || !dateKey || !submittedTime) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, date key, and submitted time are required",
      });
    }

    // Verify time discrepancy
    const timeCheck = verifyTimeDiscrepancy(submittedTime);
    if (!timeCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: timeCheck.message,
        requiredTime: timeCheck.requiredTime,
      });
    }

    const db = getDB();
    const empIndex = db.employees.findIndex(
      (emp) => String(emp.id) === String(employeeId)
    );

    if (empIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Employee ${employeeId} not found`,
      });
    }

    const emp = db.employees[empIndex];
    const isHourlyEmployee = emp.payType === "hourly";

    // Ensure hdePointage is an object
    if (!emp.hdePointage || typeof emp.hdePointage !== "object") {
      emp.hdePointage = {};
    }

    if (isHourlyEmployee) {
      // Hourly employee: handle array format
      if (
        !emp.hdePointage[dateKey] ||
        !Array.isArray(emp.hdePointage[dateKey])
      ) {
        return res.status(400).json({
          success: false,
          message: `No check-in found for date ${dateKey}`,
          dateKey,
        });
      }

      // Find the most recent unclosed check-in entry
      const unclosedEntry = emp.hdePointage[dateKey]
        .slice()
        .reverse()
        .find((entry) => entry.entrer && !entry.sorti);

      if (!unclosedEntry) {
        return res.status(400).json({
          success: false,
          message: `No open check-in found for date ${dateKey}`,
          dateKey,
        });
      }

      // Fill in checkout time and calculate hours
      unclosedEntry.sorti = submittedTime;
      unclosedEntry.heureTravailer = heureTravailer(
        unclosedEntry.entrer,
        submittedTime
      );

      // Mark if this was from a previous day (not today)
      const todayKey = getHaitiDateKey();
      if (dateKey !== todayKey) {
        unclosedEntry.modifiedOn = `Auto-completed on ${todayKey}`;
      }

      saveDB(db);

      res.json({
        success: true,
        message: `${emp.name} checked out at ${submittedTime}`,
        dateKey,
        data: unclosedEntry,
        hoursWorked: unclosedEntry.heureTravailer,
      });
    } else {
      // Non-hourly employee: handle object format (existing behavior)
      // Check if the specified date has an entry
      if (!emp.hdePointage[dateKey] || !emp.hdePointage[dateKey].entrer) {
        return res.status(400).json({
          success: false,
          message: `No check-in found for date ${dateKey}`,
          dateKey,
        });
      }

      // Check if already checked out
      if (emp.hdePointage[dateKey].sorti) {
        return res.status(400).json({
          success: false,
          message: `Employee ${emp.name} already checked out for ${dateKey}`,
          dateKey,
        });
      }

      // Fill in checkout time and calculate hours
      emp.hdePointage[dateKey].sorti = submittedTime;
      emp.hdePointage[dateKey].heureTravailer = heureTravailer(
        emp.hdePointage[dateKey].entrer,
        submittedTime
      );

      // Mark if this was from a previous day (not today)
      const todayKey = getHaitiDateKey();
      if (dateKey !== todayKey) {
        emp.hdePointage[dateKey].modifiedOn = `Auto-completed on ${todayKey}`;
      }

      saveDB(db);

      res.json({
        success: true,
        message: `${emp.name} checked out at ${submittedTime}`,
        dateKey,
        data: emp.hdePointage[dateKey],
        hoursWorked: emp.hdePointage[dateKey].heureTravailer,
      });
    }
  } catch (err) {
    console.error("Error in /pointage/sortant:", err);
    res.status(500).json({
      success: false,
      message: "Server error during check-out",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Get unclosed shifts for an employee
// Request: { employeeId }
// Response: { success, unclosedShifts: [{dateKey, entrer, hoursToNow}] }
// -------------------------------------------
app.get("/pointage/unclosed/:employeeId", (req, res) => {
  try {
    const { employeeId } = req.params;

    const db = getDB();
    const emp = db.employees.find((e) => String(e.id) === String(employeeId));

    if (!emp) {
      return res.status(404).json({
        success: false,
        message: `Employee ${employeeId} not found`,
      });
    }

    // Ensure hdePointage is an object
    if (!emp.hdePointage || typeof emp.hdePointage !== "object") {
      return res.json({ success: true, unclosedShifts: [] });
    }

    const isHourlyEmployee = emp.payType === "hourly";
    const unclosedShifts = [];

    Object.entries(emp.hdePointage).forEach(([dateKey, record]) => {
      if (isHourlyEmployee && Array.isArray(record)) {
        // For hourly employees with array format
        record.forEach((entry) => {
          if (entry.entrer && !entry.sorti) {
            const serverTime = getHaitiTime();
            const hrNow = to24h(serverTime);
            const hrEntrer = to24h(entry.entrer);
            let diff = hrNow - hrEntrer;
            if (diff < 0) diff += 24;

            unclosedShifts.push({
              dateKey,
              entrer: entry.entrer,
              hoursToNow: Math.round(diff * 100) / 100,
            });
          }
        });
      } else if (!isHourlyEmployee && record.entrer && !record.sorti) {
        // For non-hourly employees with object format
        const serverTime = getHaitiTime();
        const hrNow = to24h(serverTime);
        const hrEntrer = to24h(record.entrer);
        let diff = hrNow - hrEntrer;
        if (diff < 0) diff += 24;

        unclosedShifts.push({
          dateKey,
          entrer: record.entrer,
          hoursToNow: Math.round(diff * 100) / 100,
        });
      }
    });

    // Sort by date (oldest first)
    unclosedShifts.sort((a, b) => {
      const [aD, aM, aY] = a.dateKey.split("-").map(Number);
      const [bD, bM, bY] = b.dateKey.split("-").map(Number);
      return new Date(aY, aM - 1, aD) - new Date(bY, bM - 1, bD);
    });

    res.json({ success: true, unclosedShifts });
  } catch (err) {
    console.error("Error in /pointage/unclosed:", err);
    res.status(500).json({
      success: false,
      message: "Server error retrieving unclosed shifts",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Get list of employees working today
// GET /working-today
// Response: { success, workingToday: [{id, name}, ...] }
// -------------------------------------------
app.get("/working-today", (req, res) => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    const employes = data.employes || [];

    const todayKey = getHaitiDateKey();

    const workingToday = employes
      .filter((emp) => {
        if (!emp.hdePointage || !emp.hdePointage[todayKey]) {
          return false;
        }

        const todayData = emp.hdePointage[todayKey];
        const isHourlyEmployee = emp.payType === "hourly";

        if (isHourlyEmployee && Array.isArray(todayData)) {
          // For hourly employees, check if there's any unclosed entry
          return todayData.some((entry) => entry.entrer && !entry.sorti);
        } else if (!isHourlyEmployee) {
          // For non-hourly employees, check single entry
          return todayData.entrer && !todayData.sorti;
        }

        return false;
      })
      .map((emp) => {
        const todayData = emp.hdePointage[todayKey];
        const isHourlyEmployee = emp.payType === "hourly";

        let checkedInAt;
        if (isHourlyEmployee && Array.isArray(todayData)) {
          // For hourly employees, get the most recent unclosed entry
          const unclosedEntry = todayData
            .slice()
            .reverse()
            .find((entry) => entry.entrer && !entry.sorti);
          checkedInAt = unclosedEntry ? unclosedEntry.entrer : "";
        } else {
          checkedInAt = todayData.entrer;
        }

        return {
          id: emp.id,
          name: emp.name,
          checkedInAt,
        };
      });

    res.json({ success: true, workingToday });
  } catch (err) {
    console.error("Error in /working-today:", err);
    res.status(500).json({
      success: false,
      message: "Server error retrieving working employees",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Delete all history for a specific date
// DELETE /history/date/:dateKey
// Request: /history/date/07-01-2026
// Response: { success, deletedCount, dateKey }
// -------------------------------------------
app.delete("/history/date/:dateKey", (req, res) => {
  try {
    const { dateKey } = req.params;

    // Validate dateKey format (DD-MM-YYYY)
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Expected DD-MM-YYYY",
      });
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    const employes = data.employes || [];

    let deletedCount = 0;

    // Remove the date entry from each employee's hdePointage
    employes.forEach((emp) => {
      if (emp.hdePointage && emp.hdePointage[dateKey]) {
        delete emp.hdePointage[dateKey];
        deletedCount++;
      }
    });

    // Save updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      message: `Deleted history for date ${dateKey}`,
      deletedCount,
      dateKey,
    });
  } catch (err) {
    console.error("Error in DELETE /history/date:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting history",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Migration - Convert old array format to new object format
// POST /migrate/convert-old-format
// Converts any remaining hdePointage arrays to the new DD-MM-YYYY object format
// Response: { success, convertedCount, skippedCount }
// -------------------------------------------
app.post("/migrate/convert-old-format", (req, res) => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    const employes = data.employes || [];

    let convertedCount = 0;
    let skippedCount = 0;

    employes.forEach((emp) => {
      if (Array.isArray(emp.hdePointage)) {
        // Old format detected - convert array to object
        const newFormat = {};

        emp.hdePointage.forEach((record) => {
          // record.date is in DD/MM/YYYY format
          const dateKey = record.date.replace(/\//g, "-");

          // Only keep if not already exists (avoid duplicates)
          if (!newFormat[dateKey]) {
            newFormat[dateKey] = {
              entrer: record.entrer || "",
              sorti: record.sorti || "",
              heureTravailer: record.heureTravailer || 0,
              modifiedOn: record.modifiedOn || "",
            };
          }
        });

        emp.hdePointage = newFormat;
        convertedCount++;
      } else if (typeof emp.hdePointage === "object" && emp.hdePointage) {
        // Already in new format
        skippedCount++;
      }
    });

    // Save converted data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({
      success: true,
      message: `Migration complete: ${convertedCount} converted, ${skippedCount} already in new format`,
      convertedCount,
      skippedCount,
    });
  } catch (err) {
    console.error("Error in POST /migrate/convert-old-format:", err);
    res.status(500).json({
      success: false,
      message: "Server error during migration",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Complete hdePointage Reset (Nuclear Option)
// POST /migrate/reset-all-pointage
// WARNING: This will delete ALL pointage history and start fresh
// Response: { success, resetCount }
// -------------------------------------------
app.post("/migrate/reset-all-pointage", (req, res) => {
  try {
    const db = getDB();
    const employees = db.employees || [];

    let resetCount = 0;

    employees.forEach((emp) => {
      // Remove legacy flags
      delete emp.estEntrer;
      delete emp.estSorti;

      // Reset hdePointage to empty object
      emp.hdePointage = {};

      resetCount++;
    });

    saveDB(db);

    res.json({
      success: true,
      message: `Réinitialisation complète: ${resetCount} employés remis à zéro`,
      resetCount,
    });
  } catch (err) {
    console.error("Error in POST /migrate/reset-all-pointage:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la réinitialisation",
      error: err.message,
    });
  }
});

// -------------------------------------------
// ENDPOINT: Migrate hourly employees to array format
// POST /migrate/hourly-to-array
// Converts hourly employees' hdePointage from object to array format
// Response: { success, migratedCount, skippedCount, employeesMigrated }
// -------------------------------------------
app.post("/migrate/hourly-to-array", (req, res) => {
  try {
    const db = getDB();
    const employees = db.employees || [];

    let migratedCount = 0;
    let skippedCount = 0;
    const employeesMigrated = [];

    employees.forEach((emp) => {
      // Only process hourly employees
      if (
        emp.payType === "hourly" &&
        emp.hdePointage &&
        typeof emp.hdePointage === "object"
      ) {
        let employeeMigrated = false;

        // Check each date entry
        Object.keys(emp.hdePointage).forEach((dateKey) => {
          const entry = emp.hdePointage[dateKey];

          // If it's an object with entrer/sorti (old format), convert to array
          if (entry && !Array.isArray(entry) && entry.entrer !== undefined) {
            emp.hdePointage[dateKey] = [entry];
            employeeMigrated = true;
          }
        });

        if (employeeMigrated) {
          migratedCount++;
          employeesMigrated.push({ id: emp.id, name: emp.name });
        } else {
          skippedCount++;
        }
      }
    });

    if (migratedCount > 0) {
      saveDB(db);
    }

    res.json({
      success: true,
      message: `Migration complete: ${migratedCount} hourly employees migrated, ${skippedCount} already in array format`,
      migratedCount,
      skippedCount,
      employeesMigrated,
    });
  } catch (err) {
    console.error("Error in POST /migrate/hourly-to-array:", err);
    res.status(500).json({
      success: false,
      message: "Server error during migration",
      error: err.message,
    });
  }
});
