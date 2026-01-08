const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "employees.json");
const TIMEZONE = "America/Port-au-Prince";
const TEST_ID = "TEST_CROSSDAY_001";

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
  console.log("Starting cross-day pointage test...");
  const original = fs.readFileSync(DATA_FILE, "utf8");
  try {
    let db = JSON.parse(original);
    db.employees = db.employees || [];

    // Remove any existing test employee
    db.employees = db.employees.filter((e) => String(e.id) !== TEST_ID);

    const now = new Date();
    const day1 = formatDateLocal(now, TIMEZONE);
    const day2 = formatDateLocal(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIMEZONE);

    const testEmp = {
      id: TEST_ID,
      name: "CrossDay Test",
      role: "Tester",
      details: "Cross-day test employee",
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

    // Simulate day1 entrant only (no sortie)
    db = readDB();
    const emp = db.employees.find((e) => String(e.id) === TEST_ID);
    emp.hdePointage.push({ date: day1, entrer: "9:00 AM", sorti: "" });
    emp.estEntrer = true;
    emp.estSorti = false;
    writeDB(db);
    console.log(`Day1 entrant recorded for ${day1}`);

    // Now simulate day2 checks: there should be no entry for day2
    db = readDB();
    const emp2 = db.employees.find((e) => String(e.id) === TEST_ID);
    const entryDay2 = emp2.hdePointage.find((h) => h.date === day2);
    if (entryDay2) {
      throw new Error("Unexpected entry for day2 before any action");
    }
    console.log("No entry for day2 as expected — entrant should be allowed.");

    // Simulate day2 entrant (user arrives next day)
    emp2.hdePointage.push({ date: day2, entrer: "8:45 AM", sorti: "" });
    emp2.estEntrer = true;
    emp2.estSorti = false;
    writeDB(db);
    console.log("Day2 entrant recorded — entrant accepted.");

    // Now simulate day2 sortant after entrant
    db = readDB();
    const emp3 = db.employees.find((e) => String(e.id) === TEST_ID);
    const rec = emp3.hdePointage.find((h) => h.date === day2);
    if (!rec) throw new Error("Day2 entry not found when attempting sortie");
    rec.sorti = "5:00 PM";
    rec.heureTravailer = computeHours(rec.entrer, rec.sorti);
    emp3.estSorti = !!(rec.sorti && rec.sorti.trim() !== "");
    emp3.estEntrer = !emp3.estSorti;
    writeDB(db);
    console.log("Day2 sortie recorded and hours computed.");

    // Verify final state
    const finalDB = readDB();
    const finalEmp = finalDB.employees.find((e) => String(e.id) === TEST_ID);
    const finalRec = finalEmp.hdePointage.find((h) => h.date === day2);

    console.log("Final day2 record:", finalRec);
    console.log("Final flags: estEntrer=", finalEmp.estEntrer, "estSorti=", finalEmp.estSorti);

    const sortieMatches = finalRec.sorti === "5:00 PM";
    const flagMatches = finalEmp.estSorti === true && finalEmp.estEntrer === false;
    const hoursMatches = finalRec.heureTravailer === 8.25 || finalRec.heureTravailer === 8.25; // 8:45 -> 20:00 = 8.25

    if (sortieMatches && flagMatches && hoursMatches) {
      console.log("TEST PASSED: cross-day entrant and sortie behavior OK.");
    } else {
      console.error("TEST FAILED: mismatch detected.");
      if (!sortieMatches) console.error(" - sortie string not set to 5:00 PM");
      if (!flagMatches) console.error(" - flags incorrect: ", finalEmp.estEntrer, finalEmp.estSorti);
      if (!hoursMatches) console.error(" - heureTravailer mismatch: ", finalRec.heureTravailer);
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    // Restore original file
    fs.writeFileSync(DATA_FILE, original);
    console.log("Restored original employees.json");
  }
})();
