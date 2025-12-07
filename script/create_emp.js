const employees = [];

// Inputs
const first_input = document.getElementById("first-name");
const last_input = document.getElementById("last-name");
const role_input = document.getElementById("role");
const details_input = document.getElementById("additional-details");

// Buttons
const generate_id = document.querySelector(".generate-id");
const show_id = document.querySelector(".id span");
const confirme = document.querySelector(".confirme-button");

// Modal elements
const modal = document.querySelector(".confirm-modal");
const modalMessage = document.querySelector(".modal-message");
const cancelModal = document.querySelector(".cancel-modal");
const finalConfirm = document.querySelector(".final-confirm");

/* ------------------------------------
   Generate UNIQUE Employee ID
------------------------------------ */
function generateID(employees) {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while (employees.some((emp) => emp.id === id));

  return id;
}

generate_id.addEventListener("click", () => {
  show_id.textContent = generateID(employees);
});

/* ------------------------------------
   Capitalize First Letter Helper
------------------------------------ */
function capitalize(str) {
  return str.replace(/^\w/, (c) => c.toUpperCase());
}

/* ------------------------------------
   VALIDATION FUNCTION
------------------------------------ */
function validateForm() {
  const first = first_input.value.trim();
  const last = last_input.value.trim();
  const role = role_input.value.trim();
  const details = details_input.value.trim();
  const id = show_id.textContent.trim();

  // Basic empty-field validation
  if (!first || !last || !role || !details) {
    alert("Please fill out all fields.");
    return false;
  }

  // Name must be only letters
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'-]+$/;

  if (!nameRegex.test(first)) {
    alert("First name contains invalid characters.");
    return false;
  }

  if (!nameRegex.test(last)) {
    alert("Last name contains invalid characters.");
    return false;
  }

  // Role limited to letters + spaces
  const roleRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
  if (!roleRegex.test(role)) {
    alert("Role contains invalid characters.");
    return false;
  }

  // Details cannot be too short
  if (details.length < 5) {
    alert("Details must be at least 5 characters long.");
    return false;
  }

  // ID must exist
  if (!id) {
    alert("Please generate an ID first.");
    return false;
  }

  return true;
}

/* ------------------------------------
   CONFIRM BUTTON → OPEN MODAL
------------------------------------ */
confirme.addEventListener("click", () => {
  if (!validateForm()) return;

  // Fill modal preview with the employee info
  modalMessage.innerHTML = `
    <strong>First Name:</strong> ${capitalize(first_input.value)}<br>
    <strong>Last Name:</strong> ${last_input.value.toUpperCase()}<br>
    <strong>Role:</strong> ${role_input.value}<br>
    <strong>Details:</strong> ${details_input.value}<br>
    <strong>ID:</strong> ${show_id.textContent}
  `;

  modal.classList.remove("hidden");
});

/* ------------------------------------
   MODAL BUTTON ACTIONS
------------------------------------ */
cancelModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

finalConfirm.addEventListener("click", () => {
  // Build the final employee object
  employees.push({
    name: `${capitalize(first_input.value)} ${last_input.value.toUpperCase()}`,
    role: `${role_input.value}`,
    details: `${details_input.value}`,
    id: `${show_id.textContent}`,
    hdePointage: [],
  });

  const emp_name = document.querySelector(".emp-name");
  const confirmed = document.querySelector(".employee-confirmed");

  console.log(employees);

  modal.classList.add("hidden");

  emp_name.textContent = `${capitalize(
    first_input.value
  )} ${last_input.value.toUpperCase()}`;
  confirmed.style.display = "flex";

  setTimeout(() => {
    confirmed.style.display = "none";
  }, 9000);
});
