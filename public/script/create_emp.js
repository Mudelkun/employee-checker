// create_emp.js - full version that talks to the backend

// Local employee cache (will be loaded from server)
let employees = [];
let uploadedImage = null; // Store base64 image data

// Inputs
const first_input = document.getElementById("first-name");
const last_input = document.getElementById("last-name");
const role_input = document.getElementById("role");
const details_input = document.getElementById("additional-details");
const email_input = document.getElementById("employee-email");
const payTypeSelect = document.getElementById("pay-type");
const payAmountInput = document.getElementById("pay-amount");
const payAmountField = document.getElementById("pay-amount-field");
const imageInput = document.getElementById("image-input");
const uploadBox = document.getElementById("upload-box");
const previewOrIcon = document.getElementById("preview-or-icon");
const uploadText = document.getElementById("upload-text");

// Buttons
const generate_id = document.querySelector(".generate-id");
const show_id = document.querySelector(".id span");
const confirme = document.querySelector(".confirme-button");

// Modal elements
const modal = document.querySelector(".confirm-modal");
const modalMessage = document.querySelector(".modal-message");
const cancelModal = document.querySelector(".cancel-modal");
const finalConfirm = document.querySelector(".final-confirm");

// UI elements for confirmation message
const emp_name = document.querySelector(".emp-name");
const confirmed = document.querySelector(".employee-confirmed");

// ---------------------- Helpers ----------------------
function capitalize(str) {
  return str.replace(/^\w/, (c) => c.toUpperCase());
}

// Convert image file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Handle image upload
uploadBox.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Veuillez télécharger un fichier image.");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("La taille de l'image doit être inférieure à 5 Mo.");
    return;
  }

  try {
    uploadedImage = await fileToBase64(file);
    // Update preview
    previewOrIcon.src = uploadedImage;
    uploadText.textContent = "Image téléchargée ✓";
  } catch (err) {
    console.error("Error reading file:", err);
    alert("Échec de la lecture du fichier image.");
  }
});

// Fetch employees from backend and update local cache
async function loadEmployees() {
  try {
    const res = await fetch("/employees");
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const list = await res.json();
    // ensure it's an array
    if (Array.isArray(list)) employees = list;
    else if (list && Array.isArray(list.employees)) employees = list.employees;
    else employees = list || [];
  } catch (err) {
    console.error("Failed to load employees:", err);
    // keep local employees as-is (empty or previous)
  }
}

// Generate unique 6-digit ID avoiding collisions with current employees
function makeLocalUniqueID() {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while (employees.some((emp) => String(emp.id) === id));
  return id;
}

// ---------------------- Validation ----------------------
function validateForm() {
  const first = first_input.value.trim();
  const last = last_input.value.trim();
  const role = role_input.value.trim();
  const id = show_id.textContent.trim();

  // Only check that required fields are not empty
  if (!first || !last || !role) {
    alert("Veuillez remplir le prénom, le nom et le poste.");
    return false;
  }

  if (!id) {
    alert("Veuillez générer un ID d'abord.");
    return false;
  }

  return true;
}

// ---------------------- Pay Type Change Handler ----------------------
payTypeSelect.addEventListener("change", () => {
  const payType = payTypeSelect.value;
  if (payType) {
    payAmountField.style.display = "flex";
    if (payType === "hourly") {
      document.getElementById("pay-amount-label").textContent =
        "Salaire horaire";
    } else if (payType === "weekly") {
      document.getElementById("pay-amount-label").textContent =
        "Salaire hebdomadaire";
    } else if (payType === "monthly") {
      document.getElementById("pay-amount-label").textContent =
        "Salaire mensuel";
    }
  } else {
    payAmountField.style.display = "none";
  }
});

// ---------------------- UI: Generate ID ----------------------
generate_id.addEventListener("click", async () => {
  // Ensure we have latest employees before generating
  await loadEmployees();
  const id = makeLocalUniqueID();
  show_id.textContent = id;
});

