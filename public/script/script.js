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
  }, 5000);
}

// ---------------------------------------------
// Update Pointage
// ---------------------------------------------
function updateHdePointage(emp, act) {
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

  if (act === "entrant") {
    empPointage.push({
      date: dateLocal,
      entrer: heure,
      sorti: "",
    });
    getMessage(`${emp.name.toUpperCase()} Pointage Entrant accepte ${heure}`);
  }

  if (act === "sortant") {
    empPointage.forEach((pObj) => {
      if (pObj.date === dateLocal) {
        pObj.sorti = heure;
        pObj.heureTravailer = heureTravailer(pObj.entrer, pObj.sorti);
      }
    });
    getMessage(`${emp.name.toUpperCase()} Pointage Sortant accepte ${heure}`);
  }

  // Save updated DB to server
  saveToServer(emp);
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
  await fetch(`/employees/${emp.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(emp),
  });
}

// ---------------------------------------------
// Keypad buttons
// ---------------------------------------------
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.textContent.trim();

    if (value === "<") {
      inputField.value = inputField.value.slice(0, -1);
    } else {
      inputField.value += value;
    }
  });
});

// ---------------------------------------------
// Entrant
// ---------------------------------------------
pEntrant.addEventListener("click", () => {
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
    emp.estSorti = false;
    emp.estEntrer = true;
    updateHdePointage(emp, "entrant");
    inputField.value = "";
  }
});

// ---------------------------------------------
// Sortant
// ---------------------------------------------
pSortant.addEventListener("click", () => {
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

  emp.estEntrer = false;
  emp.estSorti = true;
  updateHdePointage(emp, "sortant");
  inputField.value = "";
});
