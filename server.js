const express = require("express");
const fs = require("fs");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
// Increase payload limit to handle base64 images
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// Serve your frontend
app.use(express.static("public"));

// ----------- HELPER: Load database safely -----------
function getDB() {
  try {
    const raw = fs.readFileSync("employees.json", "utf8");
    const parsed = JSON.parse(raw);

    // Ensure correct structure
    if (!parsed || !Array.isArray(parsed.employees)) {
      return { employees: [] };
    }

    return parsed;
  } catch (err) {
    console.error("Error reading employees.json:", err);
    return { employees: [] };
  }
}

// ----------- HELPER: Save database safely -----------
function saveDB(data) {
  fs.writeFileSync("employees.json", JSON.stringify(data, null, 2));
}

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
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
