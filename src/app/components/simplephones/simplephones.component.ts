import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { IAlloK } from 'src/app/interface'
import { IRegion } from 'src/app/pages/simpleannotate/simpleannotate.service';

interface ITokenPlace {
    start?: number
    stop?: number
    token: string
}

interface IPhoneSeg {
    start: number
    end: number
    phone: string
}

@Component({
    selector: 'app-simplephones',
    templateUrl: './simplephones.component.html',
    styleUrls: ['./simplephones.component.scss']
})
export class SimplephonesComponent implements OnInit {
    phones: IPhoneSeg[] = []
    phoneplaypoint = 0
    phoneClass: string[] = []
    @ViewChildren('seg') segList: QueryList<ElementRef>
    alignedtokens: ITokenPlace[] = []
    constructor() {}

    ngOnInit(): void {
    }

    // update just aligned tokens (for new alignments)
    setAlignedTokens(atokens: ITokenPlace[]) {
        console.log('setAlignedTokens', atokens)
        this.alignedtokens = atokens
    }

    // called from play progress
    setPhoneByTime(time: number) {
        const fseg = this.phones.findIndex(x => time >= x.start && time < x.end)
        if (fseg !== -1 && fseg !== this.phoneplaypoint) {
            this.phoneplaypoint = fseg
            this._updatePhoneSequence(fseg)
        }
    }

    _updatePhoneSequence(pos: number) {
        const segclass = []
        for (const [i, seg] of this.phones.entries()) {
            const diff = Math.abs(pos - i)
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
        this.phoneClass = segclass
        Array.from(this.segList)[pos].nativeElement.scrollIntoView()
    }

    seekStart() {
        this.phoneplaypoint = 0
        this._updatePhoneSequence(0)
    }

    // called on region changes, will restore aligned tokens and phone sequences
    setRegion(region: IRegion) {
        this.alignedtokens = region.aligned
        console.log('got aligned', this.alignedtokens)
        const psegs: IPhoneSeg[] = []
        if (region.allok !== null) {
            // If we have kvals, calculate phone seg durations properly
            for (let ak of region.allok) {
                psegs.push({
                    start: region.start + ak.start,
                    end: region.start + ak.start + ak.dur - 0.001,
                    phone: ak.kvals[0].c
                })
            }
        } else {
            // otherwise use nasty hack
            const p = region.allo.trim().split(' ')
            const duration = region.end - region.start
            const timepersymbol = duration / p.length
            for (const [i, v] of p.entries()) {
                const stime = region.start + (i * timepersymbol)
                psegs.push({start: stime, end: stime + timepersymbol - 0.001, phone: v})
            }
        }
        this.phones = psegs
        this.phoneplaypoint = 0
    }

}
