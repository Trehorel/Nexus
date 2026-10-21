(() => {
  "use strict";

  /* =========================================================
     NEXUS — INTERFACE GÉNÉRALE
  ========================================================= */

  const root = document.documentElement;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  root.classList.add("js-ready");

  // En-tête compact au défilement
  const header = document.querySelector("#header, .site-header");

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 35);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // Menu mobile
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#nav, .nav");

  if (menuButton && navigation) {
    menuButton.setAttribute("aria-expanded", "false");

    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("is-open");

      menuButton.classList.toggle("is-active", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navigation.classList.remove("is-open");
        menuButton.classList.remove("is-active");
        menuButton.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        navigation.classList.remove("is-open");
        menuButton.classList.remove("is-active");
        menuButton.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }
    });
  }

  // Animations d'apparition au défilement
  const revealElements = document.querySelectorAll(
    ".reveal, .section, .mission-grid, .principle-card, " +
    ".feature-content, .training-card, .tile"
  );

  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" }
    );

    revealElements.forEach((element) => {
      element.classList.add("reveal-ready");
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  }

  // Compteurs animés
  const counters = document.querySelectorAll("[data-count]");

  function animateCounter(element) {
    const target = Number(element.dataset.count);

    if (!Number.isFinite(target)) return;

    if (reducedMotion) {
      element.textContent = String(target);
      return;
    }

    const duration = 1100;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      element.textContent = Math.round(target * eased).toLocaleString("fr-FR");

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    });

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  // Effet magnétique léger sur les boutons
  if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".magnetic, .button-magnetic").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        item.style.transform =
          `translate(${x * 0.045}px, ${y * 0.045}px)`;
      });

      item.addEventListener("pointerleave", () => {
        item.style.transform = "";
      });
    });
  }

  /* =========================================================
     LABORATOIRE DE COURSE À PIED
  ========================================================= */

  const lab = document.querySelector("#lab-app");
  if (!lab) return;

  const $ = (selector) => lab.querySelector(selector);

  const elements = {
    targetPace: $("#target-pace"),
    customReps: $("#custom-reps"),
    customEffort: $("#custom-effort"),
    customRecovery: $("#custom-recovery"),
    prepare: $("#prepare-workout"),
    error: $("#config-error"),
    description: $("#workout-description"),

    clock: $("#timer-clock"),
    phase: $("#timer-phase"),
    subtitle: $("#timer-subtitle"),
    progress: $("#timer-progress"),
    status: $("#timer-status"),
    step: $("#timer-step"),
    elapsed: $("#timer-elapsed"),
    total: $("#timer-total"),

    start: $("#timer-start"),
    pause: $("#timer-pause"),
    next: $("#timer-next"),
    reset: $("#timer-reset"),
    notice: $("#timer-notice"),

    planTitle: $("#plan-title"),
    planSummary: $("#plan-summary"),
    planCount: $("#plan-count"),
    planList: $("#timer-plan-list"),

    historyList: $("#history-list"),
    historyCount: $("#history-count"),
    historyDuration: $("#history-duration"),
    historyClear: $("#history-clear"),
    historyNotice: $("#history-notice")
  };

  const HISTORY_KEY = "nexus-running-history-v1";
  const MAX_HISTORY = 100;

  const workoutNames = {
    vma: "VMA 30/30",
    fractionne: "Fractionné 400 m",
    pyramide: "Pyramide",
    endurance: "Endurance",
    custom: "Séance personnalisée"
  };

  let segments = [];
  let currentIndex = 0;
  let remaining = 0;
  let running = false;
  let finished = false;
  let intervalId = null;
  let endTimestamp = null;
  let segmentStartedAt = null;
  let elapsedBeforeSegment = 0;
  let completedSeconds = 0;
  let sessionStartedAt = null;
  let workoutType = "";
  let sessionSaved = false;

  const now = () => Date.now();

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.ceil(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;

    if (hours > 0) {
      return [hours, minutes, rest]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
    }

    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    if (minutes === 0) return `${rest} s`;
    if (rest === 0) return `${minutes} min`;
    return `${minutes} min ${rest} s`;
  }

  function formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toLocaleString("fr-FR")} km`;
    }
    return `${meters} m`;
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function showNotice(message, type = "info") {
    if (!elements.notice) return;
    elements.notice.textContent = message;
    elements.notice.dataset.type = type;
    elements.notice.hidden = !message;
  }

  function showError(message) {
    if (!elements.error) return;
    elements.error.textContent = message;
    elements.error.hidden = !message;
  }

  function clearIntervalTimer() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function setButtonStates() {
    if (elements.start) {
      elements.start.disabled = running || finished || segments.length === 0;
    }

    if (elements.pause) {
      elements.pause.disabled = !running;
    }

    if (elements.next) {
      elements.next.disabled = segments.length === 0 || finished;
    }

    if (elements.reset) {
      elements.reset.disabled = segments.length === 0;
    }
  }

  function readPace() {
    const value = elements.targetPace?.value?.trim() ?? "";
    const match = value.match(/^(\d{1,2}):([0-5]?\d)$/);

    if (!match) {
      throw new Error("Indique une allure au format minutes:secondes, par exemple 4:35.");
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const total = minutes * 60 + seconds;

    if (total < 120 || total > 1200) {
      throw new Error("L’allure doit être comprise entre 2:00 et 20:00 min/km.");
    }

    return total;
  }

  function paceForDistance(distance, paceSeconds) {
    return Math.round(distance / 1000 * paceSeconds);
  }

  function makeSegment(name, duration, type = "effort", extra = {}) {
    return {
      name,
      duration: Math.max(1, Math.round(duration)),
      type,
      ...extra
    };
  }

  function addWarmup(list, minutes = 10) {
    list.push(makeSegment("Échauffement", minutes * 60, "warmup"));
  }

  function addCooldown(list, minutes = 5) {
    list.push(makeSegment("Retour au calme", minutes * 60, "cooldown"));
  }

  function buildWorkout(type) {
    const list = [];
    const pace = elements.targetPace?.value?.trim()
      ? readPace()
      : null;

    if (type === "vma") {
      addWarmup(list, 10);

      for (let i = 1; i <= 16; i++) {
        list.push(makeSegment(
          `Répétition ${i}/16 — rapide`,
          30,
          "effort",
          { rep: i, reps: 16 }
        ));

        if (i < 16) {
          const recovery = i === 8 ? 120 : 30;
          list.push(makeSegment(
            i === 8 ? "Récupération longue" : "Récupération",
            recovery,
            "recovery"
          ));
        }
      }

      addCooldown(list, 5);
      return list;
    }

    if (type === "fractionne") {
      if (!pace) {
        throw new Error("Renseigne ton allure cible pour calculer les temps des 400 m.");
      }

      addWarmup(list, 10);

      for (let i = 1; i <= 6; i++) {
        list.push(makeSegment(
          `400 m — répétition ${i}/6`,
          paceForDistance(400, pace),
          "effort",
          { distance: 400, rep: i, reps: 6 }
        ));

        if (i < 6) {
          list.push(makeSegment("Récupération", 90, "recovery"));
        }
      }

      addCooldown(list, 5);
      return list;
    }

    if (type === "pyramide") {
      if (!pace) {
        throw new Error("Renseigne ton allure cible pour calculer les temps de la pyramide.");
      }

      addWarmup(list, 10);

      const distances = [200, 400, 600, 800, 1000, 800, 600, 400, 200];

      distances.forEach((distance, index) => {
        list.push(makeSegment(
          `${formatDistance(distance)} — ${index + 1}/${distances.length}`,
          paceForDistance(distance, pace),
          "effort",
          { distance, rep: index + 1, reps: distances.length }
        ));

        if (index < distances.length - 1) {
          list.push(makeSegment("Récupération", 75, "recovery"));
        }
      });

      addCooldown(list, 5);
      return list;
    }

    if (type === "endurance") {
      list.push(makeSegment("Mise en route", 5 * 60, "warmup"));
      list.push(makeSegment("Endurance confortable", 30 * 60, "effort"));
      addCooldown(list, 5);
      return list;
    }

    if (type === "custom") {
      const reps = Number(elements.customReps?.value);
      const effort = Number(elements.customEffort?.value);
      const recovery = Number(elements.customRecovery?.value);

      if (!Number.isInteger(reps) || reps < 1 || reps > 30) {
        throw new Error("Le nombre de répétitions doit être compris entre 1 et 30.");
      }

      if (!Number.isFinite(effort) || effort < 5 || effort > 3600) {
        throw new Error("L’effort doit durer entre 5 secondes et 60 minutes.");
      }

      if (!Number.isFinite(recovery) || recovery < 0 || recovery > 1800) {
        throw new Error("La récupération doit être comprise entre 0 et 30 minutes.");
      }

      addWarmup(list, 10);

      for (let i = 1; i <= reps; i++) {
        list.push(makeSegment(
          `Effort ${i}/${reps}`,
          effort,
          "effort",
          { rep: i, reps }
        ));

        if (i < reps && recovery > 0) {
          list.push(makeSegment("Récupération", recovery, "recovery"));
        }
      }

      addCooldown(list, 5);
      return list;
    }

    throw new Error("Choisis une séance avant de la préparer.");
  }

  function getSelectedWorkout() {
    const selected = lab.querySelector(
      "[data-workout].is-selected, [data-workout][aria-pressed='true']"
    );

    return selected?.dataset.workout ?? "";
  }

  function totalDuration() {
    return segments.reduce((sum, segment) => sum + segment.duration, 0);
  }

  function elapsedDuration() {
    let total = completedSeconds;

    if (running && segmentStartedAt !== null) {
      total += Math.max(0, (now() - segmentStartedAt) / 1000);
    }

    return Math.min(total, totalDuration());
  }

  function renderPlan() {
    if (elements.planList) {
      elements.planList.replaceChildren();

      segments.forEach((segment, index) => {
        const item = document.createElement("li");
        item.className = "timer-plan-item";
        if (index === currentIndex) item.classList.add("is-current");
        if (index < currentIndex) item.classList.add("is-complete");

        const name = document.createElement("span");
        name.className = "timer-plan-name";
        name.textContent = segment.name;

        const duration = document.createElement("span");
        duration.className = "timer-plan-duration";
        duration.textContent = formatDuration(segment.duration);

        item.append(name, duration);
        elements.planList.append(item);
      });
    }

    setText(elements.planCount, String(segments.length));
    setText(elements.planTitle, workoutNames[workoutType] || "Séance");
    setText(
      elements.planSummary,
      `${segments.length} étapes · ${formatDuration(totalDuration())}`
    );
  }

  function renderSegment() {
    const segment = segments[currentIndex];
    if (!segment) return;

    remaining = segment.duration;

    setText(elements.phase, segment.name);
    setText(elements.subtitle, segment.type === "recovery"
      ? "Récupère et prépare la suite."
      : segment.type === "warmup"
        ? "Monte progressivement en intensité."
        : segment.type === "cooldown"
          ? "Relâche l’effort et retrouve ton calme."
          : "Reste régulier et maîtrise ton effort."
    );

    setText(elements.clock, formatTime(remaining));
    setText(elements.step, `${currentIndex + 1} / ${segments.length}`);

    if (elements.status) {
      elements.status.textContent = running
        ? "EN COURS"
        : finished
          ? "TERMINÉE"
          : "EN PAUSE";
    }

    if (elements.progress) {
      elements.progress.style.width = "0%";
      elements.progress.setAttribute("aria-valuenow", "0");
    }

    renderPlan();
    setButtonStates();
  }

  function updateDisplay() {
    const segment = segments[currentIndex];

    if (segment) {
      const liveRemaining = running && endTimestamp !== null
        ? Math.max(0, (endTimestamp - now()) / 1000)
        : remaining;

      remaining = Math.max(0, liveRemaining);
      setText(elements.clock, formatTime(remaining));

      const segmentProgress = segment.duration > 0
        ? ((segment.duration - remaining) / segment.duration) * 100
        : 100;

      if (elements.progress) {
        elements.progress.style.width = `${Math.min(100, Math.max(0, segmentProgress))}%`;
        elements.progress.setAttribute(
          "aria-valuenow",
          String(Math.round(segmentProgress))
        );
      }
    }

    const total = totalDuration();
    const elapsed = elapsedDuration();

    setText(elements.elapsed, formatDuration(elapsed));
    setText(elements.total, formatDuration(total));

    if (elements.status) {
      elements.status.textContent = finished
        ? "TERMINÉE"
        : running
          ? "EN COURS"
          : "EN PAUSE";
    }

    setButtonStates();
  }

  function startTimer() {
    if (!segments.length || running || finished) return;

    running = true;
    segmentStartedAt = now();
    endTimestamp = segmentStartedAt + remaining * 1000;
    sessionStartedAt ??= segmentStartedAt;

    clearIntervalTimer();
    intervalId = window.setInterval(tick, 200);

    showNotice("Chronomètre lancé. Bonne séance !", "success");
    updateDisplay();
  }

  function pauseTimer() {
    if (!running) return;

    remaining = Math.max(0, (endTimestamp - now()) / 1000);
    completedSeconds += Math.max(0, (now() - segmentStartedAt) / 1000);
    running = false;
    segmentStartedAt = null;
    endTimestamp = null;

    clearIntervalTimer();
    showNotice("Séance en pause. Tu peux reprendre quand tu veux.");
    updateDisplay();
  }

  function tick() {
    if (!running || endTimestamp === null) return;

    remaining = Math.max(0, (endTimestamp - now()) / 1000);

    if (remaining <= 0) {
      completedSeconds += Math.max(
        0,
        (now() - segmentStartedAt) / 1000
      );

      running = false;
      segmentStartedAt = null;
      endTimestamp = null;
      clearIntervalTimer();

      advanceSegment(true);
      return;
    }

    updateDisplay();
  }

  function advanceSegment(fromTimer = false) {
    if (!segments.length || finished) return;

    if (running) {
      completedSeconds += Math.max(
        0,
        (now() - segmentStartedAt) / 1000
      );
    }

    running = false;
    segmentStartedAt = null;
    endTimestamp = null;
    clearIntervalTimer();

    if (currentIndex >= segments.length - 1) {
      finishWorkout();
      return;
    }

    currentIndex++;
    remaining = segments[currentIndex].duration;

    renderSegment();
    updateDisplay();

    if (fromTimer) {
      showNotice(
        `Étape terminée. Prochaine étape : ${segments[currentIndex].name}.`,
        "success"
      );
    } else {
      showNotice(`Étape suivante : ${segments[currentIndex].name}.`);
    }
  }

  function finishWorkout() {
    clearIntervalTimer();
    running = false;
    finished = true;
    remaining = 0;
    endTimestamp = null;
    segmentStartedAt = null;

    completedSeconds = totalDuration();

    setText(elements.clock, "00:00");
    setText(elements.phase, "Séance terminée");
    setText(elements.subtitle, "Bravo ! Ta séance est terminée.");
    setText(elements.status, "TERMINÉE");
    setText(elements.step, `${segments.length} / ${segments.length}`);

    if (elements.progress) {
      elements.progress.style.width = "100%";
      elements.progress.setAttribute("aria-valuenow", "100");
    }

    saveWorkout();
    renderPlan();
    updateDisplay();
    setButtonStates();
    showNotice("Séance terminée ! Pense à récupérer et à t’hydrater.", "success");
  }

  function resetTimer() {
    clearIntervalTimer();

    running = false;
    finished = false;
    endTimestamp = null;
    segmentStartedAt = null;
    completedSeconds = 0;
    sessionStartedAt = null;
    currentIndex = 0;
    sessionSaved = false;

    if (!segments.length) {
      setText(elements.clock, "00:00");
      setText(elements.phase, "Prêt à démarrer");
      setText(elements.subtitle, "Prépare une séance pour commencer.");
      setText(elements.status, "EN ATTENTE");
      setText(elements.step, "—");
      setButtonStates();
      return;
    }

    remaining = segments[0].duration;
    renderSegment();
    updateDisplay();
    showNotice("Séance réinitialisée.");
  }

  function prepareWorkout() {
    clearIntervalTimer();
    showError("");
    showNotice("");

    const type = getSelectedWorkout();

    if (!type) {
      showError("Sélectionne d’abord un type de séance.");
      return;
    }

    try {
      const newSegments = buildWorkout(type);

      if (!newSegments.length) {
        throw new Error("Cette séance ne contient aucune étape.");
      }

      segments = newSegments;
      workoutType = type;
      currentIndex = 0;
      remaining = segments[0].duration;
      completedSeconds = 0;
      running = false;
      finished = false;
      endTimestamp = null;
      segmentStartedAt = null;
      sessionStartedAt = null;
      sessionSaved = false;

      if (elements.description) {
        elements.description.textContent =
          `${workoutNames[type]} · ${segments.length} étapes · ` +
          `${formatDuration(totalDuration())}`;
      }

      renderSegment();
      updateDisplay();
      showNotice("Séance prête. Appuie sur Démarrer quand tu es prêt.", "success");

      $("#timer-start")?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest"
      });
    } catch (error) {
      showError(error instanceof Error
        ? error.message
        : "Impossible de préparer cette séance.");
    }
  }

  /* =========================================================
     HISTORIQUE DES SÉANCES
  ========================================================= */

  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item) =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        Number.isFinite(Number(item.duration)) &&
        Number(item.duration) >= 0
      ).slice(0, MAX_HISTORY);
    } catch {
      return [];
    }
  }

  function writeHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    } catch {
      return false;
    }
  }

  function saveWorkout() {
    if (sessionSaved || !segments.length) return;

    const history = readHistory();
    history.unshift({
      id: `${now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: workoutNames[workoutType] || "Séance",
      duration: totalDuration(),
      completedAt: new Date().toISOString(),
      steps: segments.length
    });

    const success = writeHistory(history.slice(0, MAX_HISTORY));
    sessionSaved = true;
    renderHistory();

    if (!success) {
      showNotice(
        "Séance terminée, mais le navigateur n’a pas pu sauvegarder l’historique.",
        "warning"
      );
    }
  }

  function renderHistory() {
    const history = readHistory();

    if (elements.historyList) {
      elements.historyList.replaceChildren();

      if (history.length === 0) {
        const empty = document.createElement("p");
        empty.className = "history-empty";
        empty.textContent = "Aucune séance enregistrée pour le moment.";
        elements.historyList.append(empty);
      } else {
        history.forEach((session) => {
          const item = document.createElement("article");
          item.className = "history-item";

          const info = document.createElement("div");
          info.className = "history-item-info";

          const title = document.createElement("strong");
          title.textContent = session.name;

          const date = document.createElement("span");
          const parsedDate = new Date(session.completedAt);
          date.textContent = Number.isNaN(parsedDate.getTime())
            ? "Date inconnue"
            : parsedDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              });

          info.append(title, date);

          const duration = document.createElement("span");
          duration.className = "history-item-duration";
          duration.textContent = formatDuration(Number(session.duration));

          item.append(info, duration);
          elements.historyList.append(item);
        });
      }
    }

    setText(elements.historyCount, String(history.length));

    const total = history.reduce(
      (sum, session) => sum + Number(session.duration),
      0
    );

    setText(elements.historyDuration, formatDuration(total));
  }

  function clearHistory() {
    const history = readHistory();

    if (history.length === 0) {
      setText(elements.historyNotice, "L’historique est déjà vide.");
      return;
    }

    const confirmed = window.confirm(
      "Veux-tu vraiment supprimer tout l’historique de tes séances ?"
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      setText(elements.historyNotice, "Historique supprimé.");
    } catch {
      setText(
        elements.historyNotice,
        "Impossible de supprimer l’historique dans ce navigateur."
      );
    }
  }

  /* =========================================================
     ÉVÉNEMENTS
  ========================================================= */

  lab.querySelectorAll("[data-workout]").forEach((card) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", "false");

    function selectWorkout() {
      lab.querySelectorAll("[data-workout]").forEach((other) => {
        const selected = other === card;
        other.classList.toggle("is-selected", selected);
        other.setAttribute("aria-pressed", String(selected));
      });

      showError("");
    }

    card.addEventListener("click", selectWorkout);

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectWorkout();
      }
    });
  });

  elements.prepare?.addEventListener("click", prepareWorkout);
  elements.start?.addEventListener("click", startTimer);
  elements.pause?.addEventListener("click", pauseTimer);
  elements.next?.addEventListener("click", () => advanceSegment(false));
  elements.reset?.addEventListener("click", resetTimer);
  elements.historyClear?.addEventListener("click", clearHistory);

  // Initialisation
  renderHistory();
  resetTimer();
})();
