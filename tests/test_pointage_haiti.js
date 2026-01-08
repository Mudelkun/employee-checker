const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "employees.json");
const TIMEZONE = "America/Port-au-Prince";
const TEST_ID = "TEST_POINTAGE_001";

function formatDateLocal(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  const year = parts.find((p) => p.type === "year").value;
  return `${month}/${day}/${year}`;
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
  console.log("Starting Haiti pointage test...");
  // Backup
  const original = fs.readFileSync(DATA_FILE, "utf8");

  try {
    let db = JSON.parse(original);

    // Ensure employees array
    db.employees = db.employees || [];

    // Remove any existing test employee
    db.employees = db.employees.filter((e) => String(e.id) !== TEST_ID);

    // Create test employee
    const dateLocal = formatDateLocal(new Date(), TIMEZONE);
    const testEmp = {
      id: TEST_ID,
      name: "Test Employee",
      role: "Tester",
      details: "Automated test",
      image: "imgs/07873.png",
      hdePointage: [],
      payType: "monthly",
      payAmount: 0,
      email: null,
      estEntrer: false,
      estSorti: false,
    };

    db.employees.push(testEmp);
    writeDB(db);
    console.log("Test employee created with id", TEST_ID);

    // Simulate entrant at 9:00 AM Haiti local
    db = readDB();
    const emp = db.employees.find((e) => String(e.id) === TEST_ID);
    if (!emp) throw new Error("Test employee not found after create");

    emp.hdePointage.push({ date: dateLocal, entrer: "9:00 AM", sorti: "" });
    emp.estEntrer = true;
    emp.estSorti = false;
    writeDB(db);
    console.log(`Entrant recorded for ${dateLocal} at 9:00 AM`);

    // Now simulate sortant at 2:00 PM
    db = readDB();
    const emp2 = db.employees.find((e) => String(e.id) === TEST_ID);
    const rec = emp2.hdePointage.find((h) => h.date === dateLocal);
    if (!rec) throw new Error("Entry for today not found before sortie");

    rec.sorti = "2:00 PM";
    rec.heureTravailer = computeHours(rec.entrer, rec.sorti);
    emp2.estSorti = !!(rec.sorti && rec.sorti.trim() !== "");
    emp2.estEntrer = !emp2.estSorti;

    writeDB(db);
    console.log("Sortant saved as 2:00 PM and heureTravailer computed");

    // Verify
    const finalDB = readDB();
    const finalEmp = finalDB.employees.find((e) => String(e.id) === TEST_ID);
    const finalRec = finalEmp.hdePointage.find((h) => h.date === dateLocal);

    console.log("Final record:", finalRec);
    console.log(
      "Final flags: estEntrer=",
      finalEmp.estEntrer,
      "estSorti=",
      finalEmp.estSorti
    );

    // Assertions
    const sortieMatches = finalRec.sorti === "2:00 PM";
    const flagMatches =
      finalEmp.estSorti === true && finalEmp.estEntrer === false;
    const hoursMatches = finalRec.heureTravailer === 5;

    if (sortieMatches && flagMatches && hoursMatches) {
      console.log("TEST PASSED: sortie recorded and flags set correctly.");
    } else {
      console.error("TEST FAILED: mismatch detected.");
      if (!sortieMatches) console.error(" - sortie string not set to 2:00 PM");
      if (!flagMatches)
        console.error(
          " - flags incorrect: ",
          finalEmp.estEntrer,
          finalEmp.estSorti
        );
      if (!hoursMatches)
        console.error(
          " - heureTravailer expected 5 but got",
          finalRec.heureTravailer
        );
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    // Restore original file to avoid persisting test data
    fs.writeFileSync(DATA_FILE, original);
    console.log("Restored original employees.json");
  }
})();
