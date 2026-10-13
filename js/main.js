/**
 * Rhinomedica landing page — interactions & motion.
 * Animations are built with Motion (https://motion.dev), loaded as an ES module.
 */
import {
  animate,
  inView,
  scroll,
  stagger,
} from "https://cdn.jsdelivr.net/npm/motion@14.1.0/+esm";

window.__motionReady = true;

const root = document.documentElement;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: "spring", stiffness: 170, damping: 24 };

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ------------------------------------------------------------------ */
/* Text splitting: wraps each word so lines can slide up from a mask   */
/* ------------------------------------------------------------------ */
function splitWords(el) {
  const label = el.textContent.replace(/\s+/g, " ").trim();
  const frag = document.createDocumentFragment();

  const makeWord = (word, extraClass, stroke) => {
    const outer = document.createElement("span");
    outer.className = "w";
    const inner = document.createElement("span");
    inner.className = extraClass ? `w__i ${extraClass}` : "w__i";
    inner.textContent = word;
    if (stroke) inner.appendChild(stroke);
    outer.appendChild(inner);
    return outer;
  };

  const pushText = (text, extraClass, stroke) => {
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
      else frag.appendChild(makeWord(part, extraClass, stroke));
    });
  };

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) pushText(node.textContent);
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const stroke = node.querySelector(".stroke");
      pushText(node.textContent, node.className, stroke);
    }
  });

  el.setAttribute("aria-label", label);
  el.replaceChildren(frag);
  el.classList.add("words");
  return $$(".w__i", el);
}

/* ------------------------------------------------------------------ */
/* Hero: one orchestrated load sequence + scroll parallax              */
/* ------------------------------------------------------------------ */
function initHero() {
  const hero = $(".hero");
  if (!hero) return;
  const media = $(".hero__media", hero);
  const img = $("img", media);
  const title = $(".hero__title", hero);
  const words = title ? splitWords(title) : [];

  if (REDUCED) return;

  animate(img, { scale: [1.16, 1] }, { duration: 3, ease: [0.2, 0.7, 0.2, 1] });
  animate($(".hero__logo", hero), { opacity: [0, 1], y: [-8, 0] }, { duration: 0.7, delay: 0.15, ease: EASE });
  animate(words, { y: ["110%", "0%"] }, { duration: 0.9, delay: stagger(0.06, { startDelay: 0.35 }), ease: EASE });
  animate($$(".hero__bullets li", hero), { opacity: [0, 1], x: [-14, 0] }, { duration: 0.6, delay: stagger(0.09, { startDelay: 0.95 }), ease: EASE });
  animate($(".hero__cta", hero), { opacity: [0, 1], y: [16, 0] }, { duration: 0.7, delay: 1.35, ease: EASE });

  // Parallax: the photo drifts slower than the page.
  scroll(animate(media, { y: [0, 160] }, { ease: "linear" }), {
    target: hero,
    offset: ["start start", "end start"],
  });
}

