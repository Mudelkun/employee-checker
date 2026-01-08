/**
 * MIGRATION: Convert hdePointage from array to date-keyed object format
 *
 * OLD FORMAT:
 *   hdePointage: [
 *     { date: "12/12/2025", entrer: "8:00 AM", sorti: "4:30 PM", heureTravailer: 8.5 },
 *     { date: "12/12/2025", entrer: "4:30 PM", sorti: "", heureTravailer: 0 }  // duplicate!
 *   ]
 *
 * NEW FORMAT:
 *   hdePointage: {
 *     "12-12-2025": { entrer: "8:00 AM", sorti: "4:30 PM", heureTravailer: 8.5 }
 *   }
 *
 * RULES:
 * - If multiple entries exist for the same date, keep the FIRST entry with entrer time
 * - Mark any unclosed shifts (empty sorti) with a flag for admin review
 * - Preserve modifiedOn field if it exists
 * - Convert date format from DD/MM/YYYY to DD-MM-YYYY for use as object key
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../employees.json");
const BACKUP_FILE = path.join(
  __dirname,
  "../employees.json.pre-migration-backup"
);

function migrateHdePointage() {
  try {
    // 1. Read the current data
    if (!fs.existsSync(DATA_FILE)) {
      console.error(`❌ File not found: ${DATA_FILE}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);

    if (!data.employees || !Array.isArray(data.employees)) {
      console.error("❌ employees.json does not have valid employees array");
      process.exit(1);
    }

    // 2. Create backup
    fs.writeFileSync(BACKUP_FILE, raw);
    console.log(`✅ Backup created: ${BACKUP_FILE}`);

    // 3. Migrate each employee
    let totalRecords = 0;
    let unclosedRecords = 0;
    let duplicatesRemoved = 0;

    data.employees.forEach((emp, empIndex) => {
      if (!Array.isArray(emp.hdePointage)) {
        // If already migrated or empty, skip
        if (
          typeof emp.hdePointage === "object" &&
          !Array.isArray(emp.hdePointage)
        ) {
          console.log(`⏭️  Employee ${emp.id} already migrated, skipping`);
          return;
        }
        emp.hdePointage = {};
        return;
      }

      const oldArray = emp.hdePointage;
      const newObject = {};
      const seenDates = new Set();

      oldArray.forEach((record) => {
        totalRecords++;

        // Convert date format DD/MM/YYYY -> DD-MM-YYYY for key
        const dateKey = record.date.replace(/\//g, "-");

        // If we already have an entry for this date, skip duplicates
        if (seenDates.has(dateKey)) {
          console.log(
            `  ⚠️  [${emp.id}] Duplicate entry for ${dateKey} removed`
          );
          duplicatesRemoved++;
          return;
        }

        seenDates.add(dateKey);

        // Create new record structure
        const newRecord = {
          entrer: record.entrer || "",
          sorti: record.sorti || "",
        };

        // Preserve heureTravailer if it exists
        if (record.heureTravailer !== undefined) {
          newRecord.heureTravailer = record.heureTravailer;
        }

        // Preserve modifiedOn if it exists (admin edited this record)
        if (record.modifiedOn) {
          newRecord.modifiedOn = record.modifiedOn;
        }

        // Flag unclosed shifts for admin review
        if (newRecord.entrer && !newRecord.sorti) {
          newRecord.pendingAdminReview = true;
          unclosedRecords++;
          console.log(
            `  📋 [${emp.id}] Unclosed shift ${dateKey} - needs admin review`
          );
        }

        newObject[dateKey] = newRecord;
      });

      // Replace array with object
      emp.hdePointage = newObject;
      console.log(
        `✅ Employee ${emp.id} (${emp.name}): ${oldArray.length} records → ${
          Object.keys(newObject).length
        } records`
      );
    });

    // 4. Save migrated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`\n✅ Migration completed!`);
    console.log(`   Total records processed: ${totalRecords}`);
    console.log(`   Duplicate entries removed: ${duplicatesRemoved}`);
    console.log(
      `   Unclosed shifts flagged for admin review: ${unclosedRecords}`
    );
    console.log(`   Migrated file saved: ${DATA_FILE}`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  migrateHdePointage();
}

module.exports = { migrateHdePointage };
