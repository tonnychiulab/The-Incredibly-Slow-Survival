import { BRAND } from './brand';
import { Game } from './core/Game';

document.title = BRAND.PAGE_TITLE;

let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
if (!iconLink) {
  iconLink = document.createElement('link');
  iconLink.rel = 'icon';
  document.head.appendChild(iconLink);
}
iconLink.href = BRAND.FAVICON_SVG;

const app = document.getElementById('app');
if (app) {
  const game = new Game(app);
  game.start();
}
