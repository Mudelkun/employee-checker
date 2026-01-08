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

// Currency formatting function (HTG - Haitian Gourde)
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "Non défini";
  return `${amount.toFixed(2)} HTG`;
}

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

// Generate table rows for history - works with new date-keyed object format
function get_emp_history(emp, year = null, month = null) {
  // Handle both old array format and new object format
  let recordsArray = [];

  if (Array.isArray(emp.hdePointage)) {
    // Old format: array
    recordsArray = emp.hdePointage;
  } else if (typeof emp.hdePointage === "object" && emp.hdePointage !== null) {
    // New format: date-keyed object (DD-MM-YYYY) -> convert to display format
    recordsArray = Object.entries(emp.hdePointage).map(([dateKey, record]) => {
      // Convert DD-MM-YYYY back to DD/MM/YYYY for display
      const displayDate = dateKey.replace(/-/g, "/");
      return {
        date: displayDate,
        entrer: record.entrer || "",
        sorti: record.sorti || "",
        heureTravailer: record.heureTravailer || 0,
        modifiedOn: record.modifiedOn,
      };
    });
  }

  // Filter by year and month if provided (date is DD/MM/YYYY)
  // Treat explicit 'all' values as no-filter
  const filterYear = year === "all" ? null : year;
  const filterMonth = month === "all" ? null : month;

  if (filterYear || filterMonth) {
    recordsArray = recordsArray.filter((h) => {
      const [hDay, hMonth, hYear] = h.date.split("/");
      if (filterYear && hYear !== filterYear) return false;
      if (filterMonth && hMonth !== filterMonth) return false;
      return true;
    });
  }

  return recordsArray
    .sort((a, b) => {
      // First sort by date (newest first) - parse DD/MM/YYYY safely
      const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
      const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
      const dateA = new Date(aYear, aMonth - 1, aDay);
      const dateB = new Date(bYear, bMonth - 1, bDay);
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

// Helper function to generate year options dynamically
function generateYearOptions() {
  const currentYear = new Date().getFullYear();
  const startYear = 2022; // Starting year for records
  let options = "";

  // Add an 'All' option at the top
  options += `<option value="all">Tous</option>`;

  for (let year = currentYear; year >= startYear; year--) {
    options += `<option value="${year}">${year}</option>`;
  }

  return options;
}

// ---------------------------------------------
// PDF GENERATION FUNCTION
// ---------------------------------------------
function generateEmployeePDF(empData, year, month) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Month names in French
  const monthNames = {
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  };

  // Normalize filter inputs and labels. Treat null/"all" as no-filter
  const filterYear = !year || year === "all" ? null : String(year);
  const filterMonth =
    !month || month === "all" ? null : String(month).padStart(2, "0");
  const monthName = !filterMonth
    ? "Tous"
    : monthNames[filterMonth] || filterMonth;
  const yearLabel = !filterYear ? "Tous" : filterYear;

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const headerBg = [52, 73, 94]; // Dark blue-gray
  const lightBg = [236, 240, 241]; // Light gray

  // Header section with company branding
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("FIERBOUT", 20, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport de Pointage", 20, 30);
  doc.text(`${monthName} ${yearLabel}`, 20, 38);

  // Generated date on the right
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Généré le: ${today}`, 140, 38);

  // Employee Information Section
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(...primaryColor);
  doc.rect(15, 55, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS DE L'EMPLOYÉ", 20, 61);

  // Employee details box
  doc.setFillColor(...lightBg);
  doc.rect(15, 65, 180, 40, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("Nom:", 20, 75);
  doc.setFont("helvetica", "normal");
  doc.text(empData.name || "N/A", 50, 75);

  doc.setFont("helvetica", "bold");
  doc.text("ID:", 20, 83);
  doc.setFont("helvetica", "normal");
  doc.text(empData.id || "N/A", 50, 83);

  doc.setFont("helvetica", "bold");
  doc.text("Poste:", 20, 91);
  doc.setFont("helvetica", "normal");
  doc.text(empData.role || "N/A", 50, 91);

  // Right column
  doc.setFont("helvetica", "bold");
  doc.text("Email:", 110, 75);
  doc.setFont("helvetica", "normal");
  doc.text(empData.email || "N/A", 130, 75);

  // Pay information
  let payDisplay = "Non défini";
  if (empData.payType === "hourly" && empData.payAmount) {
    payDisplay = `${formatCurrency(empData.payAmount)}/heure`;
  } else if (empData.payType === "weekly" && empData.payAmount) {
    payDisplay = `${formatCurrency(empData.payAmount)}/semaine`;
  } else if (empData.payType === "monthly" && empData.payAmount) {
    payDisplay = `${formatCurrency(empData.payAmount)}/mois`;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Salaire:", 110, 83);
  doc.setFont("helvetica", "normal");
  doc.text(payDisplay, 135, 83);

  // Filter history data - handle both old array and new object format
  let allRecords = [];
  if (Array.isArray(empData.hdePointage)) {
    allRecords = empData.hdePointage;
  } else if (
    typeof empData.hdePointage === "object" &&
    empData.hdePointage !== null
  ) {
    // New format: convert date-keyed object to array with date display
    allRecords = Object.entries(empData.hdePointage).map(
      ([dateKey, record]) => {
        const displayDate = dateKey.replace(/-/g, "/");
        return {
          date: displayDate,
          entrer: record.entrer || "",
          sorti: record.sorti || "",
          heureTravailer: record.heureTravailer || 0,
          modifiedOn: record.modifiedOn,
        };
      }
    );
  }

  let filteredHistory = allRecords.filter((h) => {
    const [hDay, hMonth, hYear] = h.date.split("/");
    if (filterYear && hYear !== filterYear) return false;
    if (filterMonth && hMonth !== filterMonth) return false;
    return true;
  });

  // Sort newest first (latest -> oldest)
  filteredHistory.sort((a, b) => {
    const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
    const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
    const dateA = new Date(aYear, aMonth - 1, aDay);
    const dateB = new Date(bYear, bMonth - 1, bDay);
    return dateB - dateA;
  });

  // Pointage History Section
  doc.setFillColor(...primaryColor);
  doc.rect(15, 115, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `HISTORIQUE DE POINTAGE - ${monthName.toUpperCase()} ${yearLabel}`,
    20,
    121
  );

  // Table data
  const tableData = filteredHistory.map((h) => [
    h.date,
    h.entrer || "-",
    h.sorti || "-",
    h.heureTravailer ? `${h.heureTravailer.toFixed(2)} h` : "-",
  ]);

  // Calculate totals
  const totalHours = filteredHistory.reduce(
    (sum, h) => sum + (h.heureTravailer || 0),
    0
  );
  const totalDays = filteredHistory.length;

  if (tableData.length > 0) {
    doc.autoTable({
      startY: 128,
      head: [["Date", "Entrée", "Sortie", "Heures Travaillées"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: headerBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250],
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50 },
      },
      margin: { left: 15, right: 15 },
    });

    // Summary section after table
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFillColor(...lightBg);
    doc.rect(15, finalY, 180, 25, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RÉSUMÉ DU MOIS", 20, finalY + 8);

    doc.setFont("helvetica", "normal");
    doc.text(`Jours travaillés: ${totalDays}`, 20, finalY + 18);
    doc.text(`Total d'heures: ${totalHours.toFixed(2)} h`, 80, finalY + 18);

    if (empData.payType === "hourly" && empData.payAmount) {
      const estimatedPay = totalHours * empData.payAmount;
      doc.text(
        `Salaire estimé: ${formatCurrency(estimatedPay)}`,
        140,
        finalY + 18
      );
    }
  } else {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(12);
    doc.text("Aucun pointage enregistré pour cette période.", 60, 145);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...headerBg);
  doc.rect(0, pageHeight - 15, 210, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Fierbout - Système de Gestion de Pointage", 105, pageHeight - 6, {
    align: "center",
  });

  // Save the PDF
  const fileName = `Pointage_${empData.name.replace(
    /\s+/g,
    "_"
  )}_${monthName}_${yearLabel}.pdf`;
  doc.save(fileName);
}

// Show a modal to choose year/month before generating PDF
function showDownloadModal(empData, defaultYear, defaultMonth) {
  const overlay = document.createElement("div");
  overlay.style = `position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;`;

  const modal = document.createElement("div");
  modal.style = `background:#fff;padding:20px;border-radius:8px;max-width:360px;width:100%;box-shadow:0 8px 24px rgba(0,0,0,0.2);`;
  modal.innerHTML = `
    <h3 style="margin-top:0">Télécharger l'historique</h3>
    <div style="margin-bottom:10px">
      <label>Année</label>
      <select id="pdf-year" style="width:100%;margin-top:6px">${generateYearOptions()}</select>
    </div>
    <div style="margin-bottom:10px">
      <label>Mois</label>
      <select id="pdf-month" style="width:100%;margin-top:6px">
        <option value="all">Tous</option>
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
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
      <button id="pdf-cancel">Annuler</button>
      <button id="pdf-download">Télécharger</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const yearSelect = modal.querySelector("#pdf-year");
  const monthSelect = modal.querySelector("#pdf-month");

  if (
    defaultYear &&
    Array.from(yearSelect.options).some((o) => o.value === defaultYear)
  ) {
    yearSelect.value = defaultYear;
  } else {
    yearSelect.value = "all";
  }

  if (
    defaultMonth &&
    Array.from(monthSelect.options).some((o) => o.value === defaultMonth)
  ) {
    monthSelect.value = defaultMonth;
  } else {
    monthSelect.value = "all";
  }

  modal.querySelector("#pdf-cancel").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  modal.querySelector("#pdf-download").addEventListener("click", () => {
    const selYear = yearSelect.value === "all" ? "all" : yearSelect.value;
    const selMonth = monthSelect.value === "all" ? "all" : monthSelect.value;
    document.body.removeChild(overlay);
    generateEmployeePDF(empData, selYear, selMonth);
  });
}

// ---------------------------------------------
// 2. BUILD THE HTML UI USING REAL JSON DATA
// ---------------------------------------------
function buildUI(employes) {
  let arr_emp = [];
  let employee_card = [];

  employes.forEach((emp) => {
    // Determine if employee is working today
    // Get today's date in DD-MM-YYYY format (Haiti timezone)
    const todayKey = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/\//g, "-");

    const isWorking =
      emp.hdePointage &&
      emp.hdePointage[todayKey] &&
      emp.hdePointage[todayKey].entrer &&
      !emp.hdePointage[todayKey].sorti;

    const statusText = isWorking ? "En train de travailler" : "Absent";
    const statusClass = isWorking ? "" : "out";

    // Format pay display based on pay type
    let payDisplay = "Aucun taux horaire";
    if (emp.payType === "hourly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/h`;
    } else if (emp.payType === "weekly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/sem`;
    } else if (emp.payType === "monthly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/mois`;
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
      cardPayDisplay = `Salaire: ${formatCurrency(emp.payAmount)}/h`;
    } else if (emp.payType === "weekly" && emp.payAmount) {
      cardPayDisplay = `Salaire: ${formatCurrency(emp.payAmount)}/sem`;
    } else if (emp.payType === "monthly" && emp.payAmount) {
      cardPayDisplay = `Salaire: ${formatCurrency(emp.payAmount)}/mois`;
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
            <p class="employee-email">
              ${emp.email ? `📧 ${emp.email}` : ""}
              ${
                emp.email
                  ? `<button class="send-id-btn" title="Envoyer ID par email">📤 Envoyer ID</button>`
                  : ""
              }
            </p>
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
              ${generateYearOptions()}
            </select>

            <label for="filter-by-month">Mois</label>
            <select id="filter-by-month">
              <option value="all">Tous</option>
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
            <button class="download-button">&#128229; Télécharger</button>
          </div>

          <div class="history-table">
            <div class="table-header">
              <p>Date</p>
              <p>Entrée</p>
              <p>Sortie</p>
            </div>
            ${get_emp_history(emp)}
          </div>
        </div>
      </div>
    `);
  });

  card_container.innerHTML = employee_card.join("");
  emp_container.innerHTML = arr_emp.join("");

  attachCardListeners();
}

// Render only the employee tiles (used to update list without touching open cards)
function renderEmployeeTiles(employes) {
  let arr_emp = [];
  employes.forEach((emp) => {
    const isWorking = emp.estEntrer === true && emp.estSorti === false;
    const statusText = isWorking ? "En train de travailler" : "Absent";
    const statusClass = isWorking ? "" : "out";

    let payDisplay = "Aucun taux horaire";
    if (emp.payType === "hourly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/h`;
    } else if (emp.payType === "weekly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/sem`;
    } else if (emp.payType === "monthly" && emp.payAmount) {
      payDisplay = `${formatCurrency(emp.payAmount)}/mois`;
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
  });

  // Replace tiles container only
  emp_container.innerHTML = arr_emp.join("");
  // Re-attach click handlers for the tiles only (so opening cards still works)
  const employees = document.querySelectorAll(".employee");
  employees.forEach((empEl) => {
    empEl.addEventListener("click", () => {
      const card = document.querySelector(`[aria-controls="${empEl.id}"]`);
      const empData = globalEmployees.find((e) => e.id === empEl.id);
      const manager = document.querySelector(".employee-manager");
      manager.hidden = true;
      if (card) {
        card.hidden = false;
        try {
          card.removeAttribute("hidden");
          card.style.display = "";
        } catch (e) {}
      }
    });
  });
}

