// Authentication check - Run on page load
async function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
  const authTime = sessionStorage.getItem("authTime");
  const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  // Redirect immediately if not authenticated
  if (!isAuthenticated) {
    const currentPage = window.location.pathname;
    window.location.href =
      "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
    return;
  }

  // If we have an authTime, compare it to a trusted server time (Haiti)
  if (authTime) {
    try {
      const res = await fetch("/haiti-time");
      if (res.ok) {
        const data = await res.json();
        const currentTime = data.ts;
        const sessionAge = currentTime - parseInt(authTime, 10);
        if (sessionAge > TWO_HOURS) {
          sessionStorage.removeItem("authenticated");
          sessionStorage.removeItem("authTime");
          const currentPage = window.location.pathname;
          window.location.href =
            "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
        }
      } else {
        // If server unavailable, fall back to client time
        const currentTime = Date.now();
        const sessionAge = currentTime - parseInt(authTime, 10);
        if (sessionAge > TWO_HOURS) {
          sessionStorage.removeItem("authenticated");
          sessionStorage.removeItem("authTime");
          const currentPage = window.location.pathname;
          window.location.href =
            "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
        }
      }
    } catch (err) {
      // On error, fall back to client time
      const currentTime = Date.now();
      const sessionAge = currentTime - parseInt(authTime, 10);
      if (sessionAge > TWO_HOURS) {
        sessionStorage.removeItem("authenticated");
        sessionStorage.removeItem("authTime");
        const currentPage = window.location.pathname;
        window.location.href =
          "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
      }
    }
  }
}

// Check authentication when page loads
document.addEventListener("DOMContentLoaded", () => {
  checkAuthentication();
});
