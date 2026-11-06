"use strict";

const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1) Elementos que aparecem ao rolar a página ---------- */
const alvos = [
  ".sabores h2", ".sabores .dica", ".card",
  ".avaliacoes h2", ".avaliacoes .dica", ".avaliacao",
  ".torta h2", ".fotos-torta", ".info-torta h3", ".info-torta > p",
  ".precos-torta", ".daniel-foto", ".daniel-texto", ".faq h2", ".faq-item", ".rodape-marca", ".rodape-links", ".rodape-fim"
].join(", ");

const itens = document.querySelectorAll(alvos);
itens.forEach((el) => el.classList.add("reveal"));

// atraso escalonado: cada irmão aparece um pouquinho depois do anterior
document.querySelectorAll(".carrossel, .info-torta, .faq-lista").forEach((grupo) => {
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
const carrosselSabores = document.querySelector(".sabores .carrossel");
if (carrosselSabores && !reduz && "IntersectionObserver" in window) {
  new IntersectionObserver((lista, obs) => {
    if (!lista[0].isIntersecting) return;
    obs.disconnect();
    setTimeout(() => {
      carrosselSabores.style.scrollSnapType = "none";    // libera o encaixe por um instante
      carrosselSabores.scrollTo({ left: 80, behavior: "smooth" });
      setTimeout(() => {
        carrosselSabores.scrollTo({ left: 0, behavior: "smooth" });
        setTimeout(() => (carrosselSabores.style.scrollSnapType = ""), 500);
      }, 700);
    }, 900);
  }, { threshold: 0.6 }).observe(carrosselSabores);
}

/* ---------- 3) Botão do WhatsApp: fica no canto da tela e vira "Quero torta" na torta ----------
   É UM botão só. Ele troca de lugar no HTML e "voa" entre as posições (técnica FLIP):
   1) guarda onde ele estava  2) muda de lugar  3) anima da posição antiga até a nova. */
const zap = document.getElementById("zap");
const slotTorta = document.querySelector(".slot-torta");

if (zap && slotTorta) {
  const hrefCookies = zap.getAttribute("href");
  const hrefTorta = hrefCookies.split("?")[0] + "?text=" +
                    encodeURIComponent("Oi! Quero pedir torta de cookie");

  // texto e link de cada "estado" do botão (o número vem do HTML)
  const estados = {
    canto: { texto: zap.textContent.trim(), href: hrefCookies },
    torta: { texto: "Quero torta",          href: hrefTorta }
  };
  let atual = "canto";

  if (!reduz) {                                  // entrada: o botão sobe na primeira vez
    zap.classList.add("intro");
    zap.addEventListener("animationend", (e) => {
      if (e.animationName === "entrar") zap.classList.remove("intro");
    });
  }

  function ir(novo) {
    if (novo === atual) return;

    const antes = zap.getBoundingClientRect();           // 1) onde está agora

    if (novo === "canto") document.body.appendChild(zap);   // 2) muda de lugar
    else slotTorta.appendChild(zap);
    zap.classList.toggle("no-canto", novo === "canto");
    zap.textContent = estados[novo].texto;
    zap.href = estados[novo].href;

    const depois = zap.getBoundingClientRect();
    atual = novo;
    if (reduz) return;

    zap.animate([                                         // 3) voa da posição antiga
      { transform: `translate(${antes.left - depois.left}px, ${antes.top - depois.top}px)`,
        width: antes.width + "px", height: antes.height + "px" },
      { transform: "translate(0, 0)",
        width: depois.width + "px", height: depois.height + "px" }
    ], { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }

  // o botão pousa na torta enquanto a "vaga" dela está na tela; fora disso, volta pro canto
  function avaliar() {
    const t = slotTorta.getBoundingClientRect();
    const vh = window.innerHeight;
    const abaixoDoTopo = t.top > (atual === "torta" ? 60 : 120);     // ainda não passou pra cima
    const acimaDoFim   = t.top < vh - (atual === "torta" ? 30 : 90); // já entrou pela parte de baixo
    ir(abaixoDoTopo && acimaDoFim ? "torta" : "canto");
  }

  let esperando = false;
  const agendar = () => {
    if (esperando) return;
    esperando = true;
    requestAnimationFrame(() => { esperando = false; avaliar(); });
  };
  window.addEventListener("scroll", agendar, { passive: true });
  window.addEventListener("resize", agendar);
  avaliar();
}

/* ---------- 4) Carrossel: desfoca os cards que estão saindo da tela ----------
   Mede os cards uma vez só (e de novo se a tela mudar de tamanho) e depois usa
   só contas simples a cada rolagem: isso deixa o deslize leve e fluido. */
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
      const x = card.x - rolagem;                        // posição do card na área visível
      const fora = Math.max(0, -x) + Math.max(0, x + card.w - largura);
      const f = Math.min(fora / card.w, 1);              // 0 = dentro, 1 = totalmente fora
      const t = Math.max(0, (f - 0.55) / 0.45);          // só começa depois que >55% saiu
      const b = Math.round(t * 5 * 2) / 2;               // desfoque máximo: 5px (passos de 0,5)
      const o = Math.round((1 - t * 0.6) * 20) / 20;     // opacidade mínima: 40%
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