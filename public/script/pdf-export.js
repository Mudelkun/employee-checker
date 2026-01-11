// PDF Export functionality for pay calculations
// Uses jsPDF and jsPDF AutoTable libraries

async function exportToPDF() {
  if (typeof filteredData === "undefined" || filteredData.length === 0) {
    alert("Aucune donnée à exporter. Veuillez d'abord calculer la paie.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const year = filterYearSelect.value;
  const month = filterMonthSelect.value || "Tous";
  const week = filterWeekSelect.value || "Tous";

  // Get month name in French
  const monthNames = {
    "": "Tous les mois",
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

  const monthName = monthNames[month] || month;

  // Calculate totals
  const totalEmployees = filteredData.length;
  const totalHours = filteredData.reduce(
    (sum, emp) => sum + parseFloat(emp.totalHours),
    0
  );
  const totalPay = filteredData.reduce(
    (sum, emp) => sum + parseFloat(emp.totalPay),
    0
  );
  const avgPay = totalEmployees > 0 ? totalPay / totalEmployees : 0;

  // Set up PDF styles
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(40, 40, 40);
  pdf.text("RAPPORT DE PAIE", margin, yPosition);

  yPosition += 10;

  // Company info
  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Fierbout", margin, yPosition);
  yPosition += 6;

  // Period info
  pdf.setFontSize(10);
  pdf.text(`Période: ${monthName} ${year}`, margin, yPosition);
  if (week && week !== "") {
    pdf.text(`Semaine: ${week}`, margin + 80, yPosition);
  }
  yPosition += 10;

  // Summary cards section
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 35);

  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);

  const boxWidth = (pageWidth - 2 * margin) / 4;
  const summaryData = [
    { label: "Total employés", value: totalEmployees.toString() },
    { label: "Total heures", value: totalHours.toFixed(2) + " h" },
    { label: "Total paie", value: "HTG " + totalPay.toFixed(2) },
    { label: "Paie moy/emp", value: "HTG " + avgPay.toFixed(2) },
  ];

  summaryData.forEach((item, index) => {
    const xPos = margin + index * boxWidth + 5;
    pdf.text(item.label, xPos, yPosition + 8);
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    pdf.text(item.value, xPos, yPosition + 18);
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
  });

  yPosition += 42;

  // Employee table
  pdf.setFontSize(12);
  pdf.setTextColor(40, 40, 40);
  pdf.text("Détails des salaires des employés", margin, yPosition);
  yPosition += 8;

  // Prepare table data
  const tableData = filteredData.map((emp) => {
    let payRate = "Non défini";
    if (emp.payType === "hourly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/h`;
    } else if (emp.payType === "weekly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/sem`;
    } else if (emp.payType === "monthly") {
      payRate = `HTG ${emp.payAmount.toFixed(2)}/mois`;
    }

    return [
      emp.name,
      emp.id,
      payRate,
      emp.daysWorked.toString(),
      parseFloat(emp.totalHours).toFixed(2),
      `HTG ${parseFloat(emp.totalPay).toFixed(2)}`,
    ];
  });

  pdf.autoTable({
    startY: yPosition,
    head: [["Employé", "ID", "Paie/Unité", "Jours", "Total h", "Total paie"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 4,
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
      // Footer
      const pageCount = pdf.internal.pages.length - 1;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      // Date
      const today = new Date().toLocaleDateString("fr-FR");
      pdf.text(`Généré le: ${today}`, margin, pageHeight - 10);
    },
  });

  // Download
  const filename = `Rapport-Paie_${year}-${month}_${new Date().getTime()}.pdf`;
  pdf.save(filename);
}
