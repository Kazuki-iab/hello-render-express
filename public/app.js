document.documentElement.classList.add("motion-ready");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = reduceMotion ? "auto" : "smooth";
const views = Array.from(document.querySelectorAll("[data-view]"));
const routeButtons = Array.from(document.querySelectorAll("[data-route]"));
const manageButtons = Array.from(document.querySelectorAll("[data-manage-target]"));
const managePanels = Array.from(document.querySelectorAll("[data-manage-panel]"));
const calendarDayButtons = Array.from(document.querySelectorAll("[data-calendar-day]"));
const dayPanels = Array.from(document.querySelectorAll("[data-day-panel]"));
const managePanelNames = managePanels.map((panel) => panel.dataset.managePanel);
const supportedRoutes = new Set(["home", "input", "history", "manage"]);
let currentManagePanel = "expense";

function readLocation() {
  const match = location.hash.match(/^#manage(?:-(expense|income|fixed|budget|analysis))?$/);
  if (match) return { route: "manage", panel: match[1] || "expense" };
  const route = location.hash.replace(/^#/, "");
  return { route: supportedRoutes.has(route) ? route : "home", panel: "expense" };
}

function locationHash(route, panel = "expense") {
  if (route === "manage") return `#manage-${panel}`;
  return `#${supportedRoutes.has(route) ? route : "home"}`;
}

function fitBalanceAmount() {
  const amount = document.querySelector(".balance-overview h1:not(.empty-title)");
  if (!amount) return;

  amount.style.fontSize = "";
  let size = Number.parseFloat(window.getComputedStyle(amount).fontSize);
  while (amount.scrollWidth > amount.clientWidth && size > 24) {
    size -= 1;
    amount.style.fontSize = `${size}px`;
  }
}

function setManagePanel(target, options = {}) {
  const nextTarget = managePanels.some((panel) => panel.dataset.managePanel === target) ? target : "expense";
  currentManagePanel = nextTarget;

  manageButtons.forEach((button) => {
    const active = button.dataset.manageTarget === nextTarget;
    button.classList.toggle("is-current", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  managePanels.forEach((panel) => {
    const active = panel.dataset.managePanel === nextTarget;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
    if (active && options.focus) {
      const heading = panel.querySelector("h2");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  });

  if (options.push && document.body.dataset.route === "manage") {
    const hash = locationHash("manage", nextTarget);
    if (location.hash !== hash) history.pushState({ route: "manage", panel: nextTarget }, "", hash);
  }
}

function setRoute(route, options = {}) {
  const nextRoute = supportedRoutes.has(route) ? route : "home";

  views.forEach((view) => {
    const active = view.dataset.view === nextRoute;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });

  routeButtons.forEach((button) => {
    const active = button.dataset.route === nextRoute;
    button.classList.toggle("is-current", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  document.body.dataset.route = nextRoute;

  if (options.push) {
    document.querySelector(".message")?.remove();
    const hash = locationHash(nextRoute, currentManagePanel);
    if (location.hash !== hash) history.pushState({ route: nextRoute, panel: currentManagePanel }, "", hash);
  }

  window.scrollTo({ top: 0, behavior: "auto" });

  if (nextRoute === "input") {
    const thread = document.querySelector(".chat-thread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  if (options.focus) {
    const heading = document.getElementById(`${nextRoute}-title`);
    window.setTimeout(() => heading?.focus({ preventScroll: true }), reduceMotion ? 0 : 180);
  }
}

function setCalendarDay(date) {
  calendarDayButtons.forEach((button) => {
    const selected = button.dataset.calendarDay === date;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  dayPanels.forEach((panel) => {
    const selected = panel.dataset.dayPanel === date;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
}

routeButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setRoute(button.dataset.route, { push: true, focus: true });
  });
});

manageButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setManagePanel(button.dataset.manageTarget, { push: true, focus: true });
  });
});

document.querySelectorAll("[data-go-manage]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setManagePanel(button.dataset.goManage);
    setRoute("manage", { push: true, focus: true });
  });
});

document.querySelectorAll("[data-focus-quick]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    setRoute("input", { push: true });
    const input = document.getElementById("quickText");
    input?.scrollIntoView({ behavior: scrollBehavior, block: "center" });
    window.setTimeout(() => input?.focus(), reduceMotion ? 0 : 180);
  });
});

calendarDayButtons.forEach((button) => {
  button.addEventListener("click", () => setCalendarDay(button.dataset.calendarDay));
});

document.querySelectorAll("[data-example]").forEach((example) => {
  example.addEventListener("click", () => {
    const input = document.getElementById("quickText");
    if (!input) return;
    input.value = example.dataset.example;
    input.focus();
    input.select();
    input.closest(".quick-entry")?.classList.add("is-primed");
    window.setTimeout(() => input.closest(".quick-entry")?.classList.remove("is-primed"), reduceMotion ? 0 : 360);
  });
});

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (form.dataset.submitting === "true") {
      event.preventDefault();
      return;
    }
    form.dataset.submitting = "true";
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.classList.add("is-submitting");
    button.setAttribute("aria-busy", "true");
    button.disabled = true;
    form.closest(".quick-entry")?.classList.add("is-launching");
  });
});

function syncLocation() {
  const state = readLocation();
  const previousRoute = document.body.dataset.route;
  const panelChanged = currentManagePanel !== state.panel;
  setManagePanel(state.panel, { focus: state.route === "manage" && previousRoute === "manage" && panelChanged });
  setRoute(state.route, { focus: previousRoute !== state.route });
}

window.addEventListener("popstate", syncLocation);
window.addEventListener("resize", () => requestAnimationFrame(fitBalanceAmount));

window.addEventListener("load", () => {
  const state = readLocation();
  const canonicalHash = locationHash(state.route, state.panel);
  if (location.hash !== canonicalHash) history.replaceState(state, "", canonicalHash);
  setManagePanel(managePanelNames.includes(state.panel) ? state.panel : "expense");
  setRoute(state.route);
  fitBalanceAmount();
  const message = document.querySelector(".message");
  if (message) {
    message.classList.add("is-visible");
    if (!message.classList.contains("is-error")) {
      document.documentElement.classList.add("transaction-complete");
      window.setTimeout(() => document.documentElement.classList.remove("transaction-complete"), reduceMotion ? 0 : 1100);
      window.setTimeout(() => {
        message.classList.remove("is-visible");
        window.setTimeout(() => { message.hidden = true; }, reduceMotion ? 0 : 240);
      }, 3200);
    }
  }
  requestAnimationFrame(() => document.documentElement.classList.add("motion-in"));
});
