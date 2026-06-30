// Animacao de contagem (count-up / count-down) nos cards de metrica.
// "dinheiro entrando" sobe; "dinheiro saindo" desce. ~400-600ms, ease-out, accent.

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateValue(elNode, from, to, { money = false, currency = "R$" } = {}) {
  if (!elNode) return;
  const card = elNode.closest(".metric");

  const render = (val) => {
    elNode.textContent = money
      ? UI.fmtMoney(val, currency)
      : Math.round(val).toLocaleString("pt-BR");
  };

  if (prefersReduced || from === to) {
    render(to);
    return;
  }

  const diff = Math.abs(to - from);
  const duration = Math.min(600, Math.max(400, 400 + diff)); // 400-600ms proporcional
  const start = performance.now();

  elNode.classList.add("counting");
  if (card) {
    card.classList.remove("pulse");
    void card.offsetWidth; // reinicia animacao
    card.classList.add("pulse");
  }

  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = easeOut(p);
    const current = from + (to - from) * eased;
    render(current);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      render(to);
      elNode.classList.remove("counting");
    }
  }
  requestAnimationFrame(frame);
}

window.animateValue = animateValue;
