import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectionStrategy,
  afterNextRender
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

declare const PIXI: any;
declare const anime: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-white flex flex-col font-sans overflow-hidden">
      <!-- Top Navigation -->
      <nav class="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-50">
        <div class="flex items-center gap-4">
          <div class="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </div>
          <h1 class="font-black text-slate-900 tracking-tight text-lg">SHAPE<span class="text-indigo-600">DRAW</span></h1>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="exportFile('png')" class="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
            PNG
          </button>
          <button (click)="exportFile('svg')" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all">
            Export SVG
          </button>
        </div>
      </nav>

      <div class="flex-1 flex relative overflow-hidden">
        <!-- Sidebar -->
        <aside [class.translate-x-0]="sidebarOpen()" [class.-translate-x-full]="!sidebarOpen()"
               class="absolute md:relative z-40 w-24 bg-white border-r border-slate-50 flex flex-col items-center py-8 gap-6 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] h-full">

          <div class="flex flex-col gap-4 w-full px-4">
            @for (tool of tools; track tool.id) {
              <button (click)="activeTool.set(tool.id)"
                      [class.bg-slate-900]="activeTool() === tool.id"
                      [class.text-white]="activeTool() === tool.id"
                      [class.scale-110]="activeTool() === tool.id"
                      class="group relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl border border-transparent hover:border-slate-100 text-slate-400">
                <span class="text-2xl">{{ tool.icon }}</span>
                <span class="text-[8px] font-bold uppercase mt-1 tracking-widest">{{ tool.label }}</span>
                @if (activeTool() === tool.id) {
                  <div class="absolute -right-4 w-1 h-6 bg-indigo-600 rounded-full"></div>
                }
              </button>
            }
          </div>

          <div class="mt-auto flex flex-col items-center gap-6 pb-4">
            <div class="relative group">
               <input type="color" (input)="updateColor($event)" [value]="selectedColor()"
                      class="w-10 h-10 rounded-full cursor-pointer border-4 border-white shadow-lg ring-1 ring-slate-100 overflow-hidden">
            </div>
            <button (click)="clearCanvas()" class="w-12 h-12 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </aside>

        <!-- Canvas Area -->
        <main class="flex-1 bg-white relative p-4 md:p-8">
          <div #canvasContainer class="w-full h-full bg-white rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden relative group">
            <div *ngIf="!ready()" class="absolute inset-0 flex items-center justify-center bg-white z-50">
              <div class="flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p class="text-slate-400 font-medium text-sm">Initializing Studio...</p>
              </div>
            </div>
          </div>

          <!-- Mobile Tool Toggle -->
          <button (click)="sidebarOpen.set(!sidebarOpen())"
                  class="md:hidden absolute bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </main>
      </div>

      <!-- Error Toast -->
      <div *ngIf="error()" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-bounce">
        <span class="font-bold">⚠️ Error:</span> {{ error() }}
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: none; }
    canvas { touch-action: none; cursor: crosshair; }
  `]
})
export class AppComponent {
  @ViewChild('canvasContainer', { static: false }) container!: ElementRef;

  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private pixiApp: any;
  private currentGraphic: any;
  private startPos = { x: 0, y: 0 };
  private isInteracting = false;
  private shapes: any[] = [];

  ready = signal(false);
  sidebarOpen = signal(true);
  activeTool = signal('brush');
  selectedColor = signal('#4f46e5');
  error = signal<string | null>(null);

  tools = [
    { id: 'brush', label: 'Pen', icon: '🖋️' },
    { id: 'square', label: 'Box', icon: '⬜' },
    { id: 'circle', label: 'Oval', icon: '⚪' },
    { id: 'triangle', label: 'Delta', icon: '📐' },
    { id: 'line', label: 'Path', icon: '📏' }
  ];

  constructor() {
    afterNextRender(() => {
      this.initEngine();
    });
  }

  private async initEngine() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await this.loadScripts([
        'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js'
      ]);

      this.zone.runOutsideAngular(() => {
        this.setupPixi();
      });

      this.ready.set(true);
      if (window.innerWidth < 768) this.sidebarOpen.set(false);
    } catch (err) {
      this.handleError("Failed to load graphics engine.");
    }
  }

  private setupPixi() {
    if (typeof PIXI === 'undefined') {
      this.handleError("PIXI not found.");
      return;
    }

    const rect = this.container.nativeElement.getBoundingClientRect();

    this.pixiApp = new PIXI.Application({
      width: rect.width,
      height: rect.height,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      eventMode: 'dynamic'
    });

    this.container.nativeElement.appendChild(this.pixiApp.view);

    this.pixiApp.stage.hitArea = this.pixiApp.screen;
    this.pixiApp.stage.on('pointerdown', (e: any) => this.onStart(e));
    this.pixiApp.stage.on('pointermove', (e: any) => this.onMove(e));
    this.pixiApp.stage.on('pointerup', (e: any) => this.onEnd(e));
    this.pixiApp.stage.on('pointerupoutside', (e: any) => this.onEnd(e));

    window.addEventListener('resize', () => this.handleResize());
  }

  private onStart(event: any) {
    this.isInteracting = true;
    const pos = event.global;
    this.startPos = { x: pos.x, y: pos.y };

    this.currentGraphic = new PIXI.Graphics();
    this.pixiApp.stage.addChild(this.currentGraphic);
  }

  private onMove(event: any) {
    if (!this.isInteracting || !this.currentGraphic) return;
    const currentPos = event.global;
    this.drawPreview(this.startPos, currentPos);
  }

  private onEnd(event: any) {
    if (!this.isInteracting) return;
    this.isInteracting = false;

    if (this.currentGraphic) {
      this.shapes.push(this.currentGraphic);
      if (typeof anime !== 'undefined') {
        anime({
          targets: this.currentGraphic,
          alpha: [0.5, 1],
          duration: 300,
          easing: 'easeOutQuad'
        });
      }
    }
    this.currentGraphic = null;
  }

  private drawPreview(start: any, end: any) {
    const g = this.currentGraphic;
    const color = parseInt(this.selectedColor().replace('#', ''), 16);
    const tool = this.activeTool();

    g.clear();

    if (tool === 'brush') {
      g.lineStyle(4, color, 1);
      g.moveTo(start.x, start.y);
      g.lineTo(end.x, end.y);
      this.startPos = { x: end.x, y: end.y };
      return;
    }

    g.beginFill(color, 0.8);
    g.lineStyle(2, color, 1);

    const width = end.x - start.x;
    const height = end.y - start.y;

    switch (tool) {
      case 'square':
        g.drawRect(start.x, start.y, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        g.drawCircle(start.x + width / 2, start.y + height / 2, radius);
        break;
      case 'triangle':
        g.drawPolygon([
          start.x + width / 2, start.y,
          end.x, end.y,
          start.x, end.y
        ]);
        break;
      case 'line':
        g.lineStyle(6, color, 1);
        g.moveTo(start.x, start.y);
        g.lineTo(end.x, end.y);
        break;
    }
    g.endFill();
  }

  async exportFile(format: 'png' | 'svg') {
    try {
      if (format === 'png') {
        const url = this.pixiApp.renderer.extract.canvas(this.pixiApp.stage).toDataURL('image/png');
        this.download(url, 'drawing.png');
      } else {
        const svg = this.generateSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        this.download(url, 'drawing.svg');
      }
    } catch (e) {
      this.handleError("Export failed.");
    }
  }

  private generateSVG(): string {
    const rect = this.container.nativeElement.getBoundingClientRect();
    const pngData = this.pixiApp.renderer.extract.canvas(this.pixiApp.stage).toDataURL('image/png');
    return `<svg width="${rect.width}" height="${rect.height}" xmlns="http://www.w3.org/2000/svg" style="background:white">
      <rect width="100%" height="100%" fill="white"/>
      <image href="${pngData}" width="100%" height="100%" />
    </svg>`;
  }

  private download(url: string, filename: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  updateColor(event: any) {
    this.selectedColor.set(event.target.value);
  }

  clearCanvas() {
    this.pixiApp.stage.removeChildren();
    this.shapes = [];
  }

  private handleResize() {
    if (!this.pixiApp || !this.container) return;
    const rect = this.container.nativeElement.getBoundingClientRect();
    this.pixiApp.renderer.resize(rect.width, rect.height);
  }

  private handleError(msg: string) {
    this.error.set(msg);
    setTimeout(() => this.error.set(null), 4000);
  }

  private loadScripts(urls: string[]): Promise<void[]> {
    return Promise.all(urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    }));
  }
}
