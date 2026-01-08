// ===================================================
// DATA MONITOR - Make sure we get the latest data for all pages
// ===================================================

let currentDataHash = null;
let __data_poll_interval = 5000;
let __confirm_delay = 500;

// Initialize data monitor when page loads
async function initDataMonitor() {
  try {
    const response = await fetch("/data-hash");
    const data = await response.json();
    currentDataHash = data.hash;
  } catch (err) {
    console.error("Error initializing data monitor:", err);
  }

  // Check for changes every few seconds
  setInterval(checkForDataChanges, __data_poll_interval);
}

// Check if data has changed and reload page if it has
async function checkForDataChanges() {
  try {
    const response = await fetch("/data-hash");
    const data = await response.json();

    if (currentDataHash && data.hash !== currentDataHash) {
      // Found a change — wait shortly and then fetch full data and notify listeners
      const newHash = data.hash;
      setTimeout(async () => {
        try {
          const r = await fetch("/data-hash");
          const d = await r.json();
          if (d.hash === newHash) {
            await fetchDataAndNotify(d.hash);
          } else {
            currentDataHash = d.hash;
          }
        } catch (e) {
          console.error("Error confirming data-hash after change:", e);
        }
      }, __confirm_delay);
    }

    currentDataHash = data.hash;
  } catch (err) {
    console.error("Error checking for data changes:", err);
  }
}

// Fetch /employees and dispatch a custom event with the new data
async function fetchDataAndNotify(hash) {
  try {
    const res = await fetch("/employees");
    if (!res.ok) throw new Error(`Failed to fetch employees: ${res.status}`);
    const employees = await res.json();
    currentDataHash = hash || currentDataHash;
    const ev = new CustomEvent("employees:updated", {
      detail: { employees, hash: currentDataHash },
    });
    window.dispatchEvent(ev);
    console.log("employees:updated dispatched", currentDataHash);
  } catch (err) {
    console.error("Error fetching employees for notify:", err);
  }
}

// Start monitoring when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDataMonitor);
} else {
  initDataMonitor();
}

// Also listen for storage events triggered by saveToServer in other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "employees_updated_at") {
    try {
      // small delay to ensure the server write is visible then fetch and notify
      setTimeout(async () => {
        try {
          // re-check hash then fetch data
          const r = await fetch("/data-hash");
          const d = await r.json();
          await fetchDataAndNotify(d.hash);
        } catch (e) {
          console.error("Error handling storage fetch after storage event:", e);
        }
      }, 200);
    } catch (err) {
      console.error("Error handling storage event:", err);
    }
  }
});
