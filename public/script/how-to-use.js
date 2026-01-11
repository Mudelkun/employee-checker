// HTML-to-PDF using html2pdf.js
(function () {
  const btn = document.getElementById("download-guide-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const element = document.getElementById("guide-content");
    if (!element || !window.html2pdf) return;

    const filename = `Guide_Pointage_Fierbout_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    const opt = {
      margin: [12, 12, 12, 12],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      pagebreak: { mode: ["css", "legacy"] },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    window.html2pdf().from(element).set(opt).save();
  });
})();
