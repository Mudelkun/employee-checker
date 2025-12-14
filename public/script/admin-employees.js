// ---------------------------------------------
// 1. LOAD EMPLOYEES FROM BACKEND JSON
// ---------------------------------------------
async function loadEmployees() {
  const res = await fetch("/employees");
  const employees = await res.json();
  return employees;
}

// Store employees globally for filtering
let globalEmployees = [];

// Performance optimization: debounce helper function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Containers
const emp_container = document.getElementById("employee-container");
const card_container = document.querySelector(".card-container");
const searchInput = document.getElementById("search-input");

// Generate table rows for history
function get_emp_history(emp, year = null, month = null) {
  let filtered = emp.hdePointage;

  // Filter by year and month if provided
  if (year || month) {
    filtered = filtered.filter((h) => {
      const [hMonth, hDay, hYear] = h.date.split("/");
      if (year && hYear !== year) return false;
      if (month && hMonth !== month) return false;
      return true;
    });
  }

  return filtered
    .sort((a, b) => {
      // First sort by date (newest first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const dateCompare = dateB - dateA;

      // If dates are the same, sort by entry time (latest entry first)
      if (dateCompare === 0) {
        // Parse entry times to compare them
        const timeA = parseTimeToMinutes(a.entrer);
        const timeB = parseTimeToMinutes(b.entrer);
        return timeB - timeA; // Descending order (latest first)
      }

      return dateCompare;
    })
    .map(
      (h) => `
    <div class="table-row">
      <p>${h.date}</p>
      <p>${h.entrer}${
        h.modifiedOn
          ? ` <small style="color: #999; font-size: 12px;"> (modified on ${h.modifiedOn})</small>`
          : ""
      }</p>
      <p>${h.sorti}</p>
    </div>
  `
    )
    .join("");
}

// Helper function to convert time string to minutes for sorting
// Performance optimization: cache regex pattern
const timeRegexPattern = /(\d+):(\d+)\s(AM|PM)/i;

