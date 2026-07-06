document.querySelectorAll("[data-open]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const panel = document.getElementById(trigger.dataset.open);
    if (!panel) return;
    panel.open = true;
    const input = panel.querySelector("input");
    window.setTimeout(() => input?.focus(), 180);
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
