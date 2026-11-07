import { BRAND } from '../brand';
import { CONFIG } from '../config';
import { Sloth } from '../player/Sloth';
import type { SimulationState } from '../types';

export class HUD {
  private root: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private chargeLabelEl: HTMLDivElement;
  private chargeBarFillEl: HTMLDivElement;
  private sonarBarFillEl: HTMLDivElement;
  private sonarLabelEl: HTMLDivElement;
  private bannerEl: HTMLDivElement;
  private resultModalEl: HTMLDivElement;
  private onRestartCb?: () => void;

  constructor(container: HTMLElement, onRestart?: () => void) {
    this.onRestartCb = onRestart;
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'font-family:"Sarasa Mono TC",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
      'color:#F3F4F6',
      'padding:16px 20px',
      'display:flex',
      'flex-direction:column',
      'justify-content:space-between',
      'user-select:none',
      'z-index:10',
    ].join(';');

    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;';

    const titleBlock = document.createElement('div');
    titleBlock.innerHTML = `
      <div style="font-size:18px;font-weight:700;color:#FBBF24;">${BRAND.GAME_TITLE}</div>
      <div style="font-size:12px;opacity:0.75;">${BRAND.SUBTITLE} · ${BRAND.STUDIO}</div>
      <div style="font-size:12px;opacity:0.75;margin-top:4px;">[←/→ 或 A/D] 長按蓄力放開出步 ｜ [Space/S] 聲納凍結預覽</div>
    `;

    this.statsEl = document.createElement('div');
    this.statsEl.style.cssText =
      'background:rgba(17,24,39,0.82);border:1px solid #374151;border-radius:8px;padding:10px 14px;font-size:14px;line-height:1.6;min-width:210px;';

    topBar.appendChild(titleBlock);
    topBar.appendChild(this.statsEl);

    this.bannerEl = document.createElement('div');
    this.bannerEl.style.cssText =
      'align-self:center;background:rgba(185,28,28,0.92);border:2px solid #FCA5A5;color:#FEF2F2;padding:12px 24px;border-radius:8px;font-size:20px;font-weight:700;display:none;';

    this.resultModalEl = document.createElement('div');
    this.resultModalEl.style.cssText =
      'align-self:center;background:rgba(17,24,39,0.95);border:2px solid #34D399;color:#ECFDF5;padding:24px 32px;border-radius:12px;text-align:center;pointer-events:auto;display:none;box-shadow:0 12px 32px rgba(0,0,0,0.6);';

    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = 'display:flex;gap:16px;align-items:flex-end;';

    const chargeCard = document.createElement('div');
    chargeCard.style.cssText =
      'flex:1;background:rgba(17,24,39,0.82);border:1px solid #374151;border-radius:8px;padding:10px 14px;';
    this.chargeLabelEl = document.createElement('div');
    this.chargeLabelEl.style.cssText = 'font-size:13px;margin-bottom:6px;';
    const chargeTrack = document.createElement('div');
    chargeTrack.style.cssText =
      'height:12px;background:#1F2937;border-radius:6px;overflow:hidden;position:relative;';
    this.chargeBarFillEl = document.createElement('div');
    this.chargeBarFillEl.style.cssText = 'height:100%;width:0%;background:#60A5FA;transition:background 0.05s;';
    chargeTrack.appendChild(this.chargeBarFillEl);
    chargeCard.appendChild(this.chargeLabelEl);
    chargeCard.appendChild(chargeTrack);

    const sonarCard = document.createElement('div');
    sonarCard.style.cssText =
      'width:260px;background:rgba(17,24,39,0.82);border:1px solid #374151;border-radius:8px;padding:10px 14px;';
    this.sonarLabelEl = document.createElement('div');
    this.sonarLabelEl.style.cssText = 'font-size:13px;margin-bottom:6px;';
    const sonarTrack = document.createElement('div');
    sonarTrack.style.cssText = 'height:12px;background:#1F2937;border-radius:6px;overflow:hidden;';
    this.sonarBarFillEl = document.createElement('div');
    this.sonarBarFillEl.style.cssText = 'height:100%;width:100%;background:#A78BFA;';
    sonarTrack.appendChild(this.sonarBarFillEl);
    sonarCard.appendChild(this.sonarLabelEl);
    sonarCard.appendChild(sonarTrack);

    bottomBar.appendChild(chargeCard);
    bottomBar.appendChild(sonarCard);