// ---------------------- CONFIRM (open modal) ----------------------
confirme.addEventListener("click", () => {
  if (!validateForm()) return;

  const payType = payTypeSelect.value;
  const payAmount = payAmountInput.value.trim();
  let payDisplay = "";

  if (payType && payAmount) {
    if (payType === "hourly") {
      payDisplay = `<strong>Salaire horaire:</strong> $${payAmount}<br>`;
    } else if (payType === "weekly") {
      payDisplay = `<strong>Salaire hebdomadaire:</strong> $${payAmount}<br>`;
    } else if (payType === "monthly") {
      payDisplay = `<strong>Salaire mensuel:</strong> $${payAmount}<br>`;
    }
  }

  modalMessage.innerHTML = `
    <strong>Prénom:</strong> ${capitalize(first_input.value)}<br>
    <strong>Nom de famille:</strong> ${last_input.value.toUpperCase()}<br>
    <strong>Poste:</strong> ${role_input.value}<br>
    <strong>Détails:</strong> ${details_input.value}<br>
    ${payDisplay}<strong>ID:</strong> ${show_id.textContent}
  `;

  modal.classList.remove("hidden");
});

// Cancel modal
cancelModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// ---------------------- FINAL CONFIRM: send to backend ----------------------
finalConfirm.addEventListener("click", async () => {
  // second safety validation
  if (!validateForm()) return;

  // Build new employee object
  const payType = payTypeSelect.value;
  const payAmount = payAmountInput.value.trim();

  // Use uploaded image or default to 078873.png
  const imageToUse = uploadedImage || "imgs/07873.png";

  const newEmployee = {
    name: `${capitalize(first_input.value)} ${last_input.value.toUpperCase()}`,
    role: role_input.value.trim(),
    details: details_input.value.trim(),
    email: email_input.value.trim() || null,
    id: show_id.textContent.trim(),
    image: imageToUse, // Include base64 image or default image path
    hdePointage: [],
    payType: payType || null, // "hourly", "weekly", "monthly", or null
    payAmount: payType && payAmount ? parseFloat(payAmount) : null, // The actual amount
  };

  // disable buttons to prevent double submits
  finalConfirm.disabled = true;
  confirme.disabled = true;
  finalConfirm.textContent = "Enregistrement...";

  try {
    const res = await fetch("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEmployee),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Server error ${res.status}`);
    }

    console.log("Saved:", data);

    // Update local cache (so generateID knows about it, and other pages can use)
    employees.push(newEmployee);

    // UI confirmation
    modal.classList.add("hidden");
    emp_name.textContent = newEmployee.name;
    confirmed.style.display = "flex";

    // Clear form inputs for next entry
    first_input.value = "";
    last_input.value = "";
    role_input.value = "";
    details_input.value = "";
    email_input.value = "";
    payTypeSelect.value = "";
    payAmountInput.value = "";
    payAmountField.style.display = "none";
    show_id.textContent = "";
    uploadedImage = null;
    previewOrIcon.src = "imgs/07873.png";
    uploadText.textContent = "Télécharger une image";
    imageInput.value = "";

    // hide confirmation after a few seconds
    setTimeout(() => {
      confirmed.style.display = "none";
    }, 6000);
  } catch (err) {
    console.error("Failed to save employee:", err);
    alert(
      `Échec de l'enregistrement de l'employé: ${err.message}\n\nAssurez-vous que le serveur est en cours d'exécution et vérifiez la console pour plus de détails.`
    );
  } finally {
    finalConfirm.disabled = false;
    confirme.disabled = false;
    finalConfirm.textContent = "Confirmer";
  }
});

// ---------------------- On load: get current employees ----------------------
window.addEventListener("load", async () => {
  await loadEmployees();

  // Logout button functionality
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("authenticated");
      sessionStorage.removeItem("authTime");
      window.location.href = "/pasword-require.html";
    });
  }
});
