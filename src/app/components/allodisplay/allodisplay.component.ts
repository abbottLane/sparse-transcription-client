import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { Observable } from 'rxjs'
import { IRegion } from 'src/app/pages/annotate2/simpleservice';

interface ITokenPlace {
    start?: number
    stop?: number
    token: string
}

@Component({
    selector: 'app-allodisplay',
    templateUrl: './allodisplay.component.html',
    styleUrls: ['./allodisplay.component.scss']
})
export class AllodisplayComponent implements OnInit {
    ptime: number
    segs: {start: number, end: number, allo: string}[] = []
    segplaypoint = 0
    segClass: string[] = []
    @ViewChildren('seg') segList: QueryList<ElementRef>
    tokens: {start: string, end: string, gloss: string, class: string}[] = []
    constructor() {}

    ngOnInit(): void {
    }

    init(obs: Observable<{t: number}>): void {
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
    setRegion(reg: IRegion): void {
        console.log(reg.allo)
        this.segs = []
        this.segClass = []
        this.tokens = []
        const segs = reg.allo.split(' ')
        if (segs.length === 1) {
            return
        }
        const duration = reg.end - reg.start
        const timepersymbol = duration / segs.length
        for (const [i, v] of segs.entries()) {
            const stime = reg.start + (i * timepersymbol)
            this.segs.push({start: stime, end: stime + timepersymbol - 0.001, allo: v})
        }
        this.segplaypoint = 0
        if (reg.accepted) {
            this.addTokens(reg.accepted, 'selected')
        }
        console.log('tokens', this.tokens)
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

    addToken(token: ITokenPlace, classtr: string): void {
        this.tokens.push({
            start: (token.start + 1).toString(),
            end: (token.stop + 2).toString(),
            gloss: token.token,
            class: classtr
        })
    }
    addTokens(tokens: ITokenPlace[], classtr: string): void {
        for (const t of tokens) {
            this.addToken(t, classtr)
        }
    }
    addCandidate(candidate: ITokenPlace): void {
        if (!candidate) {
            console.error("tried to add a candidate token but there like wasn't one man, so what am I supposed to do? These humans, if only they could sort their shit out.")
            return
        }
        this.addToken(candidate, 'candidate')
        if (candidate.start) {
            Array.from(this.segList)[candidate.start].nativeElement.scrollIntoView()
        }
    }

    clearPhones(): void {
        this.tokens = []
    }
    clearCandidates(): void {
        const rm = this.tokens.filter(x => x.class === 'selected')
        this.tokens = rm
    }

}
