
(() => {
  "use strict";

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.documentElement.classList.add("js-ready");

  /* =========================================
     1. FONCTIONS GÉNÉRALES DE NEXUS
  ========================================= */

  const header = document.querySelector(".site-header");
  let lastCompact = false;

  const updateHeader = () => {
    const compact = window.scrollY > 24;
    if (compact !== lastCompact) {
      header?.classList.toggle("compact", compact);
      lastCompact = compact;
    }
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const menuToggle = document.querySelector("#menu-toggle");
  const nav = document.querySelector(".nav");

  menuToggle?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open") ?? false;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.setAttribute("aria-label", "Ouvrir le menu");
    });
  });

  const revealItems = document.querySelectorAll(".reveal");

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
  } else {
    revealItems.forEach((item, index) => {
      if (index % 4 === 1) item.dataset.delay = "1";
      if (index % 4 === 2) item.dataset.delay = "2";
      if (index % 4 === 3) item.dataset.delay = "3";
    });

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    revealItems.forEach(item => revealObserver.observe(item));
  }

  const counters = document.querySelectorAll("[data-count]");

  const animateCount = element => {
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || "";

    if (reducedMotion) {
      element.textContent =
        target.toLocaleString("fr-FR") + suffix;
      return;
    }

    const duration = 1050;
    const start = performance.now();

    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      element.textContent =
        Math.round(target * eased).toLocaleString("fr-FR") + suffix;

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window && !reducedMotion) {
    const countObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          entry.target.closest(".stat-card")?.classList.add("is-visible");
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });

    counters.forEach(counter => countObserver.observe(counter));
  } else {
    counters.forEach(counter => {
      animateCount(counter);
      counter.closest(".stat-card")?.classList.add("is-visible");
    });
  }

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  if (!reducedMotion && finePointer) {
    document.querySelectorAll(".magnetic").forEach(button => {
      let frame = 0;
      let x = 0;
      let y = 0;

      const render = () => {
        button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        frame = 0;
      };

      button.addEventListener("pointermove", event => {
        const rect = button.getBoundingClientRect();
        x = (event.clientX - rect.left - rect.width / 2) * 0.12;
        y = (event.clientY - rect.top - rect.height / 2) * 0.16;

        if (!frame) frame = requestAnimationFrame(render);
      });

      button.addEventListener("pointerleave", () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        button.style.transform = "translate3d(0, 0, 0)";
      });
    });
  }

  /* =========================================
     2. LABORATOIRE DE COURSE À PIED
  ========================================= */

  const lab = document.querySelector("#lab-app");

  // Sur les autres pages, seul le code général ci-dessus s'exécute.
  if (!lab) return;

  const $ = selector => lab.querySelector(selector);

  const STORAGE_KEY = "nexus-running-history-v1";

  const workoutCards = [...lab.querySelectorAll("[data-workout]")];

  const paceInput = $("#target-pace");
  const repsInput = $("#custom-reps");
  const effortInput = $("#custom-effort");
  const recoveryInput = $("#custom-recovery");

  const prepareButton = $("#prepare-workout");
  const configError = $("#config-error");
  const workoutDescription = $("#workout-description");

  const clock = $("#timer-clock");
  const phaseLabel = $("#timer-phase");
  const subtitle = $("#timer-subtitle");
  const progressBar = $("#timer-progress");
  const statusLabel = $("#timer-status");
  const stepLabel = $("#timer-step");
  const elapsedLabel = $("#timer-elapsed");
  const totalLabel = $("#timer-total");

  const startButton = $("#timer-start");
  const pauseButton = $("#timer-pause");
  const nextButton = $("#timer-next");
  const resetButton = $("#timer-reset");
  const timerNotice = $("#timer-notice");

  const planTitle = $("#plan-title");
  const planSummary = $("#plan-summary");
  const planCount = $("#plan-count");
  const planList = $("#timer-plan-list");

  const historyList = $("#history-list");
  const historyCount = $("#history-count");
  const historyDuration = $("#history-duration");
  const historyClear = $("#history-clear");
  const historyNotice = $("#history-notice");

  const workoutInfo = {
    vma: {
      title: "VMA — 30/30",
      description:
        "2 séries de 8 répétitions : 30 secondes d'effort et 30 secondes de récupération.",
      summary: "16 efforts courts, répartis en 2 séries."
    },
    fractionne: {
      title: "Fractionné — 400 m",
      description:
        "6 répétitions de 400 m, avec récupération entre les répétitions.",
      summary: "6 × 400 m. Les temps sont estimés avec l'allure saisie."
    },
    pyramide: {
      title: "Pyramide — 200 à 1 000 m",
      description:
        "200, 400, 600, 800, 1 000, 800, 600, 400 puis 200 m.",
      summary: "9 répétitions avec des distances progressives."
    },
    endurance: {
      title: "Endurance — 30 min",
      description:
        "5 minutes d'échauffement, 30 minutes d'endurance, puis 5 minutes de retour au calme.",
      summary: "Une sortie continue de 30 minutes au milieu de la séance."
    },
    custom: {
      title: "Séance personnalisée",
      description: "Compose tes répétitions et tes récupérations.",
      summary: "Séance construite avec tes paramètres."
    }
  };

  let selectedWorkout = "vma";
  let activeWorkout = null;
  let segments = [];
  let currentIndex = 0;
  let elapsedInSegment = 0;
  let segmentStartedAt = 0;
  let totalElapsedBeforePause = 0;
  let sessionStartedAt = 0;
  let timerInterval = null;
  let isRunning = false;
  let isFinished = false;

  /* ---------- Utilitaires ---------- */

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

  const formatTime = seconds => {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  const formatLongTime = seconds => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    if (minutes === 0) return `${remainder} s`;
    if (remainder === 0) return `${minutes} min`;
    return `${minutes} min ${remainder} s`;
  };

  const formatDistance = meters =>
    meters >= 1000
      ? `${(meters / 1000).toLocaleString("fr-FR")} km`
      : `${meters} m`;

  const readPace = () => {
    const value = paceInput.value.trim().replace(",", ".");
    const match = value.match(/^(\d{1,2}):([0-5]?\d)$/);

    if (!match) return null;

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);

    if (minutes < 2 || minutes > 20) return null;

    return minutes * 60 + seconds;
  };

  const paceForDistance = meters => {
    const paceSeconds = readPace();
    return Math.max(1, Math.round((paceSeconds * meters) / 1000));
  };

  const makeSegment = (label, kind, seconds, detail = "") => ({
    label,
    kind,
    duration: Math.max(1, Math.round(seconds)),
    detail
  });

  const addWarmup = list => {
    list.push(makeSegment(
      "Échauffement",
      "warmup",
      300,
      "5 minutes faciles avant le travail principal."
    ));
  };

  const addCooldown = list => {
    list.push(makeSegment(
      "Retour au calme",
      "cooldown",
      300,
      "5 minutes faciles pour terminer la séance."
    ));
  };

  /* ---------- Construction des séances ---------- */

  const buildWorkout = type => {
    const list = [];
    const info = workoutInfo[type];

    if (type === "vma") {
      addWarmup(list);

      for (let rep = 1; rep <= 16; rep++) {
        list.push(makeSegment(
          `Effort ${rep}/16`,
          "effort",
          30,
          "30 secondes d'effort rapide, sans sprint maximal."
        ));

        if (rep < 16) {
          const betweenSeries = rep === 8;
          list.push(makeSegment(
            betweenSeries ? "Récupération entre séries" : `Récupération ${rep}/16`,
            "recovery",
            betweenSeries ? 120 : 30,
            betweenSeries
              ? "2 minutes avant la deuxième série."
              : "Trottiner ou marcher selon ton niveau."
          ));
        }
      }

      addCooldown();
    }

    if (type === "fractionne") {
      addWarmup(list);

      const effortSeconds = paceForDistance(400);

      for (let rep = 1; rep <= 6; rep++) {
        list.push(makeSegment(
          `Effort ${rep}/6 — 400 m`,
          "effort",
          effortSeconds,
          `Temps théorique à l'allure ${paceInput.value.trim()} min/km.`
        ));

        if (rep < 6) {
          list.push(makeSegment(
            `Récupération ${rep}/5`,
            "recovery",
            90,
            "90 secondes de récupération."
          ));
        }
      }

      addCooldown();
    }

    if (type === "pyramide") {
      addWarmup(list);

      const distances = [200, 400, 600, 800, 1000, 800, 600, 400, 200];

      distances.forEach((distance, index) => {
        const rep = index + 1;

        list.push(makeSegment(
          `Effort ${rep}/9 — ${formatDistance(distance)}`,
          "effort",
          paceForDistance(distance),
          `Temps estimé à l'allure ${paceInput.value.trim()} min/km.`
        ));

        if (rep < distances.length) {
          list.push(makeSegment(
            `Récupération ${rep}/8`,
            "recovery",
            75,
            "75 secondes de récupération entre les répétitions."
          ));
        }
      });

      addCooldown();
    }

    if (type === "endurance") {
      addWarmup(list);
      list.push(makeSegment(
        "Endurance continue",
        "effort",
        30 * 60,
        "30 minutes à une intensité confortable, où tu peux parler."
      ));
      addCooldown(list);
    }

    if (type === "custom") {
      const reps = Number(repsInput.value);
      const effort = Number(effortInput.value);
      const recovery = Number(recoveryInput.value);

      if (!Number.isInteger(reps) || reps < 1 || reps > 30) {
        throw new Error("Choisis entre 1 et 30 répétitions.");
      }

      if (!Number.isInteger(effort) || effort < 5 || effort > 3600) {
        throw new Error("L'effort doit durer entre 5 et 3 600 secondes.");
      }

      if (!Number.isInteger(recovery) || recovery < 0 || recovery > 1800) {
        throw new Error("La récupération doit durer entre 0 et 1 800 secondes.");
      }

      addWarmup(list);

      for (let rep = 1; rep <= reps; rep++) {
        list.push(makeSegment(
          `Effort ${rep}/${reps}`,
          "effort",
          effort,
          `Effort personnalisé de ${formatLongTime(effort)}.`
        ));

        if (rep < reps && recovery > 0) {
          list.push(makeSegment(
            `Récupération ${rep}/${reps - 1}`,
            "recovery",
            recovery,
            `Récupération de ${formatLongTime(recovery)}.`
          ));
        }
      }

      addCooldown(list);
    }

    return {
      id: type,
      title: info.title,
      summary: info.summary,
      segments: list
    };
  };

  const getTotalDuration = () =>
    segments.reduce((sum, segment) => sum + segment.duration, 0);

  /* ---------- Affichage du plan ---------- */

  const renderPlan = () => {
    planTitle.textContent = activeWorkout.title;
    planSummary.textContent = activeWorkout.summary;
    planCount.textContent =
      `${String(segments.length).padStart(2, "0")} ÉTAPES`;

    planList.replaceChildren();

    segments.forEach((segment, index) => {
      const row = document.createElement("div");
      row.className = "plan-row";
      row.dataset.index = String(index);

      const number = document.createElement("span");
      number.className = "plan-row-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const text = document.createElement("span");
      text.className = "plan-row-text";
      text.textContent = segment.label;

      const time = document.createElement("strong");
      time.className = "plan-row-time";
      time.textContent = formatTime(segment.duration);

      row.append(number, text, time);
      planList.append(row);
    });
  };

  const renderSegment = () => {
    if (!segments.length || !segments[currentIndex]) return;

    const segment = segments[currentIndex];
    phaseLabel.textContent = segment.label.toUpperCase();
    subtitle.textContent = segment.detail;
    clock.textContent = formatTime(segment.duration);
    stepLabel.textContent = `${currentIndex + 1} / ${segments.length}`;

    planList.querySelectorAll(".plan-row").forEach((row, index) => {
      row.classList.toggle("is-current", index === currentIndex);
      row.classList.toggle("is-done", index < currentIndex);
    });

    const colors = {
      warmup: "ÉCHAUFFEMENT",
      effort: "EFFORT",
      recovery: "RÉCUPÉRATION",
      cooldown: "RETOUR AU CALME"
    };

    statusLabel.textContent = isFinished
      ? "TERMINÉE"
      : isRunning
        ? "EN COURS"
        : "EN ATTENTE";

    timerNotice.textContent = isFinished
      ? "Séance terminée. Tu peux préparer une nouvelle séance."
      : isRunning
        ? "Reste concentré sur l'étape en cours."
        : "Chronomètre en pause ou en attente.";

    const type = colors[segment.kind] || "SÉANCE";
    phaseLabel.dataset.kind = segment.kind;
    phaseLabel.setAttribute("aria-label", type);

    progressBar.style.width = "0%";
  };

  const updateTimerDisplay = () => {
    if (!segments.length || isFinished) return;

    const segment = segments[currentIndex];
    const currentElapsed = elapsedInSegment +
      (isRunning ? (Date.now() - segmentStartedAt) / 1000 : 0);

    const remaining = Math.max(0, segment.duration - currentElapsed);
    clock.textContent = formatTime(remaining);

    const completedBefore = segments
      .slice(0, currentIndex)
      .reduce((sum, item) => sum + item.duration, 0);

    const totalElapsed = completedBefore + currentElapsed;
    elapsedLabel.textContent = formatTime(totalElapsed);
    progressBar.style.width =
      `${Math.min(100, (totalElapsed / getTotalDuration()) * 100)}%`;
  };

  /* ---------- Historique local ---------- */

  const readHistory = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const saveHistory = history => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      return true;
    } catch {
      historyNotice.textContent =
        "Impossible de sauvegarder : le stockage du navigateur est indisponible.";
      return false;
    }
  };

  const renderHistory = () => {
    const history = readHistory();

    historyCount.textContent = String(history.length);

    const totalSeconds = history.reduce(
      (sum, item) => sum + (Number(item.duration) || 0),
      0
    );

    historyDuration.textContent =
      `${Math.round(totalSeconds / 60)} min`;

    historyList.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "Aucune séance terminée pour le moment.";
      historyList.append(empty);
      return;
    }

    history.forEach(item => {
      const row = document.createElement("article");
      row.className = "history-row";

      const info = document.createElement("div");
      info.className = "history-row-info";

      const title = document.createElement("strong");
      title.textContent = item.title;

      const date = document.createElement("span");
      const parsedDate = new Date(item.date);
      date.textContent = Number.isNaN(parsedDate.getTime())
        ? "Date inconnue"
        : parsedDate.toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short"
          });

      info.append(title, date);

      const duration = document.createElement("div");
      duration.className = "history-row-duration";
      duration.textContent = formatLongTime(Number(item.duration) || 0);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-delete";
      remove.textContent = "Supprimer";
      remove.setAttribute("aria-label", `Supprimer ${item.title}`);
      remove.addEventListener("click", () => {
        const updated = readHistory().filter(entry => entry.id !== item.id);
        saveHistory(updated);
        renderHistory();
        historyNotice.textContent = "Séance supprimée de l'historique.";
      });

      row.append(info, duration, remove);
      historyList.append(row);
    });
  };

  const saveCompletedWorkout = () => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: activeWorkout.title,
      date: new Date().toISOString(),
      duration: getTotalDuration()
    };

    const history = readHistory();
    history.unshift(item);

    // On garde les 100 séances les plus récentes.
    const saved = saveHistory(history.slice(0, 100));

    if (saved) {
      renderHistory();
      historyNotice.textContent = "Séance enregistrée dans ton historique.";
    }
  };

  /* ---------- Contrôle du chronomètre ---------- */

  const stopInterval = () => {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const startTimer = () => {
    if (!segments.length) {
      timerNotice.textContent =
        "Prépare d'abord une séance avant de démarrer.";
      return;
    }

    if (isFinished) {
      timerNotice.textContent =
        "Cette séance est terminée. Réinitialise-la pour la refaire.";
      return;
    }

    if (isRunning) return;

    isRunning = true;
    segmentStartedAt = Date.now();
    sessionStartedAt = sessionStartedAt || Date.now();

    startButton.disabled = true;
    pauseButton.disabled = false;
    nextButton.disabled = false;

    statusLabel.textContent = "EN COURS";
    timerNotice.textContent = "Séance en cours.";

    timerInterval = window.setInterval(() => {
      const current = segments[currentIndex];
      const elapsed = elapsedInSegment +
        (Date.now() - segmentStartedAt) / 1000;

      if (elapsed >= current.duration) {
        advanceSegment();
        return;
      }

      updateTimerDisplay();
    }, 200);

    updateTimerDisplay();
  };

  const pauseTimer = () => {
    if (!isRunning) return;

    elapsedInSegment += (Date.now() - segmentStartedAt) / 1000;
    isRunning = false;
    stopInterval();

    startButton.disabled = false;
    pauseButton.disabled = true;

    statusLabel.textContent = "EN PAUSE";
    timerNotice.textContent = "Chronomètre en pause.";
    updateTimerDisplay();
  };

  const advanceSegment = () => {
    if (!segments.length || isFinished) return;

    currentIndex += 1;
    elapsedInSegment = 0;
    segmentStartedAt = Date.now();

    if (currentIndex >= segments.length) {
      finishWorkout();
      return;
    }

    renderSegment();
    updateTimerDisplay();
  };

  const finishWorkout = () => {
    stopInterval();
    isRunning = false;
    isFinished = true;

    startButton.disabled = true;
    pauseButton.disabled = true;
    nextButton.disabled = true;

    phaseLabel.textContent = "SÉANCE TERMINÉE";
    clock.textContent = "00:00";
    subtitle.textContent = "Bravo, séance terminée.";
    statusLabel.textContent = "TERMINÉE";
    stepLabel.textContent = `${segments.length} / ${segments.length}`;
    elapsedLabel.textContent = formatTime(getTotalDuration());
    totalLabel.textContent = formatTime(getTotalDuration());
    progressBar.style.width = "100%";

    planList.querySelectorAll(".plan-row").forEach(row => {
      row.classList.add("is-done");
      row.classList.remove("is-current");
    });

    timerNotice.textContent = "Séance terminée : ajout à ton historique.";
    saveCompletedWorkout();
  };

  const resetTimer = () => {
    stopInterval();

    isRunning = false;
    isFinished = false;
    currentIndex = 0;
    elapsedInSegment = 0;
    segmentStartedAt = 0;
    sessionStartedAt = 0;

    startButton.disabled = !segments.length;
    pauseButton.disabled = true;
    nextButton.disabled = !segments.length;

    if (!segments.length) {
      clock.textContent = "00:00";
      phaseLabel.textContent = "PRÊT À DÉMARRER";
      subtitle.textContent = "Prépare une séance pour commencer.";
      statusLabel.textContent = "EN ATTENTE";
      stepLabel.textContent = "— / —";
      elapsedLabel.textContent = "00:00";
      totalLabel.textContent = "—";
      progressBar.style.width = "0%";
      timerNotice.textContent =
        "Choisis une séance et clique sur « Préparer la séance ».";
      return;
    }

    renderSegment();
    elapsedLabel.textContent = "00:00";
    totalLabel.textContent = formatTime(getTotalDuration());
    progressBar.style.width = "0%";
    timerNotice.textContent = "Séance réinitialisée.";
  };

  const prepareWorkout = () => {
    configError.textContent = "";
    historyNotice.textContent = "";

    try {
      if (["fractionne", "pyramide"].includes(selectedWorkout)) {
        if (readPace() === null) {
          throw new Error("Saisis une allure valide au format 5:00 min/km.");
        }
      }

      activeWorkout = buildWorkout(selectedWorkout);
      segments = activeWorkout.segments;

      if (!segments.length) {
        throw new Error("Aucune étape n'a pu être créée.");
      }

      renderPlan();
      resetTimer();

      startButton.disabled = false;
      nextButton.disabled = false;
      timerNotice.textContent = "Séance prête. Appuie sur « Démarrer ».";

      $("#running-timer").scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    } catch (error) {
      configError.textContent = error.message ||
        "Impossible de préparer cette séance.";
    }
  };

  /* ---------- Événements de l'interface ---------- */

  const updateSelectedWorkout = type => {
    selectedWorkout = type;

    workoutCards.forEach(card => {
      const selected = card.dataset.workout === type;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });

    lab.classList.toggle("is-custom", type === "custom");

    workoutDescription.textContent =
      workoutInfo[type]?.description || "";

    configError.textContent = "";
  };

  workoutCards.forEach(card => {
    card.addEventListener("click", () => {
      updateSelectedWorkout(card.dataset.workout);
    });
  });

  prepareButton.addEventListener("click", prepareWorkout);
  startButton.addEventListener("click", startTimer);
  pauseButton.addEventListener("click", pauseTimer);
  nextButton.addEventListener("click", advanceSegment);
  resetButton.addEventListener("click", resetTimer);

  historyClear.addEventListener("click", () => {
    const history = readHistory();

    if (!history.length) {
      historyNotice.textContent = "L'historique est déjà vide.";
      return;
    }

    if (!window.confirm("Effacer tout l'historique de tes séances ?")) {
      return;
    }

    if (saveHistory([])) {
      renderHistory();
      historyNotice.textContent = "Historique effacé.";
    }
  });

  /* ---------- Initialisation ---------- */

  updateSelectedWorkout("vma");
  renderHistory();
  resetTimer();
})();
