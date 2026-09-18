/**
 * Register A5.6 Carousel + A5.7 Modal.
 * Filename isolated so Tabs (A5.4) / Section (A5.5) can own their own
 * register* modules under containers/ without merge collisions.
 *
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */

import { Carousel } from "./Carousel.js";
import { Modal } from "./Modal.js";

export const CAROUSEL_MODAL_COMPONENTS = Object.freeze({
  Carousel,
  Modal,
});

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */
export function registerCarouselModal(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCarouselModal: registry with register() required");
  }
  registry.register("Carousel", Carousel);
  registry.register("Modal", Modal);
  return registry;
}

export { Carousel, Modal };
export default registerCarouselModal;
