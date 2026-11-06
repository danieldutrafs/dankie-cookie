"use strict";

const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1) Elementos que aparecem ao rolar a página ---------- */
const alvos = [
  ".sabores h2", ".sabores .dica", ".card",
  ".avaliacoes h2", ".avaliacoes .dica", ".avaliacao",
  ".torta h2", ".fotos-torta", ".info-torta h3", ".info-torta > p",
  ".precos-torta", ".daniel", ".faq"
].join(", ");

const itens = document.querySelectorAll(alvos);
itens.forEach((el) => el.classList.add("reveal"));

if (reduz || !("IntersectionObserver" in window)) {
  itens.forEach((el) => el.classList.add("visivel"));
} else {
  const observador = new IntersectionObserver(
    (lista) => {
      lista.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        observador.unobserve(e.target);
      });
    },
    { threshold: 0.15 }
  );
  itens.forEach((el) => observador.observe(el));
}

/* ---------- 2) Efeito de desfoque lateral no carrossel ---------- */
function efeitoCarrossel(c) {
  let largura = 0;
  let cards = [];

  function medir() {
    largura = c.clientWidth;
    cards = [...c.children].map((el) => ({
      el, x: el.offsetLeft, w: el.offsetWidth, b: -1, o: -1
    }));
    atualizar();
  }

  function atualizar() {
    const rolagem = c.scrollLeft;
    cards.forEach((card) => {
      const x = card.x - rolagem;
      const fora = Math.max(0, -x) + Math.max(0, x + card.w - largura);
      const f = Math.min(fora / card.w, 1);
      const t = Math.max(0, (f - 0.55) / 0.45);
      const b = Math.round(t * 5 * 2) / 2;
      const o = Math.round((1 - t * 0.6) * 20) / 20;
      if (b !== card.b) { card.el.style.setProperty("--b", b + "px"); card.b = b; }
      if (o !== card.o) { card.el.style.setProperty("--o", o); card.o = o; }
    });
  }

  let esperando = false;
  c.addEventListener("scroll", () => {
    if (esperando) return;
    esperando = true;
    requestAnimationFrame(() => { esperando = false; atualizar(); });
  }, { passive: true });
  window.addEventListener("resize", medir);
  medir();
}
if (!reduz) document.querySelectorAll(".carrossel").forEach(efeitoCarrossel);