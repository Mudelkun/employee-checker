function heureTravailer(entrer, sorti) {
  function to24h(timeStr) {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "AM") {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }

    return hours + minutes / 60;
  }

  const hrEntrant = to24h(entrer);
  const hrSortant = to24h(sorti);
  let diff = hrSortant - hrEntrant;

  if (diff < 0) diff += 24;

  return Math.round(diff * 100) / 100;
}

const cases = [
  ["8:44 PM", "3:06 PM"],
  ["9:00 AM", "5:00 PM"],
  ["11:30 PM", "1:15 AM"],
  ["12:00 AM", "8:00 AM"],
  ["12:00 PM", "1:30 PM"],
  ["8:15 AM", "12:45 PM"],
  ["7:50 PM", "7:45 AM"],
  ["1:05 PM", "3:20 PM"],
  ["12:00 PM", "12:00 AM"], // noon to midnight (should be 12)
];

cases.forEach(([a, b]) => {
  console.log(`${a} -> ${b}:`, heureTravailer(a, b));
});
