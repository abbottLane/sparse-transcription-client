import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-vadmap',
    templateUrl: './vadmap.component.html',
    styleUrls: ['./vadmap.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VadmapComponent implements AfterViewInit, OnChanges {
    @ViewChild('vadcanvas') myCanvas: ElementRef<HTMLCanvasElement>
    ctx: CanvasRenderingContext2D
    duration: number
    numpix: number
    vadheight = 30
    border = 3
    ready = false
    @Input() selected: number
    @Output() navigate = new EventEmitter<number>()
    data: { start: number, end: number }[] = []
    constructor() { }

    ngOnChanges(cg: SimpleChanges): void {
        if ('selected' in cg && this.ready) {
            this.render()
        }
    }

    ngAfterViewInit(): void {
        this.ctx = this.myCanvas.nativeElement.getContext('2d')
        const c = this.myCanvas.nativeElement
        const rect = c.getBoundingClientRect()
        //var scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
        const scale = 1
        c.width = Math.floor(rect.width * scale)
        c.height = Math.floor(rect.height * scale)
        this.ctx.scale(scale, scale)
        this.numpix = rect.width * scale
        this.ready = true
    }
    _timeToPx(sec: number): number {
        return Math.round((sec / this.duration) * this.numpix)
    }

    load(duration: number, data: { start: number, end: number }[]): void {
        this.duration = duration
        this.data = data
        this.render()
    }

    render(): void {
        this.ctx.clearRect(0, 0, this.myCanvas.nativeElement.width, this.myCanvas.nativeElement.height);
        for (const [i, r] of this.data.entries()) {
            this.ctx.lineWidth = 1
            // this.ctx.fillStyle = this.selected === null || this.selected !== i ?
            //     'rgb(195,195,195)' :
            //     'rgba(195,250,195)'
            this.ctx.fillStyle = this.selected === null || this.selected !== i ?
                'rgba(0, 0, 0, 0.20)' :
                'rgba(20, 150, 0, 0.20)'
            this.ctx.strokeStyle = 'black'
            const x1 = this._timeToPx(r.start)
            const x2 = this._timeToPx(r.end)
            const width = x2 - x1
            const round = Math.min(width, 5)
            this.roundRect(x1, this.border, x2 - x1, this.vadheight - this.border, round, true, false)
        }
    }

    roundRect(x, y, width, height, rad = 4, fill: boolean, stroke: boolean = true): void {
        const radius = { tl: rad, tr: rad, br: rad, bl: rad }
        const ctx = this.ctx
        ctx.beginPath()
        ctx.moveTo(x + radius.tl, y)
        ctx.lineTo(x + width - radius.tr, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
        ctx.lineTo(x + width, y + height - radius.br)
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
        ctx.lineTo(x + radius.bl, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
        ctx.lineTo(x, y + radius.tl)
        ctx.quadraticCurveTo(x, y, x + radius.tl, y)
        ctx.closePath()
        if (fill) {
            ctx.fill()
        }
        if (stroke) {
            ctx.stroke()
        }
    }

    clickmap(evt): void {
        evt.preventDefault()
        const rect = evt.target.getBoundingClientRect()
        const width = rect.right - rect.left
        const x = evt.clientX - rect.left; //x position within the element.
        const t = this.duration * (x / width)
        //var y = evt.clientY - rect.top;  //y position within the element.
        this.navigate.emit(t)
    }

}
