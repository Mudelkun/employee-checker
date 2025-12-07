  const employes = [
    {name: "Sarah Perilus", id: "12345", estEntrer: false, estSorti: false, hdePointage: []},
    {name: "Rodarly Perilus", id: "078853", estEntrer: false, estSorti: false, hdePointage: []},
    {name: "Random", id: "07873", estEntrer: false, estSorti: false, hdePointage: []}
  ]  

  const inputField = document.querySelector(".input-element-style");
  const buttons = document.querySelectorAll(".button-container button");  
  const pEntrant = document.getElementById("entrant");
  const pSortant = document.getElementById("sortant");
  const message = document.getElementById("message");

  function getMessage(msg, color = "black") {
    message.textContent = msg;
    message.style.color = color;
    setTimeout(() => {
      message.textContent = "";
    }, 5000);
  }

  function updateHdePointage(emp, act) {
    let currentDate = new Date();
    let options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    let dateLocal = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

    let heure = new Intl.DateTimeFormat('fr-FR', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(currentDate);

    const empPointage = emp.hdePointage;

    if (act === 'entrant') {
        empPointage.push({
        date: dateLocal, 
        entrer: heure,
        sorti: "",
      });
      getMessage(`${emp.name.toUpperCase()} Pointage Entrant accepte ${heure}`);
    }

    if (act === 'sortant') {
      empPointage.forEach(pObj => {
        if (pObj.date === dateLocal) {
          pObj.sorti = heure;
          pObj.heureTravailer = heureTravailer(pObj.entrer, pObj.sorti);
        }
      });
      getMessage(`${emp.name.toUpperCase()} Pointage Sortant accepte ${heure}`);
    }
    console.log(empPointage);
  }

  /* 
    - get hour only
    - convert it into 12 hour format
    - get minute only 
    - convert minute into hour by dividing by 5
    - add it to some hour
  */

  function heureTravailer(entrer, sorti) {
    function to24h(timeStr) {
        // Example input: "7:35 PM"
        const [time, modifier] = timeStr.split(" ");
        let [hours, minutes] = time.split(":").map(Number);

        if (modifier === "AM") {
            if (hours === 12) hours = 0; // 12 AM → 00:00
        } else {
            if (hours !== 12) hours += 12; // 1–11 PM → +12
        }

        return hours + minutes / 60;
    }

    const hrEntrant = to24h(entrer);
    const hrSortant = to24h(sorti);

    let diff = hrSortant - hrEntrant;

    // If shift passes midnight (ex: 10 PM → 2 AM)
    if (diff < 0) diff += 24;

    return Math.round(diff * 100) / 100;
}

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.textContent.trim();

      if (value === "<") {
        inputField.value = inputField.value.slice(0, -1);
      } else {
        inputField.value += value;
      }
    });
});

  pEntrant.addEventListener("click", () => {
    if (inputField.value === "") {
      getMessage("Entrez votre numero de pointage!", "red");
      return;
    }

    const uInputId = inputField.value.trim();

    const emp = employes.find(emp => {
      return emp.id === uInputId;
    });

    if (!emp) {
      getMessage(`Identification de l'employer ${uInputId} Echouer!`, "red");
      inputField.value = "";
      return;
    }

    if (emp.estEntrer === true) {
      getMessage(`Vous avez deja pointez votre arrive: ${emp.name.toUpperCase()}`, "red");
      inputField.value = "";
      return;
    } else {
      emp.estSorti = false;
      emp.estEntrer = true;
      updateHdePointage(emp, 'entrant');
      inputField.value = "";
      return;
    }
  });

  pSortant.addEventListener("click", () => {
    if (inputField.value === "") {
      getMessage("Entrez votre numero de pointage!", "red");
      return;
    }

    const uInputId = inputField.value.trim();

    const emp = employes.find(emp => {
      return emp.id === uInputId;
    });

    if (!emp) {
      getMessage(`Identification de l'employer ${uInputId} Echouer!`, "red");
      inputField.value = "";
      return;
    }
    if (emp.estEntrer === false) {
      getMessage(`Vous n'avez pas pointez votre arrivez: ${emp.name.toUpperCase()}`, "red");
      inputField.value = "";
      return;
    } 

    if (emp.estSorti === true) {
      message.textContent = `Vous avez deja pointez votre sorti: ${emp.name}`;
      return;
    }
    emp.estEntrer = false;
    emp.estSorti = true;
    updateHdePointage(emp, 'sortant');
    inputField.value = "";
    return;
});

/* let empTravail = []

employes.forEach(emp => {
  if (emp.estEntrer === true) {
    empTravail.push(emp.name);
  }
});
console.log(empTravail); */

/*
  - [{Pointage: {
      date: <currentDate>, 
      Entrer: <time>, 
      Sorti: <time>
      }
    }]
*/