(() => {
  const lists = document.querySelectorAll("[data-faq]");
  if (!lists.length) return;

  lists.forEach((list) => {
    const buttons = list.querySelectorAll(".faq__btn");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        buttons.forEach((other) => {
          if (other !== button) other.setAttribute("aria-expanded", "false");
        });
        button.setAttribute("aria-expanded", expanded ? "false" : "true");
      });
    });
  });
})();
