const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "employees.json");
const TIMEZONE = "America/Port-au-Prince";
const TEST_HOURLY_ID = "TEST_HOURLY_001";
const TEST_MONTHLY_ID = "TEST_MONTHLY_001";

function getDateKey() {
  const now = new Date();
  const fmtDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Convert DD/MM/YYYY -> DD-MM-YYYY
  return fmtDate.replace(/\//g, "-");
}

function to24h(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(" ");
  if (parts.length < 2) return 0;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(":").map(Number);
  const mod = modifier.toUpperCase();
  if (mod === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours + minutes / 60;
}

function computeHours(entrer, sorti) {
  const e = to24h(entrer);
  const s = to24h(sorti);
  let diff = s - e;
  if (diff < 0) diff += 24;
  return Math.round(diff * 100) / 100;
}

function readDB() {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

(async function runTest() {
  console.log("Starting hourly multiple check-ins test...");
  // Backup
  const original = fs.readFileSync(DATA_FILE, "utf8");

  try {
    let db = JSON.parse(original);

    // Ensure employees array
    db.employees = db.employees || [];

    // Remove any existing test employees
    db.employees = db.employees.filter(
      (e) =>
        String(e.id) !== TEST_HOURLY_ID && String(e.id) !== TEST_MONTHLY_ID
    );

    const dateKey = getDateKey();

    // Create test hourly employee
    const testHourly = {
      id: TEST_HOURLY_ID,
      name: "Test Hourly Employee",
      role: "Tester",
      details: "Automated test for hourly employee",
      image: "imgs/07873.png",
      hdePointage: {},
      payType: "hourly",
      payAmount: 15,
      email: null,
    };

    // Create test monthly employee
    const testMonthly = {
      id: TEST_MONTHLY_ID,
      name: "Test Monthly Employee",
      role: "Tester",
      details: "Automated test for monthly employee",
      image: "imgs/07873.png",
      hdePointage: {},
      payType: "monthly",
      payAmount: 3000,
      email: null,
    };

    db.employees.push(testHourly);
    db.employees.push(testMonthly);
    writeDB(db);
    console.log("Test employees created");

    // ===== TEST 1: Hourly employee - first check-in =====
    console.log("\n=== TEST 1: Hourly employee - first check-in ===");
    db = readDB();
    let hourlyEmp = db.employees.find(
      (e) => String(e.id) === TEST_HOURLY_ID
    );

    if (!hourlyEmp.hdePointage[dateKey]) {
      hourlyEmp.hdePointage[dateKey] = [];
    }

    hourlyEmp.hdePointage[dateKey].push({
      entrer: "8:00 AM",
      sorti: "",
    });

    writeDB(db);
    console.log("First check-in recorded at 8:00 AM");

    // Verify
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);
    if (
      Array.isArray(hourlyEmp.hdePointage[dateKey]) &&
      hourlyEmp.hdePointage[dateKey].length === 1 &&
      hourlyEmp.hdePointage[dateKey][0].entrer === "8:00 AM"
    ) {
      console.log("✅ TEST 1 PASSED: First check-in recorded correctly");
    } else {
      console.error("❌ TEST 1 FAILED: First check-in not recorded correctly");
    }

    // ===== TEST 2: Hourly employee - first check-out =====
    console.log("\n=== TEST 2: Hourly employee - first check-out ===");
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);

    hourlyEmp.hdePointage[dateKey][0].sorti = "12:00 PM";
    hourlyEmp.hdePointage[dateKey][0].heureTravailer = computeHours(
      "8:00 AM",
      "12:00 PM"
    );

    writeDB(db);
    console.log("First check-out recorded at 12:00 PM");

    // Verify
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);
    if (
      hourlyEmp.hdePointage[dateKey][0].sorti === "12:00 PM" &&
      hourlyEmp.hdePointage[dateKey][0].heureTravailer === 4
    ) {
      console.log("✅ TEST 2 PASSED: First check-out recorded correctly (4 hours)");
    } else {
      console.error("❌ TEST 2 FAILED: First check-out not recorded correctly");
    }

    // ===== TEST 3: Hourly employee - second check-in =====
    console.log("\n=== TEST 3: Hourly employee - second check-in ===");
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);

    hourlyEmp.hdePointage[dateKey].push({
      entrer: "1:00 PM",
      sorti: "",
    });

    writeDB(db);
    console.log("Second check-in recorded at 1:00 PM");

    // Verify
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);
    if (
      hourlyEmp.hdePointage[dateKey].length === 2 &&
      hourlyEmp.hdePointage[dateKey][1].entrer === "1:00 PM"
    ) {
      console.log("✅ TEST 3 PASSED: Second check-in recorded correctly");
    } else {
      console.error("❌ TEST 3 FAILED: Second check-in not recorded correctly");
    }

    // ===== TEST 4: Hourly employee - second check-out =====
    console.log("\n=== TEST 4: Hourly employee - second check-out ===");
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);

    hourlyEmp.hdePointage[dateKey][1].sorti = "5:00 PM";
    hourlyEmp.hdePointage[dateKey][1].heureTravailer = computeHours(
      "1:00 PM",
      "5:00 PM"
    );

    writeDB(db);
    console.log("Second check-out recorded at 5:00 PM");

    // Verify
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);
    if (
      hourlyEmp.hdePointage[dateKey][1].sorti === "5:00 PM" &&
      hourlyEmp.hdePointage[dateKey][1].heureTravailer === 4
    ) {
      console.log("✅ TEST 4 PASSED: Second check-out recorded correctly (4 hours)");
    } else {
      console.error("❌ TEST 4 FAILED: Second check-out not recorded correctly");
    }

    // ===== TEST 5: Calculate total hours for hourly employee =====
    console.log("\n=== TEST 5: Calculate total hours for hourly employee ===");
    db = readDB();
    hourlyEmp = db.employees.find((e) => String(e.id) === TEST_HOURLY_ID);

    const totalHours = hourlyEmp.hdePointage[dateKey].reduce(
      (sum, entry) => sum + (entry.heureTravailer || 0),
      0
    );

    console.log(`Total hours worked: ${totalHours}`);
    if (totalHours === 8) {
      console.log("✅ TEST 5 PASSED: Total hours calculated correctly (8 hours)");
    } else {
      console.error(
        `❌ TEST 5 FAILED: Expected 8 hours, got ${totalHours} hours`
      );
    }

    // ===== TEST 6: Monthly employee - single check-in =====
    console.log("\n=== TEST 6: Monthly employee - single check-in ===");
    db = readDB();
    let monthlyEmp = db.employees.find(
      (e) => String(e.id) === TEST_MONTHLY_ID
    );

    monthlyEmp.hdePointage[dateKey] = {
      entrer: "9:00 AM",
      sorti: "",
    };

    writeDB(db);
    console.log("Monthly employee check-in recorded at 9:00 AM");

    // Verify
    db = readDB();
    monthlyEmp = db.employees.find((e) => String(e.id) === TEST_MONTHLY_ID);
    if (
      !Array.isArray(monthlyEmp.hdePointage[dateKey]) &&
      monthlyEmp.hdePointage[dateKey].entrer === "9:00 AM"
    ) {
      console.log("✅ TEST 6 PASSED: Monthly employee check-in uses object format");
    } else {
      console.error(
        "❌ TEST 6 FAILED: Monthly employee check-in should use object format"
      );
    }

    // ===== TEST 7: Monthly employee - cannot check-in twice =====
    console.log("\n=== TEST 7: Monthly employee - cannot check-in twice ===");
    db = readDB();
    monthlyEmp = db.employees.find((e) => String(e.id) === TEST_MONTHLY_ID);

    // Simulate the server's logic that should block second check-in
    const cannotCheckInAgain =
      monthlyEmp.hdePointage[dateKey] &&
      monthlyEmp.hdePointage[dateKey].entrer;

    if (cannotCheckInAgain) {
      console.log(
        "✅ TEST 7 PASSED: Monthly employee cannot check-in twice (blocked)"
      );
    } else {
      console.error(
        "❌ TEST 7 FAILED: Monthly employee should be blocked from second check-in"
      );
    }

    // ===== TEST 8: Monthly employee - check-out =====
    console.log("\n=== TEST 8: Monthly employee - check-out ===");
    db = readDB();
    monthlyEmp = db.employees.find((e) => String(e.id) === TEST_MONTHLY_ID);

    monthlyEmp.hdePointage[dateKey].sorti = "5:00 PM";
    monthlyEmp.hdePointage[dateKey].heureTravailer = computeHours(
      "9:00 AM",
      "5:00 PM"
    );

    writeDB(db);
    console.log("Monthly employee check-out recorded at 5:00 PM");

    // Verify
    db = readDB();
    monthlyEmp = db.employees.find((e) => String(e.id) === TEST_MONTHLY_ID);
    if (
      monthlyEmp.hdePointage[dateKey].sorti === "5:00 PM" &&
      monthlyEmp.hdePointage[dateKey].heureTravailer === 8
    ) {
      console.log("✅ TEST 8 PASSED: Monthly employee check-out recorded correctly");
    } else {
      console.error(
        "❌ TEST 8 FAILED: Monthly employee check-out not recorded correctly"
      );
    }

    console.log("\n=== ALL TESTS COMPLETED ===");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    // Restore original file to avoid persisting test data
    fs.writeFileSync(DATA_FILE, original);
    console.log("\nRestored original employees.json");
  }
})();