    this.root.appendChild(topBar);
    this.root.appendChild(this.bannerEl);
    this.root.appendChild(this.resultModalEl);
    this.root.appendChild(bottomBar);
    container.appendChild(this.root);
  }

  public update(state: SimulationState): void {
    const worldSec = (state.worldTick / CONFIG.tickRate).toFixed(1);

    this.statsEl.innerHTML = `
      <div>步數：<strong>${state.steps}</strong></div>
      <div>世界時間：<strong>${worldSec}s</strong> / 600.0s</div>
      <div>死亡次數：<strong>${state.deaths}</strong></div>
    `;

    const hold = state.sloth.holdTicks;
    const maxHold = CONFIG.charge2Ticks;
    const pct = Math.min(100, (hold / maxHold) * 100);
    this.chargeBarFillEl.style.width = `${pct}%`;

    let tierName = '閒置（按住方向鍵開始前搖 0.8s）';
    let barColor = '#6B7280';
    if (state.sloth.phase === 'turning') {
      tierName = `轉身中 (${(state.sloth.turnTicks / CONFIG.tickRate).toFixed(2)}s / 0.40s)`;
      barColor = '#F59E0B';
    } else if (state.sloth.phase === 'stepping') {
      tierName = `出步移動中 (碰撞盒 ×${state.sloth.hitboxMultiplier.toFixed(1)})`;
      barColor = '#10B981';
    } else if (state.sloth.phase === 'windup') {
      const holdSec = (hold / CONFIG.tickRate).toFixed(2);
      const tier = Sloth.evaluateHoldTier(hold);
      if (tier === 'cancel') {
        tierName = `前搖中 ${holdSec}s（放開＝取消）`;
        barColor = '#9CA3AF';
      } else if (tier === 'small') {
        tierName = `蓄力：小步 1 格 / ×1.0 (${holdSec}s)`;
        barColor = '#3B82F6';
      } else if (tier === 'medium') {
        tierName = `蓄力：中步 2 格 / ×1.2 (${holdSec}s)`;
        barColor = '#F59E0B';
      } else {
        tierName = `蓄力：大步 3 格 / ×1.4 (${holdSec}s)`;
        barColor = '#EF4444';
      }
    }
    this.chargeLabelEl.textContent = tierName;
    this.chargeBarFillEl.style.background = barColor;

    if (state.isFrozen) {
      const freezeSec = (state.sonarFreezeRemaining / CONFIG.tickRate).toFixed(1);
      this.sonarLabelEl.textContent = `聲納凍結中：剩餘 ${freezeSec}s（顯示未來 2s 軌跡）`;
      this.sonarBarFillEl.style.width = `${(state.sonarFreezeRemaining / CONFIG.sonarFreezeTicks) * 100}%`;
      this.sonarBarFillEl.style.background = '#F3F4F6';
    } else if (state.sonarCooldownRemaining > 0) {
      const cdSec = (state.sonarCooldownRemaining / CONFIG.tickRate).toFixed(1);
      this.sonarLabelEl.textContent = `聲納冷卻中：${cdSec}s`;
      const readyPct =
        ((CONFIG.sonarCooldownTicks - state.sonarCooldownRemaining) / CONFIG.sonarCooldownTicks) * 100;
      this.sonarBarFillEl.style.width = `${readyPct}%`;
      this.sonarBarFillEl.style.background = '#6B7280';
    } else {
      this.sonarLabelEl.textContent = '聲納就緒 [Space / S]（凍結 3s / 冷卻 8s）';
      this.sonarBarFillEl.style.width = '100%';
      this.sonarBarFillEl.style.background = '#A78BFA';
    }

    if (state.sloth.phase === 'dead' && state.lastDeathCause) {
      this.bannerEl.style.display = 'block';
      this.bannerEl.textContent = `死亡原因：${state.lastDeathCause}（回溯至最近檢查點…）`;
    } else {
      this.bannerEl.style.display = 'none';
    }

    if (state.isVictory) {
      if (this.resultModalEl.style.display !== 'block') {
        this.resultModalEl.style.display = 'block';
        this.resultModalEl.innerHTML = `
          <div style="font-size:24px;font-weight:700;color:#34D399;margin-bottom:12px;">LEVEL 01 通關成功！</div>
          <div style="font-size:16px;line-height:1.8;margin-bottom:20px;">
            <div>總步數：<strong>${state.steps}</strong> 步</div>
            <div>通關世界時間：<strong>${worldSec}</strong> 秒</div>
            <div>死亡次數：<strong>${state.deaths}</strong> 次</div>
          </div>
          <button id="slo-mo-restart-btn" style="font-family:inherit;font-size:15px;font-weight:700;padding:8px 20px;border-radius:6px;border:none;background:#10B981;color:#064E3B;cursor:pointer;">重新挑戰</button>
        `;
        const btn = this.resultModalEl.querySelector('#slo-mo-restart-btn');
        btn?.addEventListener('click', () => {
          this.resultModalEl.style.display = 'none';
          this.onRestartCb?.();
        });
      }
    } else {
      this.resultModalEl.style.display = 'none';
    }
  }
}
