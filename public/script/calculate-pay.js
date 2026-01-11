// Global variables
let allEmployees = [];
let filteredData = [];
let currentSort = null;

// Performance optimization: debounce helper function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// DOM elements - will be initialized when DOM is ready
let filterYearSelect;
let filterMonthSelect;
let filterWeekSelect;
let calculateBtn;
let exportPdfBtn;
let backButton;
let summarySection;
let employeesSection;
let employeesTbody;
let searchEmployee;
let sortBtns;
let modal;
let closeBtn;
let closeModalBtn;
let downloadEmployeeBtn;

// Initialize DOM elements once DOM is loaded
function initializeDOMElements() {
  filterYearSelect = document.getElementById("filter-year");
  filterMonthSelect = document.getElementById("filter-month");
  filterWeekSelect = document.getElementById("filter-week");
  calculateBtn = document.querySelector(".calculate-btn");
  exportPdfBtn = document.querySelector(".export-pdf-btn");
  backButton = document.querySelector(".back-button");
  summarySection = document.querySelector(".summary-section");
  employeesSection = document.querySelector(".employees-section");
  employeesTbody = document.getElementById("employees-tbody");
  searchEmployee = document.getElementById("search-employee");
  sortBtns = document.querySelectorAll(".sort-btn");
  modal = document.getElementById("employee-detail-modal");
  closeBtn = document.querySelector(".close-btn");
  closeModalBtn = document.querySelector(".close-modal-btn");
  downloadEmployeeBtn = document.querySelector(".download-employee-btn");
}

// Load employees from backend
async function loadEmployees() {
  try {
    const res = await fetch("/employees");
    allEmployees = await res.json();
  } catch (err) {
    console.error("Échec du chargement des employés:", err);
    alert("Échec du chargement des données des employés");
  }
}

// Calculate hours worked between two times
function calculateHours(entrerTime, sortiTime) {
  if (!entrerTime || !sortiTime) return 0;

  const timeToMinutes = (timeStr) => {
    const parts = timeStr.match(/(\d+):(\d+)\s(AM|PM)/i);
    if (!parts) return 0;
    let hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const period = parts[3].toUpperCase();
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  };

  const entrerMinutes = timeToMinutes(entrerTime);
  const sortiMinutes = timeToMinutes(sortiTime);
  const diffMinutes = sortiMinutes - entrerMinutes;

  return Math.max(0, diffMinutes / 60);
}

