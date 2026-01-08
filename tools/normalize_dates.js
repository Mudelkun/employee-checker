const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "employees.json");
const backupPath = path.join(__dirname, "..", `employees.json.bak`);

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function parseDateToParts(s) {
  // Accept various formats: M/D/YYYY, MM/DD/YYYY, D/M/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  if (!s || typeof s !== "string") return null;
  // If contains comma (modifiedOn), split off the date part
  const main = s.split(",")[0].trim();

  // Try ISO YYYY-MM-DD
  const iso = main.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { day: iso[3], month: iso[2], year: iso[1] };

  // Try D/M/Y or M/D/Y with separators / or -
  const parts = main.split(/\D+/).filter(Boolean);
  if (parts.length === 3) {
    let a = parseInt(parts[0], 10),
      b = parseInt(parts[1], 10),
      c = parseInt(parts[2], 10);
    // Heuristic: if first part > 12 it's day (DD/MM/YYYY)
    if (a > 12) {
      return { day: pad(a), month: pad(b), year: String(c) };
    }
    // if third part is 4 digits, it's year
    if (String(c).length === 4) {
      // ambiguous between MM/DD/YYYY and DD/MM/YYYY. We will prefer DD/MM/YYYY (French) if day seems plausible
      // If b>12 then b is day and a is month
      if (b > 12) {
        return { day: pad(b), month: pad(a), year: String(c) };
      }
      // Otherwise, we assume original was MM/DD/YYYY in many entries; but requirement is to convert to DD/MM/YYYY
      // We'll treat parts as month/day/year and swap to day/month/year if the month <=12 and day <=31
      return { day: pad(b), month: pad(a), year: String(c) };
    }
  }
  return null;
}

function formatDDMMYYYY(p) {
  if (!p) return null;
  return `${pad(Number(p.day))}/${pad(Number(p.month))}/${p.year}`;
}

function normalize() {
  if (!fs.existsSync(filePath)) {
    console.error("employees.json not found at", filePath);
    process.exit(1);
  }

  // backup
  fs.copyFileSync(filePath, backupPath);
  console.log("Backup written to", backupPath);

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  if (Array.isArray(data.employees)) {
    data.employees.forEach((emp) => {
      if (Array.isArray(emp.hdePointage)) {
        emp.hdePointage.forEach((entry) => {
          if (entry.date) {
            const p = parseDateToParts(entry.date);
            if (p) {
              entry.date = formatDDMMYYYY(p);
            }
          }
          if (entry.modifiedOn) {
            // modifiedOn may be like "1/6/2026, 4:30:48 PM" - convert date part
            const parts = entry.modifiedOn.split(",");
            const p = parseDateToParts(parts[0]);
            if (p) {
              parts[0] = formatDDMMYYYY(p);
              entry.modifiedOn = parts.join(",").trim();
            }
          }
        });
      }
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log("employees.json normalized to DD/MM/YYYY");
}

normalize();
