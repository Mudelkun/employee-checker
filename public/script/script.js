let employes = [];

// ---------------------------------------------
// DISPLAY CURRENT TIME IN HEADER
// ---------------------------------------------
// Server-based Haiti time sync
let __haiti_server_ts = null; // epoch ms from server representing the moment when we last fetched
let __haiti_client_ts = null; // client Date.now() captured at the same moment

async function fetchHaitiTimeOnce() {
  const res = await fetch("/haiti-time");
  if (!res.ok) throw new Error("Failed to fetch /haiti-time");
  const data = await res.json();
  // data.ts is epoch ms for the instant
  __haiti_server_ts = data.ts;
  __haiti_client_ts = Date.now();
  return data;
}

// Returns a Haiti-time snapshot. If we already fetched, returns a computed snapshot
// using the stored epoch and the client's elapsed time so we don't fetch every second.
async function getHaitiTime() {
  if (!__haiti_server_ts) {
    return await fetchHaitiTimeOnce();
  }

  const elapsed = Date.now() - __haiti_client_ts;
  const currentTs = __haiti_server_ts + elapsed;

  const TZ = "America/Port-au-Prince";
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(currentTs));

  const hour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(currentTs));

  return { ts: currentTs, date, hour, tz: TZ };
}

// Update time immediately and then every second (use server-backed time)
(async () => {
  const timeElement = document.getElementById("current-time");
  try {
    await fetchHaitiTimeOnce();
  } catch (e) {
    // fallback: still allow client-side time if server is not reachable
    __haiti_server_ts = null;
  }

  function renderHeaderTime() {
    if (!timeElement) return;
    getHaitiTime()
      .then((h) => {
        // Format using fr-FR and show hh:mm
        const ts = h.ts;
        const timeString = new Intl.DateTimeFormat("fr-FR", {
          timeZone: "America/Port-au-Prince",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date(ts));
        timeElement.textContent = timeString;
      })
      .catch(() => {
        timeElement.textContent = "--:--";
      });
  }

  renderHeaderTime();
  setInterval(renderHeaderTime, 1000);
})();

// ---------------------------------------------
// LOAD EMPLOYEES FROM JSON VIA SERVER
// ---------------------------------------------
async function loadEmployees() {
  const res = await fetch("/employees");
  employes = await res.json();
}

loadEmployees();

// Update local cache when data-monitor dispatches updates
window.addEventListener("employees:updated", (e) => {
  try {
    employes = e.detail.employees || [];
    console.log("script.js: employes updated", employes.length);
  } catch (err) {
    console.error("Error handling employees:updated in script.js", err);
  }
});

// ---------------------------------------------
// UI Elements
// ---------------------------------------------
const inputField = document.querySelector(".input-element-style");
const buttons = document.querySelectorAll(".button-container button");
const pEntrant = document.getElementById("entrant");
const pSortant = document.getElementById("sortant");
const message = document.getElementById("message");
const showId = document.querySelector(".show-id");

// Reset input field every 2 minutes
setInterval(() => {
  inputField.value = "";
}, 2 * 60 * 1000); // 2 minutes in milliseconds

// ---------------------------------------------
// Message Display
// ---------------------------------------------
function getMessage(msg, color = "black") {
  message.textContent = msg;
  message.style.color = color;
  setTimeout(() => {
    message.textContent = "";
  }, 9000);
}

function playConfirmed() {
  let audio = new Audio("audio/confirmed.mp3");
  return audio.play();
}

// -----------------------------------------------
// HELPER: Convert DD/MM/YYYY to DD-MM-YYYY for date key
// -----------------------------------------------
function getDateKey(ddmmyyyy) {
  return ddmmyyyy.replace(/\//g, "-");
}

// -----------------------------------------------
// PRE-SUBMISSION VALIDATION MODAL
// -----------------------------------------------
function showValidationModal(data) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.6); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;

    // Create modal box
    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white; border-radius: 10px; padding: 30px;
      max-width: 400px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Modal content
    const html = `
      <h2 style="margin-top: 0; color: #333; text-align: center;">Confirmer l'enregistrement</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 10px 0; font-size: 14px;">
          <strong>Employé:</strong> ${data.employeeName}
        </p>
        <p style="margin: 10px 0; font-size: 14px;">
          <strong>Date:</strong> ${data.dateDisplay}
        </p>
        <p style="margin: 10px 0; font-size: 14px;">
          <strong>Heure:</strong> ${data.time}
        </p>
        ${
          data.action === "sortant"
            ? `<p style="margin: 10px 0; font-size: 14px;"><strong>Heures travaillées:</strong> ${data.hoursWorked}h</p>`
            : ""
        }
        ${
          data.unclosedShiftWarning
            ? `<p style="margin: 10px 0; font-size: 12px; color: #e74c3c; font-weight: bold;">
                ⚠️ ${data.unclosedShiftWarning}
              </p>`
            : ""
        }
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="confirm-btn" style="
          padding: 10px 30px; background: #27ae60; color: white;
          border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;
        ">Confirmer</button>
        <button id="cancel-btn" style="
          padding: 10px 30px; background: #95a5a6; color: white;
          border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;
        ">Annuler</button>
      </div>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    modal.querySelector("#confirm-btn").addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    modal.querySelector("#cancel-btn").addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

// -----------------------------------------------
// NEW: Unclosed Shift Handler
// -----------------------------------------------
async function handleUnclosedShift(emp) {
  try {
    const res = await fetch(`/pointage/unclosed/${emp.id}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.unclosedShifts && data.unclosedShifts.length > 0) {
      return data.unclosedShifts[0]; // Return most recent unclosed shift
    }
  } catch (err) {
    console.error("Error checking unclosed shifts:", err);
  }
  return null;
}

