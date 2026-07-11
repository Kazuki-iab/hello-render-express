document.documentElement.classList.add("motion-ready");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = reduceMotion ? "auto" : "smooth";

function fitBalanceAmount() {
  const amount = document.querySelector(".balance-primary h1:not(.empty-title)");
  if (!amount) return;

  amount.style.fontSize = "";
  let size = Number.parseFloat(window.getComputedStyle(amount).fontSize);
  while (amount.scrollWidth > amount.clientWidth && size > 24) {
    size -= 1;
    amount.style.fontSize = `${size}px`;
  }
}

window.addEventListener("load", () => {
  fitBalanceAmount();
  requestAnimationFrame(() => {
    document.documentElement.classList.add("motion-in");
  });
});

window.addEventListener("resize", () => requestAnimationFrame(fitBalanceAmount));

document.querySelectorAll("[data-open]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    const panel = document.getElementById(trigger.dataset.open);
    if (!panel) return;
    event.preventDefault();
    panel.open = true;
    const input = panel.querySelector("input");
    panel.scrollIntoView({ behavior: scrollBehavior, block: "start" });
    window.setTimeout(() => input?.focus(), reduceMotion ? 0 : 220);
  });
});

document.querySelectorAll("[data-focus-quick]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    const input = document.getElementById("quickText");
    if (!input) return;
    event.preventDefault();
    input.scrollIntoView({ behavior: scrollBehavior, block: "center" });
    window.setTimeout(() => input.focus(), reduceMotion ? 0 : 220);
  });
});

document.querySelectorAll("[data-example]").forEach((example) => {
  example.addEventListener("click", () => {
    const input = document.getElementById("quickText");
    if (!input) return;
    input.value = example.dataset.example;
    input.focus();
    input.select();
    input.closest(".quick-entry")?.classList.add("is-primed");
    window.setTimeout(() => input.closest(".quick-entry")?.classList.remove("is-primed"), reduceMotion ? 0 : 400);
  });
});

document.querySelector(".message")?.classList.add("is-visible");

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", () => {
    const button = form.querySelector(".btn");
    if (!button || button.classList.contains("danger")) return;
    button.classList.add("is-submitting");
    button.setAttribute("aria-busy", "true");
  });
});
