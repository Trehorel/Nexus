
/* NEXUS ATHLETICS — interactions */

document.documentElement.classList.add("js-ready");

const header = document.getElementById("header");
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("nav");

/* En-tête compact au défilement */

function updateHeader() {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 30);
  header.classList.toggle("compact", window.scrollY > 30);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

/* Menu mobile */

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    }
  });
}

/* Apparition progressive des éléments */

const revealElements = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -35px 0px"
  });

  revealElements.forEach(element => revealObserver.observe(element));
} else {
  revealElements.forEach(element => element.classList.add("is-visible"));
}

/* Calculateur d'allure */

const paceForm = document.getElementById("pace-form");

if (paceForm) {
  const distanceInput = document.getElementById("distance");
  const hoursInput = document.getElementById("hours");
  const minutesInput = document.getElementById("minutes");
  const secondsInput = document.getElementById("seconds");
  const errorOutput = document.getElementById("form-error");

  const paceOutput = document.getElementById("pace-result");
  const distanceOutput = document.getElementById("distance-result");
  const timeOutput = document.getElementById("time-result");
  const speedOutput = document.getElementById("speed-result");
  const splitsOutput = document.getElementById("splits-list");

  function formatTime(totalSeconds, showHours = false) {
    const rounded = Math.round(totalSeconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;

    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    if (showHours || hours > 0) {
      return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
    }

    return `${mm}:${ss}`;
  }

  function formatDistance(distance) {
    return Number(distance.toFixed(3))
      .toLocaleString("fr-FR", { maximumFractionDigits: 3 }) + " km";
  }

  function calculatePace(event) {
    if (event) event.preventDefault();

    const distance = Number(distanceInput.value);
    const hours = Number(hoursInput.value);
    const minutes = Number(minutesInput.value);
    const seconds = Number(secondsInput.value);

    const inputs = [hours, minutes, seconds];

    if (
      !Number.isFinite(distance) ||
      distance <= 0 ||
      inputs.some(value => !Number.isFinite(value) || value < 0) ||
      minutes > 59 ||
      seconds > 59 ||
      hours > 99 ||
      (hours === 0 && minutes === 0 && seconds === 0)
    ) {
      errorOutput.textContent =
        "Entre une distance et un chrono valides pour calculer ton allure.";
      return;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const paceSeconds = totalSeconds / distance;
    const speed = distance / (totalSeconds / 3600);

    if (!Number.isFinite(paceSeconds) || !Number.isFinite(speed)) {
      errorOutput.textContent = "Impossible de calculer ces données.";
      return;
    }

    errorOutput.textContent = "";
    paceOutput.textContent = formatTime(paceSeconds);
    distanceOutput.textContent = formatDistance(distance);
    timeOutput.textContent = formatTime(totalSeconds, true);
    speedOutput.textContent =
      speed.toLocaleString("fr-FR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      }) + " km/h";

    splitsOutput.replaceChildren();

    // Affiche chaque kilomètre entier, puis la distance finale.
    const checkpoints = [];
    for (let km = 1; km < distance; km++) {
      checkpoints.push(km);
    }

    if (
      checkpoints.length === 0 ||
      Math.abs(checkpoints[checkpoints.length - 1] - distance) > 0.001
    ) {
      checkpoints.push(distance);
    }

    checkpoints.forEach(km => {
      const row = document.createElement("div");
      row.className = "split-row";

      const label = document.createElement("span");
      label.textContent = Math.abs(km - Math.round(km)) < 0.001
        ? `${Math.round(km)} KM`
        : `${Number(km.toFixed(3)).toLocaleString("fr-FR")} KM`;

      const value = document.createElement("strong");
      value.textContent = formatTime(paceSeconds * km, true);

      row.append(label, value);
      splitsOutput.appendChild(row);
    });
  }

  paceForm.addEventListener("submit", calculatePace);

  [distanceInput, hoursInput, minutesInput, secondsInput].forEach(input => {
    input.addEventListener("change", () => {
      errorOutput.textContent = "";
    });
  });

  // Calcule les valeurs affichées par défaut.
  calculatePace();
}
