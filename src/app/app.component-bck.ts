import {
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * PixiPaint Studio Pro - Interactive Drawing Version
 * Features: Drag-to-draw shapes, bright UI, mobile responsiveness, and robust export.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="h-16 border-b border-slate-200 flex justify-between items-center bg-white px-4 md:px-6 z-20 shrink-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
             <span class="font-black text-white text-xl italic">P</span>
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-900 leading-tight">PixiPaint Studio</h1>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-tighter hidden sm:block">Professional Vector Tool</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button (click)="clearCanvas()" class="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Clear All
          </button>
          <div class="flex bg-slate-100 p-1 rounded-xl">
            <button (click)="export('png')" class="px-4 py-1.5 bg-white text-blue-600 shadow-sm hover:shadow-md rounded-lg text-xs font-bold transition-all active:scale-95">
              PNG
            </button>
            <button (click)="export('svg')" class="px-4 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold transition">
              SVG
            </button>
          </div>
        </div>
      </header>

      <!-- Main Workspace -->
      <main class="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/50">

        <!-- Sidebar -->
        <aside class="w-full md:w-80 border-r border-slate-200 bg-white p-5 flex flex-row md:flex-col gap-8 overflow-x-auto md:overflow-y-auto shrink-0 z-10">

          <!-- Tool Selection -->
          <div class="shrink-0 md:shrink min-w-[280px] md:min-w-0">
            <label class="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-4 block">Drawing Tools</label>
            <div class="grid grid-cols-4 md:grid-cols-2 gap-3">
              @for (tool of shapeLibrary; track tool.id) {
                <button
                  (click)="selectedTool.set(tool.id)"
                  class="flex flex-col items-center justify-center p-4 rounded-2xl transition-all group ring-blue-500 ring-offset-2 shadow-sm"
                  [class.ring-2]="selectedTool() === tool.id"
                  [class.bg-blue-600]="selectedTool() === tool.id"
                  [class.text-white]="selectedTool() === tool.id"
                  [class.bg-slate-50]="selectedTool() !== tool.id"
                  [class.text-slate-500]="selectedTool() !== tool.id"
                  [class.hover:bg-slate-100]="selectedTool() !== tool.id">
                  <svg class="w-7 h-7 mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path [attr.d]="tool.icon" />
                  </svg>
                  <span class="text-[10px] font-bold uppercase tracking-tight">{{ tool.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Style Palette -->
          <div class="shrink-0 md:shrink border-l border-slate-100 md:border-l-0 md:border-t md:pt-8 pl-6 md:pl-0 min-w-[200px] md:min-w-0">
            <label class="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-4 block">Color Palette</label>
            <div class="grid grid-cols-5 md:grid-cols-4 gap-3">
              @for (c of colors; track c) {
                <button
                  (click)="currentColor.set(c)"
                  [style.backgroundColor]="c"
                  [class.scale-125]="currentColor() === c"
                  [class.ring-2]="currentColor() === c"
                  class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-200 transition-all shadow-sm ring-blue-400 ring-offset-4 ring-offset-white active:scale-90">
                </button>
              }
            </div>
          </div>

          <div class="hidden md:block mt-auto bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p class="text-[11px] text-blue-700 font-semibold mb-1">How to Draw:</p>
            <p class="text-[10px] text-blue-600 leading-relaxed">Select a shape, then click and drag on the white canvas to draw.</p>
          </div>
        </aside>

        <!-- Canvas Stage -->
        <section class="flex-1 flex items-center justify-center p-4 md:p-10 relative overflow-hidden">
          <div #canvasWrapper
               class="canvas-container relative bg-white shadow-[0_20px_70px_-15px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden transition-all duration-300 ring-1 ring-slate-200"
               [style.width.px]="canvasWidth()"
               [style.height.px]="canvasHeight()">
            <!-- PixiJS Canvas -->
          </div>

          <!-- Background Pattern -->
          <div class="absolute inset-0 pointer-events-none opacity-[0.4] z-0"
               style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 32px 32px;"></div>
        </section>
      </main>

      <!-- Bottom Bar -->
      <footer class="h-10 border-t border-slate-200 bg-white px-6 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest z-20">
        <div class="flex gap-4">
          <span>Active: {{ selectedTool() }}</span>
          <span class="text-slate-200">|</span>
          <span>Canvas: {{ canvasWidth() }} x {{ canvasHeight() }}</span>
        </div>
        <div class="flex items-center gap-2 text-blue-600">
          <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          Studio Active
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .canvas-container canvas { display: block; cursor: crosshair !important; }
    aside::-webkit-scrollbar { display: none; }
    aside { -ms-overflow-style: none; scrollbar-width: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

  canvasWidth = signal(800);
  canvasHeight = signal(600);
  currentColor = signal('#3b82f6');
  selectedTool = signal('square');

  shapeLibrary = [
    { id: 'square', label: 'Square', icon: 'M3 3h18v18H3V3z' },
    { id: 'circle', label: 'Circle', icon: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z' },
    { id: 'triangle', label: 'Triangle', icon: 'M1 21h22L12 2 1 21z' },
    { id: 'line', label: 'Line', icon: 'M3 3l18 18' }
  ];

  colors = [
    '#0f172a', '#334155', '#ef4444', '#f97316',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
    '#6366f1', '#8b5cf6', '#ec4899', '#f1f5f9'
  ];

  private app: any;
  private currentDrawingShape: any = null;
  private startPoint = { x: 0, y: 0 };

  constructor() {
    afterNextRender(async () => {
      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());
      await this.initPixi();
    });
  }

  private handleResize() {
    const isMobile = window.innerWidth < 768;
    const availableWidth = window.innerWidth - (isMobile ? 32 : 360);
    const availableHeight = window.innerHeight - (isMobile ? 300 : 160);

    this.canvasWidth.set(Math.max(300, availableWidth));
    this.canvasHeight.set(Math.max(300, availableHeight));

    if (this.app) {
      this.app.renderer.resize(this.canvasWidth(), this.canvasHeight());
    }
  }

  private async initPixi() {
    try {
      const PIXI = await import('pixi.js');

      this.app = new PIXI.Application({
        width: this.canvasWidth(),
        height: this.canvasHeight(),
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preserveDrawingBuffer: true
      });

      const canvasElement = (this.app.canvas || this.app.view);
      this.canvasWrapper.nativeElement.appendChild(canvasElement);

      this.app.stage.interactive = true;
      this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 5000, 5000);

      // Event Listeners for Drag-to-Draw
      this.app.stage.on('pointerdown', (e: any) => this.onPointerDown(e, PIXI));
      this.app.stage.on('pointermove', (e: any) => this.onPointerMove(e));
      this.app.stage.on('pointerup', () => this.onPointerUp());
      this.app.stage.on('pointerupoutside', () => this.onPointerUp());

    } catch (err) {
      console.error("Studio Init Failed:", err);
    }
  }

  private onPointerDown(event: any, PIXI: any) {
    const pos = event.data.getLocalPosition(this.app.stage);
    this.startPoint = { x: pos.x, y: pos.y };

    this.currentDrawingShape = new PIXI.Graphics();
    this.app.stage.addChild(this.currentDrawingShape);
  }

  private onPointerMove(event: any) {
    if (!this.currentDrawingShape) return;

    const pos = event.data.getLocalPosition(this.app.stage);
    const width = pos.x - this.startPoint.x;
    const height = pos.y - this.startPoint.y;
    const color = parseInt(this.currentColor().replace('#', '0x'));
    const tool = this.selectedTool();

    this.currentDrawingShape.clear();

    if (tool === 'line') {
      this.currentDrawingShape.lineStyle(4, color);
      this.currentDrawingShape.moveTo(this.startPoint.x, this.startPoint.y);
      this.currentDrawingShape.lineTo(pos.x, pos.y);
    } else {
      this.currentDrawingShape.beginFill(color);

      switch(tool) {
        case 'square':
          this.currentDrawingShape.drawRect(this.startPoint.x, this.startPoint.y, width, height);
          break;
        case 'circle':
          const radius = Math.sqrt(width*width + height*height);
          this.currentDrawingShape.drawCircle(this.startPoint.x, this.startPoint.y, radius);
          break;
        case 'triangle':
          this.currentDrawingShape.drawPolygon([
            this.startPoint.x + width/2, this.startPoint.y,
            this.startPoint.x, this.startPoint.y + height,
            this.startPoint.x + width, this.startPoint.y + height
          ]);
          break;
      }
      this.currentDrawingShape.endFill();
    }
  }

  private onPointerUp() {
    if (this.currentDrawingShape) {
      this.currentDrawingShape.interactive = true;
      (this.currentDrawingShape as any).cursor = 'move';
      this.currentDrawingShape = null;
    }
  }

  clearCanvas() {
    if (!this.app) return;
    this.app.stage.removeChildren();
  }

  export(format: 'png' | 'svg') {
    if (!this.app) return;
    try {
      const canvas = (this.app.canvas || this.app.view) as HTMLCanvasElement;

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `pixipaint-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      } else {
        const svgContent = `
          <svg width="${this.canvasWidth()}" height="${this.canvasHeight()}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <image href="${canvas.toDataURL()}" width="100%" height="100%" />
          </svg>
        `;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixipaint-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export Failed:", err);
    }
  }
}