// Get week number from date string (DD/MM/YYYY)
function getWeekNumber(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Calculate pay for employees based on filters
function calculatePay() {
  const year = filterYearSelect.value;
  const month = filterMonthSelect.value;
  const week = filterWeekSelect.value;

  filteredData = [];

  allEmployees.forEach((employee) => {
    // Include all employees, even those without pay rates (they'll show 0 pay)
    // But skip if they have no payType and payAmount set
    if (!employee.payType || !employee.payAmount) {
      // Still include but with 0 pay and show hours worked
      // Actually skip these for now - only include employees with pay information
      return;
    }

    let totalHours = 0;
    let daysWorked = 0;
    const dayBreakdown = [];
    const uniqueDates = new Set(); // Track unique dates for accurate day count

    // Only process pointage if the employee has records
    const pointageRecords = employee.hdePointage || {};
    const isHourlyEmployee = employee.payType === "hourly";

    // hdePointage is now an object with dateKey (DD-MM-YYYY) as keys
    Object.entries(pointageRecords).forEach(([dateKey, recordOrArray]) => {
      // Convert DD-MM-YYYY to DD/MM/YYYY for filtering
      const [recordDay, recordMonth, recordYear] = dateKey.split("-");

      // Filter by year and month
      if (recordYear !== year) return;
      if (month && recordMonth !== month) return;

      // Filter by week if specified
      if (week) {
        const dateForWeek = `${recordDay}/${recordMonth}/${recordYear}`;
        const recordWeek = getWeekNumber(dateForWeek);
        if (recordWeek !== parseInt(week)) return;
      }

      // Handle both formats: array for hourly, object for others
      const records =
        isHourlyEmployee && Array.isArray(recordOrArray)
          ? recordOrArray
          : [recordOrArray];

      records.forEach((record) => {
        if (record.entrer && record.sorti) {
          const hours = calculateHours(record.entrer, record.sorti);
          totalHours += hours;

          // Count unique dates only
          const dateFormatted = `${recordDay}/${recordMonth}/${recordYear}`;
          uniqueDates.add(dateFormatted);

          // Calculate daily pay based on pay type
          let dailyPay = 0;
          if (employee.payType === "hourly") {
            dailyPay = hours * employee.payAmount;
          } else if (employee.payType === "weekly") {
            // For weekly pay, divide by 5 (work days per week) to show daily breakdown
            dailyPay = employee.payAmount / 5;
          } else if (employee.payType === "monthly") {
            // For monthly pay, divide by 22 (work days per month) to show daily breakdown
            dailyPay = employee.payAmount / 22;
          }

          dayBreakdown.push({
            date: dateFormatted,
            entrer: record.entrer,
            sorti: record.sorti,
            hours: hours.toFixed(2),
            dailyPay: dailyPay.toFixed(2),
          });
        }
      });
    });

    // Set daysWorked based on unique dates
    daysWorked = uniqueDates.size;

    // For hourly workers, they need hours worked to calculate pay
    // For weekly/monthly workers, they get paid regardless of hours tracked
    const isHourly = employee.payType === "hourly";
    const hasWorkedHours = daysWorked > 0 || totalHours > 0;

    if (hasWorkedHours || !isHourly) {
      let totalPay = 0;
      if (employee.payType === "hourly") {
        totalPay = (totalHours * employee.payAmount).toFixed(2);
      } else if (employee.payType === "weekly") {
        // Weekly pay is fixed regardless of hours
        totalPay = employee.payAmount.toFixed(2);
      } else if (employee.payType === "monthly") {
        // Monthly pay is fixed regardless of hours
        totalPay = employee.payAmount.toFixed(2);
      }

      filteredData.push({
        ...employee,
        totalHours: totalHours.toFixed(2),
        daysWorked,
        totalPay,
        dayBreakdown,
      });
    }
  });

  // Show sections
  summarySection.classList.remove("hidden");
  employeesSection.classList.remove("hidden");

  // Populate UI
  updateSummary();
  populateTable();
}

// Update summary statistics
function updateSummary() {
  const totalEmployees = filteredData.length;
  const totalHours = filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalHours), 0)
    .toFixed(2);
  const totalPay = filteredData
    .reduce((sum, emp) => sum + parseFloat(emp.totalPay), 0)
    .toFixed(2);
  const avgPay =
    totalEmployees > 0 ? (totalPay / totalEmployees).toFixed(2) : 0;

  document.getElementById("total-employees").textContent = totalEmployees;
  document.getElementById("total-hours").textContent = totalHours;
  document.getElementById("total-pay").textContent = `HTG ${parseFloat(
    totalPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("avg-pay").textContent = `HTG ${parseFloat(
    avgPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Populate employees table
function populateTable(dataToDisplay = filteredData) {
  employeesTbody.innerHTML = "";

  dataToDisplay.forEach((emp) => {
    // Format pay display based on pay type
    let payDisplay = "Non défini";
    if (emp.payType === "hourly") {
      payDisplay = `HTG ${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly") {
      payDisplay = `HTG ${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly") {
      payDisplay = `HTG ${emp.payAmount.toFixed(2)}/mois`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="employee-name">${emp.name}</td>
      <td>${emp.id}</td>
      <td>${payDisplay}</td>
      <td>${emp.daysWorked}</td>
      <td>${emp.totalHours}h</td>
      <td><strong>HTG ${parseFloat(emp.totalPay).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</strong></td>
      <td><button class="details-btn">Voir les détails</button></td>
    `;

    row.querySelector(".details-btn").addEventListener("click", () => {
      openEmployeeModal(emp);
    });

    employeesTbody.appendChild(row);
  });
}

// Open employee detail modal
function openEmployeeModal(emp) {
  // Format pay display based on pay type
  let payDisplay = "Non défini";
  if (emp.payType === "hourly") {
    payDisplay = `HTG ${emp.payAmount.toFixed(2)}/h`;
  } else if (emp.payType === "weekly") {
    payDisplay = `HTG ${emp.payAmount.toFixed(2)}/sem`;
  } else if (emp.payType === "monthly") {
    payDisplay = `HTG ${emp.payAmount.toFixed(2)}/mois`;
  }

  document.getElementById("modal-emp-name").textContent = emp.name;
  document.getElementById("modal-emp-role").textContent = emp.role;
  document.getElementById("modal-emp-id").textContent = `ID: ${emp.id}`;
  document.getElementById("modal-emp-image").src =
    emp.image || "imgs/default-avatar.png";
  document.getElementById("modal-pay-per-hour").textContent = payDisplay;
  document.getElementById(
    "modal-total-hours"
  ).textContent = `${emp.totalHours}h`;
  document.getElementById("modal-total-pay").textContent = `HTG ${parseFloat(
    emp.totalPay
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("modal-days-worked").textContent = emp.daysWorked;

  // Populate daily breakdown as a structured table
  const dailyBreakdownDiv = document.getElementById("modal-daily-breakdown");
  dailyBreakdownDiv.innerHTML = "";

  // Sort dates in descending order (newest first)
  const sortedDays = [...emp.dayBreakdown].sort((a, b) => {
    const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
    const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
    const dateA = new Date(aYear, aMonth - 1, aDay);
    const dateB = new Date(bYear, bMonth - 1, bDay);
    return dateB - dateA;
  });

  // Create structured table
  const table = document.createElement("table");
  table.className = "daily-breakdown-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Entrée</th>
        <th>Sortie</th>
        <th>Heures</th>
        <th>Paie</th>
      </tr>
    </thead>
    <tbody>
      ${sortedDays
        .map(
          (day) => `
        <tr>
          <td class="date-cell">${day.date}</td>
          <td class="time-cell">${day.entrer}</td>
          <td class="time-cell">${day.sorti}</td>
          <td class="hours-cell">${day.hours}h</td>
          <td class="pay-cell">HTG ${parseFloat(day.dailyPay).toLocaleString(
            "en-US",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;
  dailyBreakdownDiv.appendChild(table);

  modal.classList.remove("hidden");
}

// Close modal
function closeModal() {
  modal.classList.add("hidden");
}

// Search employees
function searchEmployees() {
  const searchTerm = searchEmployee.value.toLowerCase();
  const filtered = filteredData.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm) || emp.id.includes(searchTerm)
  );
  populateTable(filtered);
}

// Sort employees
function sortEmployees(sortBy) {
  currentSort = sortBy;
  let sortedData = [...filteredData];

  sortBtns.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  if (sortBy === "name") {
    sortedData.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "hours") {
    sortedData.sort(
      (a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours)
    );
  } else if (sortBy === "pay") {
    sortedData.sort((a, b) => parseFloat(b.totalPay) - parseFloat(a.totalPay));
  }

  populateTable(sortedData);
}

// Export employee PDF
function exportEmployeePDF() {
  const empName = document.getElementById("modal-emp-name").textContent;
  const empId = document.getElementById("modal-emp-id").textContent;
  const empRole = document.getElementById("modal-emp-role").textContent;
  const totalHours = document.getElementById("modal-total-hours").textContent;
  const totalPay = document.getElementById("modal-total-pay").textContent;
  const daysWorked = document.getElementById("modal-days-worked").textContent;

  // Find the current employee in filteredData
  const empIdMatch = empId.match(/\d+/);
  const currentEmployee = filteredData.find((emp) => emp.id === empIdMatch[0]);

  if (!currentEmployee) {
    alert("Erreur: employé non trouvé");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(40, 40, 40);
  pdf.text("RAPPORT DE PAIE EMPLOYÉ", margin, yPosition);

  yPosition += 12;

  // Employee info
  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Fierbout", margin, yPosition);
  yPosition += 8;

  // Employee details
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Employé: ${empName}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`ID: ${empIdMatch[0]} | Rôle: ${empRole}`, margin, yPosition);
  yPosition += 10;

  // Summary box
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30);

  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  const summaryItems = [
    { label: "Total heures", value: totalHours },
    { label: "Jours travaillés", value: daysWorked },
    { label: "Total paie", value: totalPay },
  ];

  summaryItems.forEach((item, index) => {
    const xPos = margin + 10 + (index * (pageWidth - 2 * margin)) / 3;
    pdf.text(item.label, xPos, yPosition + 8);
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.text(item.value, xPos, yPosition + 18);
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
  });

  yPosition += 38;

  // Daily breakdown table
  if (currentEmployee.dayBreakdown && currentEmployee.dayBreakdown.length > 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.text("Détails quotidiens", margin, yPosition);
    yPosition += 6;

    const dailyData = currentEmployee.dayBreakdown.map((day) => [
      day.date,
      day.entrer || "-",
      day.sorti || "-",
      parseFloat(day.hours).toFixed(2),
      `HTG ${parseFloat(day.dailyPay).toFixed(2)}`,
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [["Date", "Entrée", "Sortie", "Heures", "Paie"]],
      body: dailyData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [40, 40, 40],
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      didDrawPage: function (data) {
        const pageCount = pdf.internal.pages.length - 1;
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        const today = new Date().toLocaleDateString("fr-FR");
        pdf.text(`Généré le: ${today}`, margin, pageHeight - 10);
      },
    });
  }

  // Download
  const filename = `Paie_${empName.replace(/ /g, "_")}_${
    empIdMatch[0]
  }_${new Date().getTime()}.pdf`;
  pdf.save(filename);
}

// Set default year to current year and populate year options
function setDefaultYear() {
  const currentYear = new Date().getFullYear();

  // Populate year select with current year and 4 previous years
  filterYearSelect.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const option = document.createElement("option");
    option.value = year.toString();
    option.textContent = year.toString();
    filterYearSelect.appendChild(option);
  }

  // Set current year as default
  filterYearSelect.value = currentYear.toString();
}

// Event listeners - set up after DOM is loaded
function setupEventListeners() {
  calculateBtn.addEventListener("click", calculatePay);
  exportPdfBtn.addEventListener("click", exportToPDF);
  backButton.addEventListener("click", () => {
    window.location.href = "/admin-employees.html";
  });
  // Performance optimization: debounce search input
  const debouncedSearch = debounce(searchEmployees, 300);
  searchEmployee.addEventListener("input", debouncedSearch);
  sortBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => sortEmployees(e.target.dataset.sort));
  });
  closeBtn.addEventListener("click", closeModal);
  closeModalBtn.addEventListener("click", closeModal);
  downloadEmployeeBtn.addEventListener("click", exportEmployeePDF);

  // Modal backdrop click to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeDOMElements();
  setupEventListeners();
  loadEmployees();
  setDefaultYear();
});

// Update cache when data-monitor notifies about changes
window.addEventListener("employees:updated", async (e) => {
  try {
    allEmployees = e.detail.employees || [];
    // If the page already has filtered data visible, recalculate
    if (filteredData && filteredData.length > 0) {
      calculatePay();
    }
  } catch (err) {
    console.error("Error handling employees:updated in calculate-pay.js", err);
  }
});