function parseTimeToMinutes(timeStr) {
  if (!timeStr || timeStr.trim() === "") return 0;

  const parts = timeStr.match(timeRegexPattern);
  if (!parts) return 0;

  let hours = parseInt(parts[1]);
  const minutes = parseInt(parts[2]);
  const period = parts[3].toUpperCase();

  // Convert to 24-hour format for proper comparison
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

// ---------------------------------------------
// 2. BUILD THE HTML UI USING REAL JSON DATA
// ---------------------------------------------
function buildUI(employes) {
  let arr_emp = [];
  let employee_card = [];

  employes.forEach((emp) => {
    // Determine if employee is working today
    const isWorking = emp.estEntrer === true && emp.estSorti === false;
    const statusText = isWorking ? "En train de travailler" : "Absent";
    const statusClass = isWorking ? "" : "out";

    // Format pay display based on pay type
    let payDisplay = "Aucun taux horaire";
    if (emp.payType === "hourly" && emp.payAmount) {
      payDisplay = `$${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly" && emp.payAmount) {
      payDisplay = `$${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly" && emp.payAmount) {
      payDisplay = `$${emp.payAmount.toFixed(2)}/mois`;
    }

    arr_emp.push(`
      <div class="employee" id="${emp.id}" data-working="${isWorking}">
        <img src="${emp.image || "imgs/default-avatar.png"}" alt="${
      emp.name
    } picture" />
        <div class="employee-details">
          <p class="status ${statusClass}">${statusText}</p>
          <p class="name">${emp.name}</p>
          <p class="role">${emp.role}</p>
          <p class="pay-per-hour">${payDisplay}</p>
        </div>
      </div>
    `);

    // Format pay display for card
    let cardPayDisplay = "Taux de paie: Non défini";
    if (emp.payType === "hourly" && emp.payAmount) {
      cardPayDisplay = `Salaire: $${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly" && emp.payAmount) {
      cardPayDisplay = `Salaire: $${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly" && emp.payAmount) {
      cardPayDisplay = `Salaire: $${emp.payAmount.toFixed(2)}/mois`;
    }

    employee_card.push(`
      <div class="employee-card" aria-controls="${emp.id}" hidden>
        <div class="employee-header">
          <img src="${emp.image || "imgs/default-avatar.png"}" alt="${
      emp.name
    } photo" />

          <div class="employee-info">
            <div class="id-container">
              <span class="id">ID: ${emp.id}</span>
            </div>
            <p class="employee-name">${emp.name}</p>
            <p class="employee-role">${emp.role}</p>
            <p class="employee-more">${emp.details}</p>
            <p class="employee-pay-rate">${cardPayDisplay}</p>
          </div>

          <div class="employee-actions">
            <button class="edit-button">Modifier</button>
            <button class="remove-button">Supprimer</button>
          </div>
        </div>

        <div class="history-section">
          <p class="title">Historique de Pointage</p>

          <div class="filter-bar">
            <label for="filter-by-year">Année</label>
            <select id="filter-by-year">
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>

            <label for="filter-by-month">Mois</label>
            <select id="filter-by-month">
              <option value="01">Janvier</option>
              <option value="02">Février</option>
              <option value="03">Mars</option>
              <option value="04">Avril</option>
              <option value="05">Mai</option>
              <option value="06">Juin</option>
              <option value="07">Juillet</option>
              <option value="08">Août</option>
              <option value="09">Septembre</option>
              <option value="10">Octobre</option>
              <option value="11">Novembre</option>
              <option value="12">Décembre</option>
            </select>

            <button class="modifier-button">&#9998; Modifier Pointage</button>
          </div>

          <div class="history-table">
            <div class="table-header">
              <p>Date</p>
              <p>Entrée</p>
              <p>Sortie</p>
            </div>
            ${get_emp_history(emp)}
          </div>

          <button class="calculate-pay-button">Calculate Pay</button>
        </div>
      </div>
    `);
  });

  card_container.innerHTML = employee_card.join("");
  emp_container.innerHTML = arr_emp.join("");

  attachCardListeners();
}

// ---------------------------------------------
// 3. ENABLE CARD OPEN/CLOSE LOGIC
// ---------------------------------------------
function attachCardListeners() {
  const manager = document.querySelector(".employee-manager");
  const employees = document.querySelectorAll(".employee");
  const cName = document.getElementById("compagny-name");

  employees.forEach((emp) => {
    emp.addEventListener("click", () => {
      const card = document.querySelector(`[aria-controls="${emp.id}"]`);
      const empData = globalEmployees.find((e) => e.id === emp.id);

      manager.hidden = true;
      card.hidden = false;

      // Get the filter selects for this card
      const yearSelect = card.querySelector("#filter-by-year");
      const monthSelect = card.querySelector("#filter-by-month");
      const historyTable = card.querySelector(".history-table");

      // Set default values to current year and month
      const now = new Date();
      const currentYear = now.getFullYear().toString();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      yearSelect.value = currentYear;
      monthSelect.value = currentMonth;

      // Attach filter event listeners
      yearSelect.addEventListener("change", () => {
        const year = yearSelect.value;
        const month = monthSelect.value;
        const historyRows = get_emp_history(empData, year, month);
        historyTable.innerHTML = `
          <div class="table-header">
            <p>Date</p>
            <p>Entrer</p>
            <p>Sorti</p>
          </div>
          ${historyRows}
        `;
      });

      monthSelect.addEventListener("change", () => {
        const year = yearSelect.value;
        const month = monthSelect.value;
        const historyRows = get_emp_history(empData, year, month);
        historyTable.innerHTML = `
          <div class="table-header">
            <p>Date</p>
            <p>Entrer</p>
            <p>Sorti</p>
          </div>
          ${historyRows}
        `;
      });

      // Attach modifier button listener
      const modifierBtn = card.querySelector(".modifier-button");
      modifierBtn.addEventListener("click", () => {
        toggleEditMode(card, empData, historyTable);
      });

      // Attach edit button listener
      const editBtn = card.querySelector(".edit-button");
      editBtn.addEventListener("click", () => {
        openEditModal(empData);
      });

      // Attach remove button listener
      const removeBtn = card.querySelector(".remove-button");
      removeBtn.addEventListener("click", () => {
        openRemoveModal(empData, card, manager);
      });

      cName.addEventListener("click", () => {
        manager.hidden = false;
        card.hidden = true;
      });
    });
  });
}

const go_pointage = document.querySelector("#pointage");
const add = document.getElementById("add");

go_pointage.addEventListener("click", () => {
  window.open("/index.html?fromAdmin=true");
});

// ---------------------- EDIT/MODIFY POINTAGE FUNCTIONALITY ----------------------
function toggleEditMode(card, empData, historyTable) {
  const tableRows = historyTable.querySelectorAll(".table-row");
  const modifierBtn = card.querySelector(".modifier-button");
  const isEditMode = modifierBtn.classList.contains("edit-mode");
  // Performance optimization: cache regex for time validation
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s(AM|PM)$/i;

  if (!isEditMode) {
    // Enter edit mode
    modifierBtn.classList.add("edit-mode");
    modifierBtn.textContent = "✓ Confirm Changes";
    modifierBtn.style.backgroundColor = "#4CAF50";

    tableRows.forEach((row) => {
      const cells = row.querySelectorAll("p");
      cells.forEach((cell, index) => {
        if (index > 0) {
          // Skip date column (index 0)
          // Get the original value without the "modified on" text
          const cellText = cell.textContent.trim();
          const originalValue = cellText.split("(modified on")[0].trim();

          // Only allow editing if the field is blank
          if (originalValue === "") {
            cell.innerHTML = `<input type="text" class="edit-input" placeholder="HH:MM AM/PM" data-editable="true" />`;
          } else {
            cell.innerHTML = `<span class="non-editable">${originalValue}</span>`;
          }
        }
      });
    });
  } else {
    // Exit edit mode and save
    modifierBtn.classList.remove("edit-mode");
    modifierBtn.textContent = "✎ Modifier Pointage";
    modifierBtn.style.backgroundColor = "";

    const modifiedEntries = [];

    tableRows.forEach((row) => {
      const cells = row.querySelectorAll("p");
      const dateCell = cells[0].textContent.trim();
      const entrerCell = cells[1];
      const sortiCell = cells[2];

      const entrerInput = entrerCell.querySelector(
        'input[data-editable="true"]'
      );
      const sortiInput = sortiCell.querySelector('input[data-editable="true"]');

      let wasModified = false;
      let newEntrer = entrerCell.textContent
        .trim()
        .split("(modified on")[0]
        .trim();
      let newSorti = sortiCell.textContent
        .trim()
        .split("(modified on")[0]
        .trim();

      // Validate and update entrer
      if (entrerInput && entrerInput.value.trim() !== "") {
        if (!timeRegex.test(entrerInput.value)) {
          alert(
            `Format d'heure invalide: "${entrerInput.value}". Veuillez utiliser le format: HH:MM AM/PM (ex: 8:15 AM)`
          );
          return;
        }
        newEntrer = entrerInput.value;
        wasModified = true;
      }

      // Validate and update sorti
      if (sortiInput && sortiInput.value.trim() !== "") {
        if (!timeRegex.test(sortiInput.value)) {
          alert(
            `Format d'heure invalide: "${sortiInput.value}". Veuillez utiliser le format: HH:MM AM/PM (ex: 5:30 PM)`
          );
          return;
        }
        newSorti = sortiInput.value;
        wasModified = true;
      }

      // Only save if something was actually modified
      if (wasModified) {
        const historyRecord = empData.hdePointage.find(
          (h) => h.date === dateCell
        );
        if (historyRecord) {
          // Add modification date
          const modDate = new Date().toLocaleString();

          if (entrerInput && entrerInput.value.trim() !== "") {
            historyRecord.entrer = newEntrer;
          }
          if (sortiInput && sortiInput.value.trim() !== "") {
            historyRecord.sorti = newSorti;
          }
          historyRecord.modifiedOn = modDate;

          modifiedEntries.push(historyRecord);

          // Update the HTML with new values and modified date
          entrerCell.textContent = newEntrer;
          if (historyRecord.modifiedOn) {
            entrerCell.innerHTML += ` <small style="color: #999; font-size: 12px;"> (modified on ${historyRecord.modifiedOn})</small>`;
          }
          sortiCell.textContent = newSorti;
        }
      } else {
        // Reset display if not modified
        entrerCell.textContent = newEntrer;
        sortiCell.textContent = newSorti;
      }
    });

    // Save to backend only if there were modifications
    if (modifiedEntries.length > 0) {
      saveEmployeeChanges(empData);
    }
  }
}

// Save employee changes to backend
async function saveEmployeeChanges(empData) {
  try {
    const res = await fetch(`/employees/${empData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(empData),
    });

    if (!res.ok) {
      throw new Error(`Failed to save: ${res.status}`);
    }

    const data = await res.json();
    console.log("Employee updated:", data);
    alert("Les modifications de pointage ont été enregistrées avec succès!");
  } catch (err) {
    console.error("Failed to save employee:", err);
    alert(`Échec de l'enregistrement des modifications: ${err.message}`);
  }
}

// ---------------------- SEARCH FUNCTIONALITY ----------------------
function filterEmployeesBySearch(searchTerm) {
  const employees = document.querySelectorAll(".employee");
  const searchLower = searchTerm.toLowerCase();
  let visibleCount = 0;

  employees.forEach((emp) => {
    const nameElement = emp.querySelector(".name");
    const employeeName = nameElement
      ? nameElement.textContent.toLowerCase()
      : "";

    if (employeeName.includes(searchLower)) {
      emp.style.display = "";
      visibleCount++;
    } else {
      emp.style.display = "none";
    }
  });

  // Optional: show message if no results
  if (visibleCount === 0 && searchTerm.trim() !== "") {
    console.log("No employees found matching:", searchTerm);
  }
}

// Filter to show only employees working today
function filterWorkingToday() {
  const employees = document.querySelectorAll(".employee");
  employees.forEach((emp) => {
    const isWorking = emp.getAttribute("data-working") === "true";
    emp.style.display = isWorking ? "" : "none";
  });
}

// Show all employees
function showAllEmployees() {
  const employees = document.querySelectorAll(".employee");
  employees.forEach((emp) => {
    emp.style.display = "";
  });
}

// Attach search input listener with debouncing for performance
const debouncedSearch = debounce((e) => {
  filterEmployeesBySearch(e.target.value);
}, 300);

searchInput.addEventListener("input", debouncedSearch);

// Attach working today button listener
const workingTodayBtn = document.querySelector("#search button");
let isShowingWorkingOnly = false;

workingTodayBtn.addEventListener("click", () => {
  isShowingWorkingOnly = !isShowingWorkingOnly;

  if (isShowingWorkingOnly) {
    filterWorkingToday();
    workingTodayBtn.style.backgroundColor = "#4CAF50";
    workingTodayBtn.style.color = "white";
  } else {
    showAllEmployees();
    workingTodayBtn.style.backgroundColor = "";
    workingTodayBtn.style.color = "";
  }
});

// ---------------------- EDIT EMPLOYEE MODAL ----------------------
// Generate unique 6-digit ID for edit modal
function generateUniqueEditID() {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while (globalEmployees.some((emp) => emp.id === id));
  return id;
}

// Convert image file to base64 (reusing logic from create_emp.js)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function openEditModal(empData) {
  const editModal = document.querySelector(".edit-modal");
  const editImagePreview = document.getElementById("edit-image-preview");
  const editImageInput = document.getElementById("edit-image-input");
  const editUploadImageBtn = document.querySelector(".edit-upload-image-btn");
  const editIdDisplay = document.getElementById("edit-id-display");
  const editNameInput = document.getElementById("edit-name");
  const editRoleInput = document.getElementById("edit-role");
  const editDetailsInput = document.getElementById("edit-details");
  const editPayTypeSelect = document.getElementById("edit-pay-type");
  const editPayAmountInput = document.getElementById("edit-pay-amount");
  const editPayAmountField = document.getElementById("edit-pay-amount-field");
  const generateIdBtn = document.querySelector(".generate-edit-id-btn");
  const saveEditBtn = document.querySelector(".save-edit-btn");
  const cancelEditBtn = document.querySelector(".cancel-edit-btn");

  // Store the current ID and image for comparison
  let newIdForSave = empData.id;
  let newImageForSave = empData.image || "";

  // Populate form with current data
  editImagePreview.src = empData.image || "imgs/default-avatar.png";
  editIdDisplay.textContent = empData.id;
  editNameInput.value = empData.name;
  editRoleInput.value = empData.role;
  editDetailsInput.value = empData.details;
  editPayTypeSelect.value = empData.payType || "";
  editPayAmountInput.value = empData.payAmount || "";

  // Show/hide pay amount field based on pay type
  if (empData.payType) {
    editPayAmountField.style.display = "flex";
    const label = editPayAmountField.querySelector("#edit-pay-amount-label");
    if (empData.payType === "hourly") {
      label.textContent = "Pay Per Hour";
    } else if (empData.payType === "weekly") {
      label.textContent = "Pay Per Week";
    } else if (empData.payType === "monthly") {
      label.textContent = "Pay Per Month";
    }
  }

  editModal.classList.remove("hidden");

  // Pay type change handler
  editPayTypeSelect.addEventListener("change", () => {
    const payType = editPayTypeSelect.value;
    if (payType) {
      editPayAmountField.style.display = "flex";
      const label = editPayAmountField.querySelector("#edit-pay-amount-label");
      if (payType === "hourly") {
        label.textContent = "Pay Per Hour";
      } else if (payType === "weekly") {
        label.textContent = "Pay Per Week";
      } else if (payType === "monthly") {
        label.textContent = "Pay Per Month";
      }
    } else {
      editPayAmountField.style.display = "none";
    }
  });

  // Image upload button
  editUploadImageBtn.onclick = () => {
    editImageInput.click();
  };

  // Handle image file selection
  editImageInput.onchange = async (e) => {
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
      newImageForSave = await fileToBase64(file);
      // Update preview
      editImagePreview.src = newImageForSave;
      editUploadImageBtn.textContent = "Image téléchargée ✓";
    } catch (err) {
      console.error("Error reading file:", err);
      alert("Échec de la lecture du fichier image.");
    }
  };

  // Generate ID button
  generateIdBtn.onclick = () => {
    newIdForSave = generateUniqueEditID();
    editIdDisplay.textContent = newIdForSave;
  };

  // Cancel button
  cancelEditBtn.onclick = () => {
    editModal.classList.add("hidden");
    editImageInput.value = ""; // Reset file input
    editUploadImageBtn.textContent = "Upload New Picture"; // Reset button text
  };

  // Save button
  saveEditBtn.onclick = async () => {
    const newId = newIdForSave;
    const newName = editNameInput.value.trim();
    const newRole = editRoleInput.value.trim();
    const newDetails = editDetailsInput.value.trim();

    if (!newName || !newRole || !newDetails) {
      alert("Tous les champs (Nom, Poste, Détails) sont obligatoires!");
      return;
    }

    const oldId = empData.id;

    try {
      let res;

      // Create the updated employee object
      const payType = editPayTypeSelect.value;
      const payAmount = editPayAmountInput.value.trim();
      const updatedEmp = {
        ...empData,
        id: newId,
        name: newName,
        role: newRole,
        details: newDetails,
        image: newImageForSave, // Include the new image
        payType: payType || null, // "hourly", "weekly", "monthly", or null
        payAmount: payType && payAmount ? parseFloat(payAmount) : null, // The actual amount
      };

      // If ID changed, delete old and create new
      if (oldId !== newId) {
        // Delete old employee first
        const deleteRes = await fetch(`/employees/${oldId}`, {
          method: "DELETE",
        });

        if (!deleteRes.ok) {
          throw new Error(`Failed to delete old employee: ${deleteRes.status}`);
        }

        // Then POST the new employee with the new ID
        res = await fetch(`/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEmp),
        });

        if (!res.ok) {
          throw new Error(`Failed to save: ${res.status}`);
        }

        // Update globalEmployees: remove old, add new
        const oldIndex = globalEmployees.findIndex((e) => e.id === oldId);
        if (oldIndex !== -1) {
          globalEmployees.splice(oldIndex, 1);
        }
        globalEmployees.push(updatedEmp);
      } else {
        // If ID didn't change, just UPDATE the existing employee
        res = await fetch(`/employees/${oldId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEmp),
        });

        if (!res.ok) {
          throw new Error(`Failed to save: ${res.status}`);
        }

        // Update globalEmployees
        const idx = globalEmployees.findIndex((e) => e.id === oldId);
        if (idx !== -1) {
          globalEmployees[idx] = updatedEmp;
        }
      }

      const data = await res.json();
      console.log("Employee updated:", data);
      alert("Les informations de l'employé ont été mises à jour avec succès!");
      editModal.classList.add("hidden");

      // Rebuild UI with updated employees
      buildUI(globalEmployees);
    } catch (err) {
      console.error("Failed to update employee:", err);
      alert(`Échec de la mise à jour de l'employé: ${err.message}`);
    }
  };
}

// ---------------------- REMOVE EMPLOYEE MODAL ----------------------
function openRemoveModal(empData, card, manager) {
  const removeModal = document.querySelector(".remove-modal");
  const removeMessage = document.getElementById("remove-message");
  const confirmRemoveBtn = document.querySelector(".confirm-remove-btn");
  const cancelRemoveBtn = document.querySelector(".cancel-remove-btn");

  removeMessage.textContent = `Êtes-vous sûr de vouloir supprimer "${empData.name}" du système? Cette action ne peut pas être annulée.`;
  removeModal.classList.remove("hidden");

  // Cancel button
  cancelRemoveBtn.onclick = () => {
    removeModal.classList.add("hidden");
  };

  // Confirm remove button
  confirmRemoveBtn.onclick = async () => {
    try {
      // Delete employee from backend
      const res = await fetch(`/employees/${empData.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete: ${res.status}`);
      }

      console.log("Employee deleted:", empData.id);
      alert(`${empData.name} a été supprimé avec succès!`);

      removeModal.classList.add("hidden");

      // Reload the page to show updates
      location.reload();
    } catch (err) {
      console.error("Failed to delete employee:", err);
      alert(`Failed to remove employee: ${err.message}`);
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const add = document.getElementById("add");
  const calculatePayBtn = document.getElementById("calculate-pay");

  add.addEventListener("click", () => {
    window.location.href = "/create_emp.html";
  });

  calculatePayBtn.addEventListener("click", () => {
    window.location.href = "/calculate-pay.html";
  });

  // Size control dropdown
  const sizeSelect = document.getElementById("size-select");
  const employeeContainer = document.getElementById("employee-container");

  // Load saved size preference
  const savedSize = localStorage.getItem("employeeCardSize") || "md";
  if (savedSize !== "md") {
    employeeContainer.classList.add(`size-${savedSize}`);
    sizeSelect.value = savedSize;
  }

  sizeSelect.addEventListener("change", () => {
    const size = sizeSelect.value;

    // Remove all size classes
    employeeContainer.classList.remove(
      "size-xs",
      "size-sm",
      "size-md",
      "size-lg",
      "size-xl"
    );

    // Add new size class (md is default, no class needed)
    if (size !== "md") {
      employeeContainer.classList.add(`size-${size}`);
    }

    // Save preference
    localStorage.setItem("employeeCardSize", size);
  });

  const employees = await loadEmployees();
  globalEmployees = employees;
  buildUI(employees);
});
