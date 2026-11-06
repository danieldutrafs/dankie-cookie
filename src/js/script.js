"use strict";

const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1) Elementos que aparecem ao rolar a página ---------- */
const alvos = [
  ".sabores h2", ".sabores .dica", ".card",
  ".avaliacoes h2", ".avaliacoes .dica", ".avaliacao",
  ".torta h2", ".fotos-torta", ".info-torta h3", ".info-torta > p",
  ".precos-torta", ".info-torta .btn-whats"
].join(", ");

const itens = document.querySelectorAll(alvos);
itens.forEach((el) => el.classList.add("reveal"));

// atraso escalonado: cada irmão aparece um pouquinho depois do anterior
document.querySelectorAll(".carrossel, .info-torta").forEach((grupo) => {
  [...grupo.children].forEach((el, i) =>
    el.style.setProperty("--d", (i % 4) * 0.1 + "s")
  );
});

// conta os preços da torta de 0 até o valor (ex.: R$ 120)
function contar(caixa) {
  if (reduz) return;
  caixa.querySelectorAll("strong").forEach((el) => {
    const fim = parseInt(el.textContent.replace(/\D/g, ""), 10);
    if (!fim) return;
    const inicio = performance.now();
    const duracao = 900;
    (function passo(agora) {
      const p = Math.min((agora - inicio) / duracao, 1);
      el.textContent = "R$ " + Math.round(fim * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    })(inicio);
  });
}

if (reduz || !("IntersectionObserver" in window)) {
  itens.forEach((el) => el.classList.add("visivel"));
} else {
  const observador = new IntersectionObserver(
    (lista) => {
      lista.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        if (e.target.classList.contains("precos-torta")) contar(e.target);
        observador.unobserve(e.target);   // anima só uma vez
      });
    },
    { threshold: 0.2 }
  );
  itens.forEach((el) => observador.observe(el));
}

/* ---------- 2) Dica de "deslize": o carrossel dá uma espiadinha ---------- */
const carrossel = document.querySelector(".sabores .carrossel");
if (carrossel && !reduz && "IntersectionObserver" in window) {
  new IntersectionObserver((lista, obs) => {
    if (!lista[0].isIntersecting) return;
    obs.disconnect();
    setTimeout(() => {
      carrossel.style.scrollSnapType = "none";          // libera o encaixe por um instante
      carrossel.scrollTo({ left: 80, behavior: "smooth" });
      setTimeout(() => {
        carrossel.scrollTo({ left: 0, behavior: "smooth" });
        setTimeout(() => (carrossel.style.scrollSnapType = ""), 500);
      }, 700);
    }, 900);
  }, { threshold: 0.6 }).observe(carrossel);
}

/* ---------- 3) Botão flutuante do WhatsApp: aparece depois de rolar ---------- */
const zap = document.querySelector(".zap-fixo");
if (zap) {
  const atualizar = () => zap.classList.toggle("visivel", window.scrollY > 350);
  window.addEventListener("scroll", atualizar, { passive: true });
  atualizar();
}

/* ---------- 4) Carrossel: desfoca os cards que estão saindo da tela ---------- */
function efeitoCarrossel(c) {
  const itens = [...c.children];
  let esperando = false;

  function atualizar() {
    const area = c.getBoundingClientRect();
    itens.forEach((el) => {
      const r = el.getBoundingClientRect();
      // quanto do card está fora da área visível (0 = dentro, 1 = totalmente fora)
      const fora = Math.max(0, area.left - r.left) + Math.max(0, r.right - area.right);
      const f = Math.min(fora / r.width, 1);
      // só começa a desfocar depois que mais da metade saiu
      const t = Math.max(0, (f - 0.55) / 0.45);
      el.style.setProperty("--b", (t * 5).toFixed(2) + "px");   // desfoque máximo: 5px
      el.style.setProperty("--o", (1 - t * 0.6).toFixed(2));    // opacidade mínima: 40%
    });
    esperando = false;
  }

  c.addEventListener("scroll", () => {
    if (!esperando) { esperando = true; requestAnimationFrame(atualizar); }
  }, { passive: true });
  window.addEventListener("resize", atualizar);
  atualizar();
  setTimeout(atualizar, 900);   // recalcula depois das animações de entrada
}
if (!reduz) document.querySelectorAll(".carrossel").forEach(efeitoCarrossel);