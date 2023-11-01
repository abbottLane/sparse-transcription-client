import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core'
import { Observable } from 'rxjs'

@Component({
    selector: 'app-hinter',
    templateUrl: './hinter.component.html',
    styleUrls: ['./hinter.component.scss']
})
export class HinterComponent implements OnInit {
    ptime: number
    segs: {start: number, end: number, allo: string}[] = []
    segplaypoint = 0
    segClass: string[] = []
    @ViewChildren('seg') segList: QueryList<ElementRef>;
    ngOnInit(): void {

    }

    init(obs: Observable<{e: number, t: number}>): void {
        obs.subscribe((p) => {
            this.ptime = p.t
            const findex = this.segs.findIndex(x => p.t >= x.start && p.t < x.end)
            if (findex === -1) {
                return
            }
            if (findex !== this.segplaypoint) {
                this.activate(findex)
                this.segplaypoint = findex
            }
        })
    }

    setRegion(reg: {reg: any, start: number, end: number, txt: string, allo: string}): void {
        console.log(reg.allo)
        const segs = reg.allo.split(' ')
        if (segs.length === 1) {
            return
        }
        const duration = reg.end - reg.start
        const timepersymbol = duration / segs.length
        this.segs = []
        for (const [i, v] of segs.entries()) {
            const stime = reg.start + (i * timepersymbol)
            this.segs.push({start: stime, end: stime + timepersymbol - 0.001, allo: v})
        }
        this.segplaypoint = 0
        this.segClass = []
    }

    activate(segIndex: number): void {
        const segclass = []
        for (const [i, seg] of this.segs.entries()) {
            const diff = Math.abs(segIndex - i)
            if (diff === 3) {
                segclass.push('d3')
            } else if (diff === 2) {
                segclass.push('d2')
            } else if (diff === 1) {
                segclass.push('d1')
            } else if (diff === 0) {
                segclass.push('d0')
            } else {
                segclass.push('')
            }
        }
        this.segClass = segclass
        Array.from(this.segList)[segIndex].nativeElement.scrollIntoView()
    }
}