// -----------------------------------------------
// NEW: Submit check-in via API
// -----------------------------------------------
async function submitCheckIn(employeeId, submittedTime) {
  try {
    const res = await fetch("/pointage/entrant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        submittedTime,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        message: data.message || "Pointage entrant échoué",
        requiredTime: data.requiredTime,
      };
    }

    return {
      ok: true,
      message: data.message,
      dateKey: data.dateKey,
      pendingAdminReview: data.pendingAdminReview || false,
    };
  } catch (err) {
    console.error("Error submitting check-in:", err);
    return {
      ok: false,
      message: "Erreur réseau lors du pointage entrant",
    };
  }
}

// -----------------------------------------------
// NEW: Submit check-out via API
// -----------------------------------------------
async function submitCheckOut(employeeId, dateKey, submittedTime) {
  try {
    const res = await fetch("/pointage/sortant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        dateKey,
        submittedTime,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        message: data.message || "Pointage sortant échoué",
        requiredTime: data.requiredTime,
      };
    }

    return {
      ok: true,
      message: data.message,
      hoursWorked: data.hoursWorked,
    };
  } catch (err) {
    console.error("Error submitting check-out:", err);
    return {
      ok: false,
      message: "Erreur réseau lors du pointage sortant",
    };
  }
}

// -----------------------------------------------
// Convert Time & Calculate Hours Worked (kept for backward compat with admin panel)
// -----------------------------------------------
function heureTravailer(entrer, sorti) {
  if (!entrer || !sorti) return 0;

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

  const hrEntrant = to24h(entrer);
  const hrSortant = to24h(sorti);
  let diff = hrSortant - hrEntrant;

  if (diff < 0) diff += 24;

  return Math.round(diff * 100) / 100;
}

// ---------------------------------------------
// Keypad buttons
// ---------------------------------------------

showId.addEventListener("click", () => {
  if (inputField.classList.contains("dot")) {
    inputField.classList.remove("dot");
    showId.src = "imgs/hide-password.png";
    return;
  }
  inputField.classList.add("dot");
  showId.src = "imgs/show-password.png";
});

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.textContent.trim();

    if (value === "X") {
      inputField.value = "";
    } else if (value === "<") {
      inputField.value = inputField.value.slice(0, -1);
    } else {
      inputField.value += value;
    }
  });
});

