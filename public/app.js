document.documentElement.classList.add("motion-ready");

window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add("motion-in");
  });
});

document.querySelectorAll("[data-open]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    const panel = document.getElementById(trigger.dataset.open);
    if (!panel) return;
    event.preventDefault();
    panel.open = true;
    const input = panel.querySelector("input");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => input?.focus(), 260);
  });
});

document.querySelectorAll("[data-focus-quick]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    const input = document.getElementById("quickText");
    if (!input) return;
    event.preventDefault();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.focus(), 260);
  });
});

document.querySelectorAll("[data-example]").forEach((example) => {
  example.addEventListener("click", () => {
    const input = document.getElementById("quickText");
    if (!input) return;
    input.value = example.dataset.example;
    input.focus();
    input.select();
    input.closest(".quick-console")?.classList.add("is-primed");
    window.setTimeout(() => input.closest(".quick-console")?.classList.remove("is-primed"), 420);
  });
});

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", () => {
    const button = form.querySelector(".btn");
    if (!button || button.classList.contains("danger")) return;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
  });
});
