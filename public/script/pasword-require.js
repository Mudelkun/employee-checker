// Function to logout - can be called from other pages
function logout() {
  sessionStorage.removeItem("authenticated");
  sessionStorage.removeItem("authTime");
  window.location.href = "/pasword-require.html";
}

const form = document.getElementById("authForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const identifiantInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value.trim();

  if (!identifiantInput || !passwordInput) {
    const errorEl = document.getElementById("generalError");
    errorEl.classList.add("show");
    errorEl.innerText = "Veuillez entrer vos identifiants";
    return;
  }

  try {
    // Send credentials to server for authentication
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: identifiantInput,
        password: passwordInput,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store authentication in session storage
      sessionStorage.setItem("authenticated", "true");
      try {
        const t = await fetch("/haiti-time");
        if (t.ok) {
          const td = await t.json();
          sessionStorage.setItem("authTime", td.ts.toString());
        } else {
          sessionStorage.setItem("authTime", Date.now().toString());
        }
      } catch (e) {
        sessionStorage.setItem("authTime", Date.now().toString());
      }

      // Get the intended destination from URL parameter, or default to admin-employees
      const destination =
        new URLSearchParams(window.location.search).get("redirect") ||
        "/admin-employees.html";
      window.location.href = destination;
    } else {
      const errorEl = document.getElementById("generalError");
      errorEl.classList.add("show");
      errorEl.innerText =
        data.message || "Identifiant ou mot de passe incorrect";
    }
  } catch (err) {
    console.error("Authentication error:", err);
    const errorEl = document.getElementById("generalError");
    errorEl.classList.add("show");
    errorEl.innerText = "Erreur de connexion - Veuillez réessayer";
  }
});
