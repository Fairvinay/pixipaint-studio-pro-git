import {
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  signal,
  NgZone
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

/**
 * PixiPaint Studio Pro
 * Optimized for Canvas Environment:
 * 1. Fixed "Document is not defined" by wrapping all DOM/Library logic in afterNextRender.
 * 2. Injected Tailwind via dynamic script to ensure styles apply.
 * 3. Lazy-loaded PixiJS from CDN to prevent bundle issues.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main Container: Hidden until Tailwind is ready to prevent FOUC -->
    <div [class.opacity-0]="!ready()" class="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden transition-opacity duration-500">

      <!-- Header -->
      <header class="h-16 border-b border-slate-200 flex justify-between items-center bg-white px-4 md:px-6 z-20 shrink-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
             <span class="font-black text-white text-xl italic">P</span>
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-900 leading-tight">PixiPaint Studio</h1>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-tighter hidden sm:block">Pro Vector Graphics</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button (click)="clearCanvas()" class="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Clear
          </button>
          <button (click)="export('png')" class="px-4 py-1.5 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all active:scale-95">
            Export PNG
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      <main class="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/50">

        <!-- Sidebar -->
        <aside class="w-full md:w-72 border-r border-slate-200 bg-white p-5 flex flex-row md:flex-col gap-6 overflow-x-auto md:overflow-y-auto shrink-0 z-10">

          <div class="shrink-0 md:shrink min-w-[200px] md:min-w-0">
            <label class="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Shapes</label>
            <div class="grid grid-cols-4 md:grid-cols-2 gap-2">
              @for (tool of shapeLibrary; track tool.id) {
                <button
                  (click)="selectedTool.set(tool.id)"
                  class="flex flex-col items-center justify-center p-3 rounded-xl transition-all border"
                  [class.bg-indigo-50]="selectedTool() === tool.id"
                  [class.border-indigo-500]="selectedTool() === tool.id"
                  [class.text-indigo-600]="selectedTool() === tool.id"
                  [class.bg-white]="selectedTool() !== tool.id"
                  [class.border-slate-100]="selectedTool() !== tool.id"
                  [class.text-slate-500]="selectedTool() !== tool.id">
                  <svg class="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <path [attr.d]="tool.icon" />
                  </svg>
                  <span class="text-[9px] font-bold uppercase tracking-tight">{{ tool.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="shrink-0 md:shrink border-l border-slate-100 md:border-l-0 md:border-t md:pt-6 pl-6 md:pl-0 min-w-[180px] md:min-w-0">
            <label class="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Colors</label>
            <div class="grid grid-cols-5 md:grid-cols-4 gap-2">
              @for (c of colors; track c) {
                <button
                  (click)="currentColor.set(c)"
                  [style.backgroundColor]="c"
                  [class.ring-2]="currentColor() === c"
                  class="w-8 h-8 rounded-lg border border-slate-200 transition-all shadow-sm ring-indigo-400 ring-offset-2 ring-offset-white active:scale-90">
                </button>
              }
            </div>
          </div>
        </aside>

        <!-- Canvas Stage -->
        <section class="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
          <div #canvasWrapper
               class="canvas-container relative bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-300 ring-1 ring-slate-200"
               [style.width.px]="canvasWidth()"
               [style.height.px]="canvasHeight()">
            <!-- PixiJS Canvas Appends Here -->
          </div>

          <!-- Background Grid Pattern -->
          <div class="absolute inset-0 pointer-events-none opacity-[0.2] z-0"
               style="background-image: radial-gradient(#6366f1 1px, transparent 1px); background-size: 24px 24px;"></div>
        </section>
      </main>

      <footer class="h-8 border-t border-slate-200 bg-white px-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest z-20">
        <div class="flex gap-4">
          <span>Tool: {{ selectedTool() }}</span>
          <span>Res: {{ canvasWidth() }}x{{ canvasHeight() }}</span>
        </div>
        <div class="text-indigo-500">PIXIPAINT ENGINE v2.0</div>
      </footer>
    </div>

    <!-- Loading Overlay -->
    @if (!ready()) {
      <div class="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Initializing Studio...</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; }
    .canvas-container canvas { display: block; cursor: crosshair !important; width: 100%; height: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  ready = signal(false);
  canvasWidth = signal(800);
  canvasHeight = signal(600);
  currentColor = signal('#4f46e5');
  selectedTool = signal('square');

  shapeLibrary = [
    { id: 'square', label: 'Square', icon: 'M3 3h18v18H3V3z' },
    { id: 'circle', label: 'Circle', icon: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z' },
    { id: 'triangle', label: 'Triangle', icon: 'M1 21h22L12 2 1 21z' },
    { id: 'line', label: 'Line', icon: 'M3 3l18 18' }
  ];

  colors = [
    '#1e293b', '#ef4444', '#f97316', '#f59e0b',
    '#10b981', '#06b6d4', '#4f46e5', '#8b5cf6',
    '#ec4899', '#f1f5f9'
  ];

  private pixiApp: any;
  private currentShape: any = null;
  private startPos = { x: 0, y: 0 };

  constructor() {
    // Standard Angular approach to handle Browser-only logic safely
    afterNextRender(() => {
      this.initStudio();
    });
  }

  private async initStudio() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // 1. Inject Tailwind if not present (Fixes broken UI)
      if (!document.getElementById('tailwind-cdn')) {
        const script = document.createElement('script');
        script.id = 'tailwind-cdn';
        script.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(script);
      }

      // 2. Load PixiJS from CDN (Reliable in this environment)
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js');

      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());

      this.zone.runOutsideAngular(() => {
        this.setupPixi();
      });

      this.ready.set(true);
    } catch (err) {
      console.error("Studio Load Failed:", err);
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).PIXI) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private setupPixi() {
    const PIXI = (window as any).PIXI;
    if (!PIXI) return;

    this.pixiApp = new PIXI.Application({
      width: this.canvasWidth(),
      height: this.canvasHeight(),
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preserveDrawingBuffer: true
    });

    const view = this.pixiApp.view;
    this.canvasWrapper.nativeElement.appendChild(view);

    this.pixiApp.stage.eventMode = 'static';
    this.pixiApp.stage.hitArea = new PIXI.Rectangle(0, 0, 5000, 5000);

    this.pixiApp.stage.on('pointerdown', (e: any) => {
      const pos = e.getLocalPosition(this.pixiApp.stage);
      this.startPos = { x: pos.x, y: pos.y };
      this.currentShape = new PIXI.Graphics();
      this.pixiApp.stage.addChild(this.currentShape);
    });

    this.pixiApp.stage.on('pointermove', (e: any) => {
      if (!this.currentShape) return;

      const pos = e.getLocalPosition(this.pixiApp.stage);
      const w = pos.x - this.startPos.x;
      const h = pos.y - this.startPos.y;
      const color = parseInt(this.currentColor().replace('#', '0x'));
      const tool = this.selectedTool();

      this.currentShape.clear();

      if (tool === 'line') {
        this.currentShape.lineStyle(3, color);
        this.currentShape.moveTo(this.startPos.x, this.startPos.y);
        this.currentShape.lineTo(pos.x, pos.y);
      } else {
        this.currentShape.beginFill(color);
        if (tool === 'square') {
          this.currentShape.drawRect(this.startPos.x, this.startPos.y, w, h);
        } else if (tool === 'circle') {
          const r = Math.sqrt(w*w + h*h);
          this.currentShape.drawCircle(this.startPos.x, this.startPos.y, r);
        } else if (tool === 'triangle') {
          this.currentShape.drawPolygon([
            this.startPos.x + w/2, this.startPos.y,
            this.startPos.x, this.startPos.y + h,
            this.startPos.x + w, this.startPos.y + h
          ]);
        }
        this.currentShape.endFill();
      }
    });

    this.pixiApp.stage.on('pointerup', () => {
      this.currentShape = null;
    });
  }

  private handleResize() {
    if (!isPlatformBrowser(this.platformId)) return;
    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 32 : 80;
    const sidebarWidth = isMobile ? 0 : 288;
    const headerHeight = 64;
    const footerHeight = 32;

    this.canvasWidth.set(window.innerWidth - sidebarWidth - padding);
    this.canvasHeight.set(window.innerHeight - headerHeight - footerHeight - padding);

    if (this.pixiApp) {
      this.pixiApp.renderer.resize(this.canvasWidth(), this.canvasHeight());
    }
  }

  clearCanvas() {
    if (this.pixiApp) this.pixiApp.stage.removeChildren();
  }

  export(type: 'png') {
    if (!this.pixiApp) return;
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = this.pixiApp.view.toDataURL('image/png');
    link.click();
  }
}
