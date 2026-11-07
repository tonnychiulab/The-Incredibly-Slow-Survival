import { BRAND } from '../brand';

const CUTE_HORSE_SVG = `
<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="老馬圖示">
  <rect x="8" y="8" width="80" height="80" rx="20" fill="#2A241E" stroke="#E0A96D" stroke-width="3"/>
  <!-- 耳朵 -->
  <path d="M32 28L26 14L40 22Z" fill="#C68B59"/>
  <path d="M64 28L70 14L56 22Z" fill="#C68B59"/>
  <!-- 鬃毛 -->
  <rect x="42" y="18" width="12" height="10" rx="5" fill="#5C3D2E"/>
  <!-- 馬頭 -->
  <rect x="26" y="24" width="44" height="38" rx="14" fill="#D79968"/>
  <!-- 口鼻部 -->
  <rect x="28" y="48" width="40" height="22" rx="11" fill="#F2D0A9"/>
  <!-- 眼睛 -->
  <circle cx="38" cy="39" r="4" fill="#1E1A17"/>
  <circle cx="58" cy="39" r="4" fill="#1E1A17"/>
  <circle cx="39.5" cy="37.5" r="1.3" fill="#FFFFFF"/>
  <circle cx="59.5" cy="37.5" r="1.3" fill="#FFFFFF"/>
  <!-- 腮紅 -->
  <ellipse cx="33" cy="45" rx="4" ry="2.2" fill="#E88D8A" opacity="0.75"/>
  <ellipse cx="63" cy="45" rx="4" ry="2.2" fill="#E88D8A" opacity="0.75"/>
  <!-- 鼻孔与微笑 -->
  <circle cx="41" cy="56" r="2" fill="#6E473B"/>
  <circle cx="55" cy="56" r="2" fill="#6E473B"/>
  <path d="M43 63Q48 67 53 63" stroke="#6E473B" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`;

export class Loading {
  private overlay: HTMLDivElement | null = null;
  private showTimer: number | null = null;

  public begin(container: HTMLElement): void {
    this.clearTimer();
    // 依 contract.md §3：載入超過 300ms 才顯示載入畫面
    this.showTimer = window.setTimeout(() => {
      this.renderOverlay(container);
    }, 300);
  }

  public finish(): void {
    this.clearTimer();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private clearTimer(): void {
    if (this.showTimer !== null) {
      window.clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private renderOverlay(container: HTMLElement): void {
    if (this.overlay) {
      return;
    }
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'background:#121316',
      'color:#F5E6D3',
      'font-family:"Sarasa Mono TC",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
      'z-index:9999',
      'gap:12px',
    ].join(';');

    el.innerHTML = `
      <div>${CUTE_HORSE_SVG}</div>
      <div style="font-size:20px;font-weight:700;letter-spacing:2px;">${BRAND.STUDIO}</div>
      <div style="font-size:14px;opacity:0.8;">${BRAND.GAME_TITLE} — 載入中…</div>
    `;
    container.appendChild(el);
    this.overlay = el;
  }
}
