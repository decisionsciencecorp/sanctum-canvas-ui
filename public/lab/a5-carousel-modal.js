/**
 * A5.6 / A5.7 lab — Carousel + Modal fixtures (Playwright target for A5.8).
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { registerCarouselModal } from "../assets/js/components/containers/registerCarouselModal.js";

const Text = {
  create(_props, ctx) {
    const el = ctx.document.createElement("span");
    el.setAttribute("data-canvas-component", "Text");
    return el;
  },
  update() {},
  destroy() {},
};

const registry = createComponentRegistry();
registerCarouselModal(registry);
registry.register("Text", Text);

const ctx = createRenderContext({ document, registry });

const carouselMount = document.getElementById("mount-carousel");
const modalMount = document.getElementById("mount-modal");
const openBtn = document.getElementById("open-modal");
const status = document.getElementById("status");

render(
  carouselMount,
  {
    type: "Carousel",
    id: "lab-carousel",
    props: {
      variant: "card",
      children: [
        [
          { type: "Text", id: "c1a", children: ["Slide 1"] },
          { type: "Text", id: "c1b", children: ["Alpha detail"] },
        ],
        [
          { type: "Text", id: "c2a", children: ["Slide 2"] },
          { type: "Text", id: "c2b", children: ["Beta detail"] },
        ],
        [
          { type: "Text", id: "c3a", children: ["Slide 3"] },
          { type: "Text", id: "c3b", children: ["Gamma detail"] },
        ],
      ],
    },
  },
  ctx,
);

/** @type {boolean} */
let modalOpen = false;

function renderModal() {
  render(
    modalMount,
    {
      type: "Modal",
      id: "lab-modal",
      props: {
        title: "Lab dialog",
        open: {
          get: () => modalOpen,
          set: (v) => {
            modalOpen = !!v;
            renderModal();
          },
        },
        size: "md",
        children: [
          { type: "Text", id: "mbody", children: ["Modal body content."] },
        ],
      },
    },
    ctx,
  );
}

renderModal();

openBtn?.addEventListener("click", () => {
  modalOpen = true;
  renderModal();
});

if (status) status.textContent = "Ready. The arrows move the slides. The dialog stays closed until you open it.";