// -----------------------------------------------
// Entrant (Check-In)
// -----------------------------------------------
pEntrant.addEventListener("click", async () => {
  if (inputField.value === "") {
    getMessage("Entrez votre numéro d'employé!", "red");
    return;
  }

  const uInputId = inputField.value.trim();
  const emp = employes.find((emp) => emp.id === uInputId);

  if (!emp) {
    getMessage(`❌ Employé ${uInputId} introuvable!`, "red");
    inputField.value = "";
    return;
  }

  try {
    // Get current Haiti time
    const h = await getHaitiTime();
    const submittedTime = h.hour; // HH:MM AM/PM

    // Check for unclosed shift from previous day
    const unclosedShift = await handleUnclosedShift(emp);

    if (unclosedShift) {
      // Show message about unclosed shift - still proceed with submission
      getMessage(
        `⚠️ ${emp.name} - Shift antérieur détecté (${unclosedShift.dateKey})`,
        "orange"
      );
    }

    // Submit check-in directly without confirmation modal
    const result = await submitCheckIn(uInputId, submittedTime);

    if (result.ok) {
      playConfirmed();
      getMessage(`✅ ${emp.name} - Pointage entrant accepté`, "green");
      inputField.value = "";

      // Refresh employee data from server
      setTimeout(loadEmployees, 500);
    } else {
      if (
        result.message.includes("already checked in") ||
        result.message.includes("already")
      ) {
        getMessage(`❌ ${emp.name} - Déjà pointée arrivée aujourd'hui`, "red");
      } else {
        getMessage(
          `❌ ${emp.name} - ${result.message || "Pointage entrant rejeté"}`,
          "red"
        );
      }
      if (result.requiredTime) {
        getMessage(`⏰ Heure serveur: ${result.requiredTime}`, "orange");
      }
      inputField.value = "";
    }
  } catch (err) {
    console.error("Entrant error:", err);
    getMessage("❌ Erreur lors du pointage entrant", "red");
    inputField.value = "";
  }
});

// -----------------------------------------------
// Sortant (Check-Out)
// -----------------------------------------------
pSortant.addEventListener("click", async () => {
  if (inputField.value === "") {
    getMessage("Entrez votre numéro d'employé!", "red");
    return;
  }

  const uInputId = inputField.value.trim();
  const emp = employes.find((emp) => emp.id === uInputId);

  if (!emp) {
    getMessage(`❌ Employé ${uInputId} introuvable!`, "red");
    inputField.value = "";
    return;
  }

  try {
    // Get current Haiti time
    const h = await getHaitiTime();
    const submittedTime = h.hour; // HH:MM AM/PM

    // Check for unclosed shifts (can be from today or previous days)
    const unclosedShifts = await handleUnclosedShift(emp);

    if (!unclosedShifts) {
      getMessage(`❌ ${emp.name} - Aucun pointage ouvert à fermer`, "red");
      inputField.value = "";
      return;
    }

    // Get the first unclosed shift (oldest one)
    const unclosedShift = await handleUnclosedShift(emp);
    const dateKeyToClose = unclosedShift.dateKey;
    const hoursWorked = unclosedShift.hoursToNow;

    // Submit check-out directly without confirmation modal
    const result = await submitCheckOut(
      uInputId,
      dateKeyToClose,
      submittedTime
    );

    if (result.ok) {
      playConfirmed();
      getMessage(
        `✅ ${emp.name} - Pointage sortant accepté (${result.hoursWorked}h)`,
        "green"
      );
      inputField.value = "";

      // Refresh employee data from server
      setTimeout(loadEmployees, 500);
    } else {
      getMessage(
        `❌ ${emp.name} - ${result.message || "Pointage sortant rejeté"}`,
        "red"
      );
      if (result.requiredTime) {
        getMessage(`⏰ Heure serveur: ${result.requiredTime}`, "orange");
      }
      inputField.value = "";
    }
  } catch (err) {
    console.error("Sortant error:", err);
    getMessage("❌ Erreur lors du pointage sortant", "red");
    inputField.value = "";
  }
});