/* ------------------------------------------------------------------ */
/* Scroll reveals                                                      */
/* ------------------------------------------------------------------ */
function initReveals() {
  // Split every headline marked for word reveal (outside the hero).
  $$("[data-words]:not(.hero__title)").forEach(splitWords);

  if (REDUCED) return;

  const margin = "0px 0px -12% 0px";

  inView(
    "[data-reveal]",
    (el) => {
      const type = el.dataset.reveal;
      if (type === "words") {
        animate($$(".w__i", el), { y: ["110%", "0%"] }, { duration: 0.8, delay: stagger(0.045), ease: EASE });
      } else if (type === "clip") {
        animate(el, { clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"], opacity: [0, 1] }, { duration: 1, ease: EASE });
        const img = $("img", el);
        if (img) animate(img, { scale: [1.18, 1] }, { duration: 1.5, ease: EASE });
      } else if (type === "fade") {
        animate(el, { opacity: [0, 1] }, { duration: 0.8, ease: EASE });
      } else {
        animate(el, { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, ease: EASE });
      }
    },
    { margin }
  );

  inView(
    "[data-reveal-stagger]",
    (el) => {
      animate(Array.from(el.children), { opacity: [0, 1], y: [28, 0] }, { duration: 0.7, delay: stagger(0.1), ease: EASE });
    },
    { margin }
  );

  // Price counter
  inView(".price__val", (el) => {
    const end = Number(el.dataset.count || 0);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    animate(0, end, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v).toLocaleString("de-DE")}${suffix}`;
      },
    });
    const line = el.nextElementSibling;
    if (line) animate(line, { scaleX: [0, 1] }, { duration: 0.8, delay: 1.2, ease: EASE });
  });

  // Hand-drawn underline under "geformt"
  inView(".piezo .stroke", (el) => {
    animate(el, { scaleX: [0, 1] }, { duration: 0.9, delay: 0.7, ease: EASE });
  });
}

/* ------------------------------------------------------------------ */
/* Before/After compare slider                                         */
/* ------------------------------------------------------------------ */
function initCompare() {
  const compare = $("#compare");
  if (!compare) return;
  const range = $(".compare__range", compare);
  const before = $(".compare__img--before", compare);
  const after = $(".compare__img--after", compare);

  const setPos = (v) => compare.style.setProperty("--pos", `${v}%`);
  range.addEventListener("input", () => setPos(range.value));

  // Gentle hint once the slider is on screen: it nudges left, right, back.
  if (!REDUCED) {
    inView(compare, () => {
      let stop = false;
      const cancel = () => { stop = true; };
      range.addEventListener("pointerdown", cancel, { once: true });
      const step = (from, to, dur) =>
        animate(from, to, { duration: dur, ease: EASE, onUpdate: (v) => { if (!stop) { range.value = v; setPos(v); } } });
      step(50, 36, 0.7).then(() => step(36, 62, 0.9)).then(() => step(62, 50, 0.7));
    }, { amount: 0.6 });
  }

  // Chips swap the image pair with a crossfade.
  const chips = $$("#chips .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", async () => {
      if (chip.getAttribute("aria-pressed") === "true") return;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));

      const srcBefore = chip.dataset.before;
      const srcAfter = chip.dataset.after;
      await Promise.all([srcBefore, srcAfter].map(preload));

      if (REDUCED) {
        before.src = srcBefore; after.src = srcAfter; range.value = 50; setPos(50);
        return;
      }
      await animate(compare, { opacity: [1, 0], scale: [1, 0.985] }, { duration: 0.2, ease: "easeIn" });
      before.src = srcBefore;
      after.src = srcAfter;
      range.value = 50;
      setPos(50);
      animate(compare, { opacity: [0, 1], scale: [0.985, 1] }, { duration: 0.45, ease: EASE });
    });
  });
}

function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve(src);
    img.src = src;
  });
}

/* ------------------------------------------------------------------ */
/* Toggle: OP Bilder / Ergebnisse                                      */
/* ------------------------------------------------------------------ */
function initToggle() {
  const toggle = $(".toggle");
  if (!toggle) return;
  const tabs = $$(".toggle__btn", toggle);
  const panes = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));

  const chips = $("#chips");

  // The nose-type chips only belong to the "OP Bilder" view.
  const setChipsVisible = async (visible) => {
    if (!chips) return;
    if (REDUCED) { chips.hidden = !visible; return; }
    if (visible) {
      chips.hidden = false;
      const h = chips.scrollHeight;
      chips.style.overflow = "hidden";
      await animate(chips, { opacity: [0, 1], height: [0, h] }, { duration: 0.4, ease: EASE });
      chips.style.height = "";
      chips.style.overflow = "";
    } else {
      const h = chips.scrollHeight;
      chips.style.overflow = "hidden";
      await animate(chips, { opacity: [1, 0], height: [h, 0] }, { duration: 0.3, ease: "easeIn" });
      chips.hidden = true;
      chips.style.height = "";
      chips.style.overflow = "";
    }
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      if (tab.getAttribute("aria-selected") === "true") return;
      toggle.dataset.active = String(i);
      tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
      setChipsVisible(i === 0);
      panes.forEach((pane, j) => {
        if (j === i) {
          pane.hidden = false;
          if (!REDUCED) animate(pane, { opacity: [0, 1], y: [12, 0] }, { duration: 0.5, ease: EASE });
        } else {
          pane.hidden = true;
        }
      });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Generic track carousel (Vorher/Nachher gallery, result videos)      */
/* ------------------------------------------------------------------ */
function initTrackCarousels() {
  $$("[data-carousel]").forEach((viewport) => {
    const key = viewport.dataset.carousel;
    const track = $(".c-track", viewport);
    const slides = $$(".c-slide", viewport);
    const nav = $(`[data-carousel-nav="${key}"]`);
    if (!track || !slides.length || !nav) return;

    const prev = $("[data-prev]", nav);
    const next = $("[data-next]", nav);
    const dotsWrap = $(".cnav__dots", nav);
    let index = 0;

    const dots = slides.map((_, i) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "cnav__dot";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", `Slide ${i + 1} von ${slides.length}`);
      d.addEventListener("click", () => go(i));
      dotsWrap.appendChild(d);
      return d;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      dots.forEach((d, j) => d.setAttribute("aria-current", String(j === index)));
      slides.forEach((s, j) => s.setAttribute("aria-hidden", String(j !== index)));
      animate(track, { x: `${-index * 100}%` }, REDUCED ? { duration: 0 } : SPRING);
    }

    prev.addEventListener("click", () => go(index - 1));
    next.addEventListener("click", () => go(index + 1));
    attachSwipe(viewport, () => go(index + 1), () => go(index - 1));
    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    });
    go(0);
  });
}

/* ------------------------------------------------------------------ */
/* Peek carousel (Patientenstimmen)                                     */
/* ------------------------------------------------------------------ */
function initPeekCarousel() {
  const rootEl = $("[data-peek]");
  if (!rootEl) return;
  const stage = $(".voices__stage", rootEl);
  const cards = $$(".voices__card", rootEl);
  const n = cards.length;
  const prev = $("[data-prev]", rootEl);
  const next = $("[data-next]", rootEl);
  const dotsWrap = $(".cnav__dots", rootEl);
  const capName = $("[data-caption-name]", rootEl);
  const capTreat = $("[data-caption-treatment]", rootEl);
  let index = Math.min(1, n - 1);

  const dots = cards.map((_, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "cnav__dot";
    d.setAttribute("role", "tab");
    d.setAttribute("aria-label", `Patientenstimme ${i + 1} von ${n}`);
    d.addEventListener("click", () => go(i));
    dotsWrap.appendChild(d);
    return d;
  });

  function layout(animated = true) {
    const stageW = stage.clientWidth;
    const cardW = cards[0].offsetWidth;
    const offset = cardW * (stageW < 600 ? 0.86 : 0.96);

    cards.forEach((card, i) => {
      let rel = (i - index + n) % n;
      if (rel > n / 2) rel -= n;
      const isCenter = rel === 0;
      const visible = Math.abs(rel) <= 1;
      const target = {
        x: rel * offset,
        scale: isCenter ? 1 : 0.8,
        opacity: isCenter ? 1 : visible ? 0.85 : 0,
      };
      card.style.zIndex = isCenter ? 3 : visible ? 2 : 1;
      card.setAttribute("aria-hidden", String(!isCenter));
      card.classList.toggle("is-active", isCenter);
      $$("button", card).forEach((b) => (b.tabIndex = isCenter ? 0 : -1));
      animate(card, target, animated && !REDUCED ? SPRING : { duration: 0 });
    });

    dots.forEach((d, j) => d.setAttribute("aria-current", String(j === index)));
  }

  async function go(i, animated = true) {
    const nextIndex = (i + n) % n;
    if (nextIndex === index && animated) return;
    index = nextIndex;
    layout(animated);
    const card = cards[index];
    if (!REDUCED && animated) {
      await animate([capName, capTreat], { opacity: 0, y: -4 }, { duration: 0.15 });
    }
    capName.textContent = card.dataset.name || "";
    capTreat.textContent = card.dataset.treatment || "";
    if (!REDUCED && animated) animate([capName, capTreat], { opacity: [0, 1], y: [6, 0] }, { duration: 0.35, ease: EASE });
  }

  prev.addEventListener("click", () => go(index - 1));
  next.addEventListener("click", () => go(index + 1));
  cards.forEach((card, i) =>
    card.addEventListener("click", (e) => {
      if (i !== index) { e.preventDefault(); go(i); }
    })
  );
  rootEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  });
  attachSwipe(stage, () => go(index + 1), () => go(index - 1));
  window.addEventListener("resize", debounce(() => layout(false), 150));

  go(index, false);
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                       */
/* ------------------------------------------------------------------ */
function initFaq() {
  const items = $$(".faq__item");
  if (!items.length) return;

  const open = (btn, panel) => {
    btn.setAttribute("aria-expanded", "true");
    panel.dataset.open = "true";
    if (REDUCED) { panel.style.height = "auto"; return; }
    const h = panel.scrollHeight;
    panel.style.height = "0px";
    animate(panel, { height: [0, h] }, { duration: 0.5, ease: EASE }).then(() => { panel.style.height = "auto"; });
    animate($(".faq__a-inner", panel), { opacity: [0, 1], y: [-6, 0] }, { duration: 0.45, delay: 0.1, ease: EASE });
  };

  const close = (btn, panel) => {
    btn.setAttribute("aria-expanded", "false");
    if (REDUCED) { panel.dataset.open = "false"; panel.style.height = ""; return; }
    const h = panel.scrollHeight;
    panel.style.height = `${h}px`;
    animate(panel, { height: [h, 0] }, { duration: 0.4, ease: EASE }).then(() => {
      panel.dataset.open = "false";
      panel.style.height = "";
    });
  };

  items.forEach((item) => {
    const btn = $(".faq__q", item);
    const panel = $(".faq__a", item);
    if (panel.dataset.open === "true") panel.style.height = "auto";

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      // One open answer at a time
      items.forEach((other) => {
        if (other === item) return;
        const ob = $(".faq__q", other);
        const op = $(".faq__a", other);
        if (ob.getAttribute("aria-expanded") === "true") close(ob, op);
      });
      isOpen ? close(btn, panel) : open(btn, panel);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Lead modal                                                          */
/* ------------------------------------------------------------------ */
function initModal() {
  const modal = $("#angebot");
  if (!modal) return;
  const card = $(".modal__card", modal);
  const form = $("#lead-form", modal);
  const success = $("#lead-success", modal);
  let lastFocus = null;

  const openModal = (trigger) => {
    lastFocus = trigger || document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (!REDUCED) {
      animate($(".modal__backdrop", modal), { opacity: [0, 1] }, { duration: 0.3 });
      animate(card, { opacity: [0, 1], y: [28, 0], scale: [0.96, 1] }, { type: "spring", stiffness: 260, damping: 26 });
    }
    const first = $("input, select, textarea, button", form) || $(".modal__close", modal);
    window.setTimeout(() => first && first.focus(), 60);
  };

  const closeModal = async () => {
    if (!REDUCED) {
      await animate(card, { opacity: [1, 0], y: [0, 16], scale: [1, 0.97] }, { duration: 0.22, ease: "easeIn" });
    }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };

  $$("[data-open-modal]").forEach((btn) => btn.addEventListener("click", () => openModal(btn)));
  $$("[data-close-modal]", modal).forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // Focus trap
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = $$("button, [href], input, select, textarea", modal).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Upload label feedback
  const fileInput = $('input[type="file"]', form);
  const uploadLabel = $("[data-upload-label]", form);
  if (fileInput && uploadLabel) {
    fileInput.addEventListener("change", () => {
      const count = fileInput.files.length;
      uploadLabel.textContent = count ? `${count} ${count === 1 ? "Foto" : "Fotos"} ausgewählt` : "Fotos Deiner Nase hochladen (bis zu 4)";
    });
  }

  // Submit (front-end only — wire to your CRM/endpoint)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    submit.textContent = "Wird gesendet …";
    await new Promise((r) => window.setTimeout(r, 700));
    form.hidden = true;
    success.classList.add("is-visible");
    if (!REDUCED) animate(success, { opacity: [0, 1], y: [12, 0] }, { duration: 0.5, ease: EASE });
    $(".modal__close", modal).focus();
  });
}

/* ------------------------------------------------------------------ */
/* Video lightbox                                                      */
/* ------------------------------------------------------------------ */
function initLightbox() {
  const box = $("#lightbox");
  if (!box) return;
  const body = $(".lightbox__body", box);
  const fallback = $("[data-lightbox-fallback]", box);
  let video = null;
  let lastFocus = null;

  const openBox = (src, trigger) => {
    lastFocus = trigger;
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (src) {
      fallback.hidden = true;
      video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      body.appendChild(video);
    } else {
      fallback.hidden = false;
    }
    if (!REDUCED) animate(body, { opacity: [0, 1], scale: [0.94, 1] }, { type: "spring", stiffness: 240, damping: 26 });
    $("[data-close-lightbox]", box).focus();
  };

  const closeBox = () => {
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (video) { video.pause(); video.remove(); video = null; }
    if (lastFocus) lastFocus.focus();
  };

  $$(".play").forEach((btn) => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openBox(btn.dataset.video || "", btn);
  }));
  $("[data-close-lightbox]", box).addEventListener("click", closeBox);
  box.addEventListener("click", (e) => { if (e.target === box) closeBox(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.classList.contains("is-open")) closeBox();
  });
}

/* ------------------------------------------------------------------ */
/* Sticky CTA on small screens                                         */
/* ------------------------------------------------------------------ */
function initStickyCta() {
  const bar = $("#sticky-cta");
  const hero = $(".hero");
  if (!bar || !hero) return;
  const btn = $("button", bar);
  inView(hero, () => {
    bar.classList.remove("is-visible");
    bar.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    return () => {
      bar.classList.add("is-visible");
      bar.setAttribute("aria-hidden", "false");
      btn.tabIndex = 0;
    };
  }, { amount: 0.05 });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function attachSwipe(el, onLeft, onRight) {
  let startX = 0;
  let startY = 0;
  let active = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    active = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  el.addEventListener("pointerup", (e) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
  });
  el.addEventListener("pointercancel", () => { active = false; });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

/* ------------------------------------------------------------------ */
let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  initHero();
  initReveals();
  initCompare();
  initToggle();
  initTrackCarousels();
  initPeekCarousel();
  initFaq();
  initModal();
  initLightbox();
  initStickyCta();
}

// Module scripts execute before DOMContentLoaded, except when loaded late.
if (document.readyState === "complete") init();
else document.addEventListener("DOMContentLoaded", init, { once: true });
