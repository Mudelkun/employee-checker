const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");

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
          password: "1234"
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("Migration: Added pointageLogin credentials to database");
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
