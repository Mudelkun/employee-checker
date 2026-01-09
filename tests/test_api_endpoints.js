const http = require("http");

const SERVER_URL = "http://localhost:3000";

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testHourlyMultipleCheckIns() {
  console.log("=== Testing Hourly Employee Multiple Check-ins ===\n");

  try {
    // First, get Haiti time
    const timeRes = await makeRequest("GET", "/haiti-time");
    const currentTime = timeRes.data.hour;
    console.log(`Current Haiti time: ${currentTime}\n`);

    // Find a test hourly employee
    const empRes = await makeRequest("GET", "/employees");
    const hourlyEmp = empRes.data.find((e) => e.payType === "hourly");

    if (!hourlyEmp) {
      console.log("No hourly employee found. Creating one for testing...");
      // Would need to create one via API, but for now we'll use existing
      return;
    }

    console.log(`Testing with hourly employee: ${hourlyEmp.name} (ID: ${hourlyEmp.id})\n`);

    // Test 1: First check-in
    console.log("TEST 1: First check-in");
    const checkin1 = await makeRequest("POST", "/pointage/entrant", {
      employeeId: hourlyEmp.id,
      submittedTime: currentTime,
    });

    if (checkin1.data.success) {
      console.log("✅ First check-in successful");
      console.log(`   Message: ${checkin1.data.message}\n`);
    } else {
      console.log("❌ First check-in failed (might already be checked in)");
      console.log(`   Message: ${checkin1.data.message}\n`);
    }

    // Test 2: Try to check-in again (should fail - need to checkout first)
    console.log("TEST 2: Second check-in without checkout (should fail)");
    const checkin2 = await makeRequest("POST", "/pointage/entrant", {
      employeeId: hourlyEmp.id,
      submittedTime: currentTime,
    });

    if (!checkin2.data.success) {
      console.log("✅ Second check-in blocked as expected");
      console.log(`   Message: ${checkin2.data.message}\n`);
    } else {
      console.log("❌ Second check-in should have been blocked!");
      console.log(`   Message: ${checkin2.data.message}\n`);
    }

    // Test 3: Get unclosed shifts
    console.log("TEST 3: Get unclosed shifts");
    const unclosed = await makeRequest(
      "GET",
      `/pointage/unclosed/${hourlyEmp.id}`
    );

    if (unclosed.data.success && unclosed.data.unclosedShifts.length > 0) {
      console.log(`✅ Found ${unclosed.data.unclosedShifts.length} unclosed shift(s)`);
      console.log(`   Details:`, unclosed.data.unclosedShifts[0]);
      console.log();
    } else {
      console.log("No unclosed shifts found\n");
    }

    // Test 4: Check-out
    if (unclosed.data.unclosedShifts && unclosed.data.unclosedShifts.length > 0) {
      console.log("TEST 4: Check-out from first shift");
      const dateKey = unclosed.data.unclosedShifts[0].dateKey;
      const checkout1 = await makeRequest("POST", "/pointage/sortant", {
        employeeId: hourlyEmp.id,
        dateKey: dateKey,
        submittedTime: currentTime,
      });

      if (checkout1.data.success) {
        console.log("✅ First check-out successful");
        console.log(`   Message: ${checkout1.data.message}`);
        console.log(`   Hours worked: ${checkout1.data.hoursWorked}\n`);
      } else {
        console.log("❌ First check-out failed");
        console.log(`   Message: ${checkout1.data.message}\n`);
      }

      // Test 5: Second check-in (should now work)
      console.log("TEST 5: Second check-in after checkout (should work)");
      const checkin3 = await makeRequest("POST", "/pointage/entrant", {
        employeeId: hourlyEmp.id,
        submittedTime: currentTime,
      });

      if (checkin3.data.success) {
        console.log("✅ Second check-in successful");
        console.log(`   Message: ${checkin3.data.message}\n`);
      } else {
        console.log("❌ Second check-in failed");
        console.log(`   Message: ${checkin3.data.message}\n`);
      }

      // Clean up - check out the second shift
      const unclosed2 = await makeRequest(
        "GET",
        `/pointage/unclosed/${hourlyEmp.id}`
      );
      if (unclosed2.data.unclosedShifts && unclosed2.data.unclosedShifts.length > 0) {
        const dateKey2 = unclosed2.data.unclosedShifts[0].dateKey;
        await makeRequest("POST", "/pointage/sortant", {
          employeeId: hourlyEmp.id,
          dateKey: dateKey2,
          submittedTime: currentTime,
        });
        console.log("Cleaned up - checked out from second shift\n");
      }
    }

    // Test monthly employee (should still have single check-in)
    console.log("\n=== Testing Monthly Employee (Single Check-in) ===\n");
    const monthlyEmp = empRes.data.find((e) => e.payType === "monthly");

    if (monthlyEmp) {
      console.log(`Testing with monthly employee: ${monthlyEmp.name} (ID: ${monthlyEmp.id})\n`);

      // Check if already checked in
      const unclosedMonthly = await makeRequest(
        "GET",
        `/pointage/unclosed/${monthlyEmp.id}`
      );

      if (unclosedMonthly.data.unclosedShifts && unclosedMonthly.data.unclosedShifts.length > 0) {
        console.log("Monthly employee already checked in. Checking out first...");
        const dateKey = unclosedMonthly.data.unclosedShifts[0].dateKey;
        await makeRequest("POST", "/pointage/sortant", {
          employeeId: monthlyEmp.id,
          dateKey: dateKey,
          submittedTime: currentTime,
        });
      }

      console.log("TEST 6: Monthly employee check-in");
      const monthlyCheckin = await makeRequest("POST", "/pointage/entrant", {
        employeeId: monthlyEmp.id,
        submittedTime: currentTime,
      });

      if (monthlyCheckin.data.success) {
        console.log("✅ Monthly employee check-in successful");
        console.log(`   Message: ${monthlyCheckin.data.message}\n`);

        // Try second check-in (should fail)
        console.log("TEST 7: Monthly employee second check-in (should fail)");
        const monthlyCheckin2 = await makeRequest("POST", "/pointage/entrant", {
          employeeId: monthlyEmp.id,
          submittedTime: currentTime,
        });

        if (!monthlyCheckin2.data.success) {
          console.log("✅ Second check-in blocked for monthly employee as expected");
          console.log(`   Message: ${monthlyCheckin2.data.message}\n`);
        } else {
          console.log("❌ Monthly employee should only check in once!");
        }

        // Clean up
        const unclosedMonthly2 = await makeRequest(
          "GET",
          `/pointage/unclosed/${monthlyEmp.id}`
        );
        if (unclosedMonthly2.data.unclosedShifts && unclosedMonthly2.data.unclosedShifts.length > 0) {
          const dateKey = unclosedMonthly2.data.unclosedShifts[0].dateKey;
          await makeRequest("POST", "/pointage/sortant", {
            employeeId: monthlyEmp.id,
            dateKey: dateKey,
            submittedTime: currentTime,
          });
          console.log("Cleaned up - checked out monthly employee\n");
        }
      } else {
        console.log("Monthly employee check-in failed");
        console.log(`   Message: ${monthlyCheckin.data.message}\n`);
      }
    }

    console.log("\n=== All Tests Completed ===");
  } catch (error) {
    console.error("Test error:", error);
  }
}

testHourlyMultipleCheckIns();
