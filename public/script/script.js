let employes = [];

// ---------------------------------------------
// DISPLAY CURRENT TIME IN HEADER
// ---------------------------------------------
function updateTime() {
  const timeElement = document.getElementById("current-time");
  if (timeElement) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    timeElement.textContent = timeString;
  }
}

// Update time immediately and then every second
updateTime();
setInterval(updateTime, 1000);

// ---------------------------------------------
// LOAD EMPLOYEES FROM JSON VIA SERVER
// ---------------------------------------------
async function loadEmployees() {
  const res = await fetch("/employees");
  employes = await res.json();
}

loadEmployees();

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

// ---------------------------------------------
// Update Pointage
// ---------------------------------------------
async function updateHdePointage(emp, act) {
  let currentDate = new Date();
  let dateLocal = `${
    currentDate.getMonth() + 1
  }/${currentDate.getDate()}/${currentDate.getFullYear()}`;

  let heure = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(currentDate);

  const empPointage = emp.hdePointage;

  let resultMessage = "";

  if (act === "entrant") {
    empPointage.push({
      date: dateLocal,
      entrer: heure,
      sorti: "",
    });
    // mark employee as entered and not yet exited
    emp.estEntrer = true;
    emp.estSorti = false;
    resultMessage = `${emp.name.toUpperCase()} Pointage Entrant accepte ${heure}`;
  }

  if (act === "sortant") {
    let found = false;
    let changedHistory = false;
    let sortieMessage = "";

    empPointage.forEach((pObj) => {
      if (pObj.date === dateLocal) {
        found = true;
        // If admin already set a sortie, do not overwrite it — preserve admin history
        if (!pObj.sorti || pObj.sorti.trim() === "") {
          pObj.sorti = heure;
          pObj.heureTravailer = heureTravailer(pObj.entrer, pObj.sorti);
          changedHistory = true;
          sortieMessage = `${emp.name.toUpperCase()} Pointage Sortant accepte ${heure}`;
        } else {
          // Keep the admin-provided sortie; still mark employee as sorted out
          sortieMessage = `${emp.name.toUpperCase()} Sortie déjà enregistrée par l'administrateur`;
        }
      }
    });

    if (found) {
      // mark employee as exited and no longer entered (even if history wasn't changed)
      emp.estSorti = true;
      emp.estEntrer = false;
      resultMessage =
        sortieMessage ||
        `${emp.name.toUpperCase()} Pointage Sortant accepte ${heure}`;
    } else {
      // No matching entry for today; do not mark as sorted out
      return {
        ok: false,
        message: `${emp.name.toUpperCase()} Aucun enregistrement d'entrée trouvé pour aujourd'hui`,
      };
    }
  }

  // Save updated DB to server and wait for completion so other pages can react
  const res = await saveToServer(emp);
  if (res && res.ok) {
    return { ok: true, message: resultMessage };
  } else {
    return { ok: false, message: "Erreur lors de la sauvegarde des données" };
  }
}

// ---------------------------------------------
// Convert Time & Calculate Hours Worked
// ---------------------------------------------
function heureTravailer(entrer, sorti) {
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
// SAVE UPDATED EMPLOYEES TO SERVER
// ---------------------------------------------
async function saveToServer(emp) {
  try {
    const res = await fetch(`/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emp),
    });

    if (res.ok) {
      // notify other tabs/pages that data has been saved
      try {
        localStorage.setItem("employees_updated_at", Date.now().toString());
      } catch (e) {
        // ignore localStorage errors in some environments
      }
    } else {
      console.error("Failed to save employee data", res.status);
    }
    return res;
  } catch (err) {
    console.error("Error saving employee data:", err);
    throw err;
  }
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

// ---------------------------------------------
// Entrant
// ---------------------------------------------
pEntrant.addEventListener("click", async () => {
  if (inputField.value === "") {
    getMessage("Entrez votre numero de pointage!", "red");
    return;
  }

  const uInputId = inputField.value.trim();
  const emp = employes.find((emp) => emp.id === uInputId);

  if (!emp) {
    getMessage(`Identification de l'employer ${uInputId} Echouer!`, "red");
    inputField.value = "";
    return;
  }

  if (emp.estEntrer === true) {
    getMessage(
      `Vous avez deja pointez votre arrive: ${emp.name.toUpperCase()}`,
      "red"
    );
    inputField.value = "";
    return;
  } else {
    // call update which now handles est flags and saving
    try {
      const res = await updateHdePointage(emp, "entrant");
      if (res && res.ok) {
        playConfirmed();
        getMessage(res.message);
      } else {
        getMessage(res.message || "Échec de la sauvegarde", "red");
      }
    } catch (err) {
      console.error("Entrant save failed:", err);
      getMessage("Erreur lors de la sauvegarde", "red");
    }
    inputField.value = "";
  }
});

// ---------------------------------------------
// Sortant
// ---------------------------------------------
pSortant.addEventListener("click", async () => {
  if (inputField.value === "") {
    getMessage("Entrez votre numero de pointage!", "red");
    return;
  }

  const uInputId = inputField.value.trim();
  const emp = employes.find((emp) => emp.id === uInputId);

  if (!emp) {
    getMessage(`Identification de l'employer ${uInputId} Echouer!`, "red");
    inputField.value = "";
    return;
  }

  if (!emp.estEntrer) {
    getMessage(
      `Vous n'avez pas pointez votre arrivez: ${emp.name.toUpperCase()}`,
      "red"
    );
    inputField.value = "";
    return;
  }

  if (emp.estSorti) {
    getMessage(`Vous avez deja pointez votre sorti: ${emp.name}`, "red");
    return;
  }

  try {
    const res = await updateHdePointage(emp, "sortant");
    if (res && res.ok) {
      playConfirmed();
      getMessage(res.message);
    } else {
      getMessage(res.message || "Échec de la sauvegarde", "red");
    }
  } catch (err) {
    console.error("Sortant save failed:", err);
    getMessage("Erreur lors de la sauvegarde", "red");
  }
  inputField.value = "";
});
