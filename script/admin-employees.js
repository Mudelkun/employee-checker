const employes = [
  {
    name: "Sarah Perilus",
    id: "12345",
    role: "Executif officer",
    estEntrer: false,
    estSorti: false,
    details: "Is a full time teacher in 5th grade",
    hdePointage: [
      {
        date: "12/7/2025",
        entrer: "9:35 AM",
        sorti: "9:35 AM",
      },
    ],
  },
  {
    name: "Rodarly Perilus",
    id: "078853",
    role: "Manager",
    estEntrer: false,
    estSorti: false,
    details: "Is a full time math teacher working in 6th and 11th grade",
    hdePointage: [
      {
        date: "12/7/2025",
        entrer: "9:35 AM",
        sorti: "9:35 AM",
      },
    ],
  },
  {
    name: "Random",
    id: "07873",
    role: "Director",
    estEntrer: false,
    estSorti: false,
    details: "Is the goat",
    hdePointage: [
      {
        date: "12/7/2025",
        entrer: "9:35 AM",
        sorti: "9:35 AM",
      },
    ],
  },
];

// this part generate the html for each employee objects

const emp_container = document.getElementById("employee-container");
const card_container = document.querySelector(".card-container");

function get_emp_history(emp) {
  let history = [];

  emp.hdePointage.forEach((h) => {
    history.push(
      `<div class="table-row">
          <p>${h.date}</p>
          <p>${h.entrer}</p>
          <p>${h.sorti}</p>
      </div>`
    );
  });
  return history.join("");
}

let arr_emp = [];
let employee_card = [];

employes.forEach((emp) => {
  arr_emp.push(`
    <div class="employee" id="${emp.id}">
          <img src="imgs/${emp.id}.png" alt="${emp.name} picture" />
          <div class="employee-details">
            <p class="status">Is working</p>
            <p class="name">${emp.name}</p>
            <p class="role">${emp.role}</p>
          </div>
        </div>
    `);

  employee_card.push(
    ` <div class="employee-card" aria-controls="${emp.id}" hidden>
        <!-- Top Section: Employee Info -->
        <div class="employee-header">
          <img src="imgs/${emp.id}.png" alt="${emp.name} photo" />

          <div class="employee-info">
            <div class="id-container">
              <span class="show-id"><u>Show id</u></span>
              <span class="id">${emp.id}</span>
            </div>
            <p class="employee-name">${emp.name}</p>
            <p class="employee-role">${emp.role}</p>
            <p class="employee-more">
              ${emp.details}
            </p>
          </div>

          <div class="employee-actions">
            <!-- Action Buttons -->
            <button class="edit-button">Edit</button>
            <button class="remove-button">Remove</button>
          </div>
        </div>

        <!-- Historique Container -->
        <div class="history-section">
          <p class="title">Historique de Pointage</p>

          <!-- Filters -->
          <div class="filter-bar">
            <label for="filter-by-year">Year</label>
            <select id="filter-by-year">
              <!-- Filled years -->
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>

            <label for="filter-by-month">Month</label>
            <select id="filter-by-month">
              <!-- Filled months -->
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <button class="modifier-button">&#9998; Modifier Pointage</button>
          </div>

          <!-- Table Container -->
          <div class="history-table">
          <!-- Table Header -->
            <div class="table-header">
              <p>Date</p>
              <p>Entrer</p>
              <p>Sorti</p>
            </div>
            ${get_emp_history(emp)}
          </div>

          <button class="calculate-pay-button">Calculate Pay</button>
        </div>
      </div>`
  );
});

card_container.innerHTML = employee_card.join("");
emp_container.innerHTML = arr_emp.join("");

// this part handle click events

const manager = document.querySelector(".employee-manager");
const employee = document.querySelectorAll(".employee");
const cName = document.getElementById("compagny-name");

const emp_card = document.querySelectorAll(".employee-card");

employee.forEach((emp) => {
  emp.addEventListener("click", () => {
    const card = document.querySelector(`[aria-controls="${emp.id}"]`);
    manager.hidden = true;
    card.hidden = false;
    cName.addEventListener("click", () => {
      manager.hidden = false;
      card.hidden = true;
    });
  });
});