// ---------------------------------------------
// 3. ENABLE CARD OPEN/CLOSE LOGIC
// ---------------------------------------------
function attachCardListeners() {
  const manager = document.querySelector(".employee-manager");
  const employees = document.querySelectorAll(".employee");
  const cName = document.getElementById("compagny-name");
  // Ensure clicking the company name returns to the manager (tiles)
  // Attach a single handler that hides any open card and shows the manager.
  if (cName) {
    // Replace any previous handler to avoid duplicates and ensure predictable behavior
    cName.onclick = () => {
      console.log("compagny-name clicked: hiding employee cards");
      const cards = document.querySelectorAll(".employee-card");
      cards.forEach((c) => {
        try {
          c.hidden = true;
          c.setAttribute("hidden", "");
          // do not manipulate style.display; rely on the hidden attribute
        } catch (e) {}
      });
      if (manager) {
        manager.hidden = false;
      }
    };
  }

  employees.forEach((emp) => {
    emp.addEventListener("click", () => {
      const card = document.querySelector(`[aria-controls="${emp.id}"]`);
      const empData = globalEmployees.find((e) => e.id === emp.id);

      manager.hidden = true;
      if (card) {
        card.hidden = false;
        try {
          card.removeAttribute("hidden");
          card.style.display = "";
        } catch (e) {}
      }

      // Get the filter selects for this card
      const yearSelect = card.querySelector("#filter-by-year");
      const monthSelect = card.querySelector("#filter-by-month");
      const historyTable = card.querySelector(".history-table");

      // Set default values to current year and month (leave 'Tous' as an option)
      const now = new Date();
      const currentYear = now.getFullYear().toString();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      yearSelect.value = currentYear;
      // Only set month if option exists (some cards may use localized static HTML)
      if (
        Array.from(monthSelect.options).some((o) => o.value === currentMonth)
      ) {
        monthSelect.value = currentMonth;
      } else {
        monthSelect.value = "all";
      }

      // Render initial history according to the selects so opening a card shows filtered view
      (function renderInitialHistory() {
        const initYear = yearSelect.value === "all" ? null : yearSelect.value;
        const initMonth =
          monthSelect.value === "all" ? null : monthSelect.value;
        const historyRows = get_emp_history(empData, initYear, initMonth);
        historyTable.innerHTML = `
          <div class="table-header">
            <p>Date</p>
            <p>Entrer</p>
            <p>Sorti</p>
          </div>
          ${historyRows}
        `;
      })();

      // Attach filter event listeners
      yearSelect.addEventListener("change", () => {
        const year = yearSelect.value === "all" ? null : yearSelect.value;
        const month = monthSelect.value === "all" ? null : monthSelect.value;
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
        const year = yearSelect.value === "all" ? null : yearSelect.value;
        const month = monthSelect.value === "all" ? null : monthSelect.value;
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

      // Attach download button listener (open modal to choose year/month)
      const downloadBtn = card.querySelector(".download-button");
      downloadBtn.addEventListener("click", () => {
        const year = yearSelect.value;
        const month = monthSelect.value;
        showDownloadModal(empData, year, month);
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

      // Attach send ID button listener (if email exists)
      const sendIdBtn = card.querySelector(".send-id-btn");
      if (sendIdBtn) {
        // Show sent indicator if already sent
        if (empData.emailSentDate) {
          const sentDate = new Date(empData.emailSentDate).toLocaleDateString(
            "fr-FR"
          );
          sendIdBtn.innerHTML = `✉️ <span class="sent-indicator" title="Envoyé le ${sentDate}">✓</span>`;
          sendIdBtn.classList.add("already-sent");
        }

        sendIdBtn.addEventListener("click", async () => {
          // Confirm before sending
          const confirmMsg = empData.emailSentDate
            ? `L'ID a déjà été envoyé. Renvoyer à ${empData.email}?`
            : `Envoyer l'ID de pointage à ${empData.email}?`;
          if (!confirm(confirmMsg)) {
            return;
          }

          sendIdBtn.disabled = true;
          sendIdBtn.textContent = "Envoi...";

          try {
            const response = await fetch("/send-id-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeEmail: empData.email,
                employeeName: empData.name,
                employeeId: empData.id,
              }),
            });

            const result = await response.json();

            if (result.success) {
              alert(`✅ Email envoyé à ${empData.email}!`);
              // Update local data and button
              empData.emailSentDate = new Date().toISOString();
              const sentDate = new Date().toLocaleDateString("fr-FR");
              sendIdBtn.innerHTML = `✉️ <span class="sent-indicator" title="Envoyé le ${sentDate}">✓</span>`;
              sendIdBtn.classList.add("already-sent");
            } else {
              alert(`❌ Échec d'envoi: ${result.message}`);
            }
          } catch (error) {
            console.error("Send email error:", error);
            alert(`❌ Erreur d'envoi: ${error.message}`);
          } finally {
            sendIdBtn.disabled = false;
          }
        });
      }

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
            `Format d'heure invalide: "${entrerInput.value}". Veuillez utiliser le format: HH:MM AM/PM (ex: 08:15 AM)`
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
            `Format d'heure invalide: "${sortiInput.value}". Veuillez utiliser le format: HH:MM AM/PM (ex: 05:30 PM)`
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

          // Recalculate hours worked when admin updates both entrer and sorti
          if (
            historyRecord.entrer &&
            historyRecord.entrer.trim() !== "" &&
            historyRecord.sorti &&
            historyRecord.sorti.trim() !== ""
          ) {
            const entrMin = parseTimeToMinutes(historyRecord.entrer);
            const sortMin = parseTimeToMinutes(historyRecord.sorti);
            let diffHours = (sortMin - entrMin) / 60;
            if (diffHours < 0) diffHours += 24;
            historyRecord.heureTravailer = Math.round(diffHours * 100) / 100;
          } else {
            // If either time is missing, clear heureTravailer
            historyRecord.heureTravailer = null;
          }

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

// ---------------------- FILTER/SORT FUNCTIONALITY ----------------------
const filterSelect = document.getElementById("filter-select");

function applyFilter(filterValue) {
  const employeeContainer = document.getElementById("employee-container");
  const employees = Array.from(employeeContainer.querySelectorAll(".employee"));

  // First, show all employees
  employees.forEach((emp) => (emp.style.display = ""));

  // Get employee data for sorting/filtering
  const employeesWithData = employees.map((empEl) => {
    const empData = globalEmployees.find((e) => e.id === empEl.id);
    return { element: empEl, data: empData };
  });

  let filtered = employeesWithData;
  let sorted = false;

  switch (filterValue) {
    case "none":
      // Reset to original order (by ID or as loaded)
      break;

    case "alpha-asc":
      filtered.sort((a, b) => {
        const nameA = a.data?.name?.toLowerCase() || "";
        const nameB = b.data?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB, "fr");
      });
      sorted = true;
      break;

    case "alpha-desc":
      filtered.sort((a, b) => {
        const nameA = a.data?.name?.toLowerCase() || "";
        const nameB = b.data?.name?.toLowerCase() || "";
        return nameB.localeCompare(nameA, "fr");
      });
      sorted = true;
      break;

    case "pay-asc":
      filtered.sort((a, b) => {
        const payA = a.data?.payAmount || 0;
        const payB = b.data?.payAmount || 0;
        return payA - payB;
      });
      sorted = true;
      break;

    case "pay-desc":
      filtered.sort((a, b) => {
        const payA = a.data?.payAmount || 0;
        const payB = b.data?.payAmount || 0;
        return payB - payA;
      });
      sorted = true;
      break;

    case "pay-type-hourly":
      filtered.forEach(({ element, data }) => {
        element.style.display = data?.payType === "hourly" ? "" : "none";
      });
      break;

    case "pay-type-weekly":
      filtered.forEach(({ element, data }) => {
        element.style.display = data?.payType === "weekly" ? "" : "none";
      });
      break;

    case "pay-type-monthly":
      filtered.forEach(({ element, data }) => {
        element.style.display = data?.payType === "monthly" ? "" : "none";
      });
      break;

    case "pay-type-none":
      filtered.forEach(({ element, data }) => {
        element.style.display = !data?.payType ? "" : "none";
      });
      break;

    case "has-email":
      filtered.forEach(({ element, data }) => {
        const hasEmail = data?.email && data.email.trim() !== "";
        element.style.display = hasEmail ? "" : "none";
      });
      break;

    case "no-email":
      filtered.forEach(({ element, data }) => {
        const hasEmail = data?.email && data.email.trim() !== "";
        element.style.display = !hasEmail ? "" : "none";
      });
      break;
  }

  // If sorted, reorder DOM elements
  if (sorted) {
    filtered.forEach(({ element }) => {
      employeeContainer.appendChild(element);
    });
  }

  // Update visible count
  const visibleCount = employeeContainer.querySelectorAll(
    '.employee[style=""], .employee:not([style])'
  ).length;
  const actualVisible = Array.from(
    employeeContainer.querySelectorAll(".employee")
  ).filter((emp) => emp.style.display !== "none").length;

  const employeeCountEl = document.getElementById("employee-count");
  if (employeeCountEl && filterValue !== "none") {
    employeeCountEl.textContent = actualVisible;
  } else if (employeeCountEl) {
    employeeCountEl.textContent = globalEmployees.length;
  }
}

filterSelect.addEventListener("change", (e) => {
  // Reset working today filter when applying a new filter
  if (isShowingWorkingOnly) {
    isShowingWorkingOnly = false;
    workingTodayBtn.style.backgroundColor = "";
    workingTodayBtn.style.color = "";
  }
  applyFilter(e.target.value);
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
  const editEmailInput = document.getElementById("edit-email");
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
  editEmailInput.value = empData.email || "";
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
    const newEmail = editEmailInput.value.trim();

    // Only name and role are required, details is optional
    if (!newName || !newRole) {
      alert("Le nom et le poste sont obligatoires!");
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
        email: newEmail || null,
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

      // Notify other tabs and update current UI without reloading
      try {
        localStorage.setItem("employees_updated_at", Date.now().toString());
      } catch (e) {}
      try {
        if (typeof fetchDataAndNotify === "function") {
          // ask data-monitor to fetch latest and dispatch update
          fetchDataAndNotify();
        } else {
          // fallback: rebuild UI by reloading employees
          const emps = await fetch("/employees").then((r) => r.json());
          globalEmployees = emps;
          buildUI(globalEmployees);
        }
      } catch (e) {
        console.error("Error updating UI after delete:", e);
      }
    } catch (err) {
      console.error("Failed to delete employee:", err);
      alert(`Impossible de supprimer l'employé: ${err.message}`);
    }
  };
}

// ---------------------- SEND ID TO EMPLOYEES MODAL ----------------------
function openSendIdModal() {
  const sendIdModal = document.querySelector(".send-id-modal");
  const employeeListContainer = document.getElementById(
    "send-id-employee-list"
  );
  const selectAllCheckbox = document.getElementById("select-all-employees");
  const cancelBtn = document.querySelector(".cancel-send-id-btn");
  const confirmBtn = document.querySelector(".confirm-send-id-btn");

  // Populate employee list
  employeeListContainer.innerHTML = globalEmployees
    .map((emp) => {
      const hasEmail = emp.email && emp.email.trim() !== "";
      const alreadySent = emp.emailSentDate;
      const sentDate = alreadySent
        ? new Date(emp.emailSentDate).toLocaleDateString("fr-FR")
        : null;
      return `
        <div class="employee-checkbox-item ${!hasEmail ? "no-email" : ""} ${
        alreadySent ? "already-sent" : ""
      }">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              class="employee-send-checkbox" 
              data-id="${emp.id}" 
              data-email="${emp.email || ""}"
              data-name="${emp.name}"
              ${!hasEmail ? "disabled" : ""}
            />
            <div class="employee-checkbox-info">
              <span class="employee-checkbox-name">
                ${emp.name}
                ${
                  alreadySent
                    ? `<span class="sent-badge" title="Envoyé le ${sentDate}">✓ envoyé</span>`
                    : ""
                }
              </span>
              ${
                hasEmail
                  ? `<span class="employee-checkbox-email">${emp.email}</span>`
                  : `<span class="employee-checkbox-no-email">Pas d'email</span>`
              }
            </div>
          </label>
        </div>
      `;
    })
    .join("");

  // Reset select all checkbox
  selectAllCheckbox.checked = false;

  // Show modal
  sendIdModal.classList.remove("hidden");

  // Select all functionality
  const handleSelectAll = () => {
    const checkboxes = employeeListContainer.querySelectorAll(
      ".employee-send-checkbox:not(:disabled)"
    );
    checkboxes.forEach((cb) => {
      cb.checked = selectAllCheckbox.checked;
    });
  };

  // Update select all based on individual checkboxes
  const updateSelectAll = () => {
    const checkboxes = employeeListContainer.querySelectorAll(
      ".employee-send-checkbox:not(:disabled)"
    );
    const checkedCount = employeeListContainer.querySelectorAll(
      ".employee-send-checkbox:not(:disabled):checked"
    ).length;
    selectAllCheckbox.checked =
      checkedCount === checkboxes.length && checkboxes.length > 0;
  };

  // Attach event listeners
  selectAllCheckbox.addEventListener("change", handleSelectAll);
  employeeListContainer.addEventListener("change", (e) => {
    if (e.target.classList.contains("employee-send-checkbox")) {
      updateSelectAll();
    }
  });

  // Cancel button
  const handleCancel = () => {
    sendIdModal.classList.add("hidden");
    // Clean up event listeners
    selectAllCheckbox.removeEventListener("change", handleSelectAll);
    cancelBtn.removeEventListener("click", handleCancel);
    confirmBtn.removeEventListener("click", handleConfirm);
  };

  // Confirm/Send button
  const handleConfirm = async () => {
    const selectedCheckboxes = employeeListContainer.querySelectorAll(
      ".employee-send-checkbox:checked"
    );

    if (selectedCheckboxes.length === 0) {
      alert("Veuillez sélectionner au moins un employé.");
      return;
    }

    const employeesToSend = Array.from(selectedCheckboxes).map((cb) => ({
      id: cb.dataset.id,
      email: cb.dataset.email,
      name: cb.dataset.name,
    }));

    // Disable button during sending
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Envoi en cours...";

    let successCount = 0;
    let failCount = 0;

    for (const emp of employeesToSend) {
      try {
        const response = await fetch("/send-id-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeEmail: emp.email,
            employeeName: emp.name,
            employeeId: emp.id,
          }),
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
          // Update local employee data
          const empIndex = globalEmployees.findIndex((e) => e.id === emp.id);
          if (empIndex !== -1) {
            globalEmployees[empIndex].emailSentDate = new Date().toISOString();
          }
        } else {
          failCount++;
          console.error(`Failed to send to ${emp.email}: ${result.message}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Error sending to ${emp.email}:`, error);
      }
    }

    // Reset button
    confirmBtn.disabled = false;
    confirmBtn.textContent = "📤 Envoyer";

    // Show result
    if (failCount === 0) {
      alert(`✅ Email envoyé avec succès à ${successCount} employé(s)!`);
    } else {
      alert(`Envoi terminé: ${successCount} succès, ${failCount} échec(s).`);
    }

    // Close modal
    handleCancel();
  };

  cancelBtn.addEventListener("click", handleCancel);
  confirmBtn.addEventListener("click", handleConfirm);
}

document.addEventListener("DOMContentLoaded", async () => {
  const add = document.getElementById("add");
  const calculatePayBtn = document.getElementById("calculate-pay");
  const sendIdToAllBtn = document.getElementById("send-id-to-all-button");

  add.addEventListener("click", () => {
    window.location.href = "/create_emp.html";
  });

  calculatePayBtn.addEventListener("click", () => {
    window.location.href = "/calculate-pay.html";
  });

  // Send ID to All button
  sendIdToAllBtn.addEventListener("click", () => {
    openSendIdModal();
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

  // Update employee count
  const employeeCountEl = document.getElementById("employee-count");
  if (employeeCountEl) {
    employeeCountEl.textContent = employees.length;
  }

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

// Listen for data-monitor updates and refresh admin UI without full reload
window.addEventListener("employees:updated", (e) => {
  try {
    const employees = e.detail.employees || [];
    // Preserve currently open card and its selected filters (if any)
    const openCard = document.querySelector(".employee-card:not([hidden])");
    let openId = null;
    let selYear = null;
    let selMonth = null;
    if (openCard) {
      openId = openCard.getAttribute("aria-controls");
      const ys = openCard.querySelector("#filter-by-year");
      const ms = openCard.querySelector("#filter-by-month");
      if (ys) selYear = ys.value;
      if (ms) selMonth = ms.value;
    }

    // Rebuild full UI (tiles + cards)
    globalEmployees = employees;
    buildUI(employees);

    // Restore open card view if it was open
    if (openId) {
      const card = document.querySelector(`[aria-controls="${openId}"]`);
      const manager = document.querySelector(".employee-manager");
      if (card && manager) {
        manager.hidden = true;
        card.hidden = false;
        // restore select values if present
        const yearSelect = card.querySelector("#filter-by-year");
        const monthSelect = card.querySelector("#filter-by-month");
        const historyTable = card.querySelector(".history-table");
        if (yearSelect && selYear) yearSelect.value = selYear;
        if (monthSelect && selMonth) monthSelect.value = selMonth;

        // update history based on restored selects
        const useYear =
          yearSelect && yearSelect.value === "all"
            ? null
            : yearSelect && yearSelect.value;
        const useMonth =
          monthSelect && monthSelect.value === "all"
            ? null
            : monthSelect && monthSelect.value;
        const empData = employees.find((x) => x.id === openId);
        if (empData && historyTable) {
          historyTable.innerHTML = `
            <div class="table-header">
              <p>Date</p>
              <p>Entrer</p>
              <p>Sorti</p>
            </div>
            ${get_emp_history(empData, useYear, useMonth)}
          `;
        }
      }
    }

    const employeeCountEl = document.getElementById("employee-count");
    if (employeeCountEl) employeeCountEl.textContent = employees.length;
    console.log(
      "admin-employees: UI refreshed from employees:updated",
      employees.length
    );
  } catch (err) {
    console.error(
      "Error handling employees:updated in admin-employees.js",
      err
    );
  }
});
