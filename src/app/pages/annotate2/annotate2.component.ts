import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { WavesurferComponent } from 'src/app/components/wavesurfer/wavesurfer.component';
import { Subject, Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { BackendService } from 'src/app/services/backend.service';
import { APIProject, APIMediaEntry } from 'src/app/interface';
import { EventManager } from '@angular/platform-browser';
import { VadmapComponent } from 'src/app/components/vadmap/vadmap.component';
import { AllodisplayComponent } from 'src/app/components/allodisplay/allodisplay.component';
import getCaretCoordinates from 'textarea-caret'
import { SimpleAnnotationService } from './simpleservice';
import {
    debounceTime,
    distinctUntilChanged
  } from 'rxjs/operators'

@Component({
    templateUrl: './annotate2.component.html',
    styleUrls: ['./annotate2.component.scss'],
    providers: [SimpleAnnotationService]
})
export class Annotate2Component implements AfterViewInit, OnDestroy {
    @ViewChild(WavesurferComponent) wsc?: WavesurferComponent
    @ViewChild('typebox') inputbox: ElementRef
    pastannotation = ''
    annotation = '' // value of text input box
    ready = false
    sub: Subscription
    removeGlobalEventListener2: () => void
    @ViewChild('vad') vad: VadmapComponent
    @ViewChild('hinterbox') allodisp: AllodisplayComponent
    popupstyle: any = {}
    keySub: Subject<any> = new Subject()
    media: APIMediaEntry
    project: APIProject
    constructor(
        public anno: SimpleAnnotationService,
        private router: Router,
        private route: ActivatedRoute,
        private backend: BackendService,
        private eventManager: EventManager) {
            this.removeGlobalEventListener2 = this.eventManager.addGlobalEventListener(
                'document', 'keyup', this.keyup.bind(this)) as () => void
    }

    async ngAfterViewInit(): Promise<void> {
        if (this.wsc) {
            this.sub = this.route.params.subscribe(params => {
                console.log('annotate params', params.pid, params.mid)
                this.loadData(params.pid, params.mid)
            })
        } else {
            console.log('wavesurfer element doesn\'t exist')
        }
        this.keySub.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe((keypress: {txt: string, cg: number}) => {
            this.anno.annotationKeypress(keypress.txt, keypress.cg)
        })
    }
    ngOnDestroy(): void {
        this.anno.destroy()
        if (this.sub) {
            this.sub.unsubscribe()
        }
        this.removeGlobalEventListener2()
    }

    async loadData(projectId: string, mediaId: string): Promise<void> {
        this.project = await this.backend.getProject(projectId)
        this.ready = false
        this.media = (await this.backend.getMediaById(mediaId))[0]
        if (this.media.agents && this.media.agents.regions) {
            this.vad.load(this.media.metadata.duration, this.media.agents.regions)
        }
        await this.anno.loadProject(this.wsc.wavesurfer, this.allodisp, this.project, this.media)
        this.ready = true
        setTimeout(() => {
            this.inputbox.nativeElement.focus()
        }, 500)
    }

    close(): void {
        this.router.navigate(['project', this.project.id])
    }

    // We only use this to detect enter
    annotationKeyPress(evt: KeyboardEvent): void {
        if (evt.code === 'Enter') {
            console.log('activate next)')
            this.activateNextRegion()
            this.inputbox.nativeElement.focus()
        } else if (evt.code === 'Space') {
            this.anno.space()
            // something special
        }
    }
    // Otherwise we use this because it works better
    annotationChanged(): void {
        this.anno.setAnnotation(this.annotation)
        this.setPopupPos()
        const ps = this.pastannotation.trim().split(' ')
        const ns = this.annotation.trim().split(' ')
        let cg = null
        for (let [i, ws] of ps.entries()) {
            if (ws !== ns[i]) {
                cg = i
                break
            }
        }
        this.keySub.next({txt: this.annotation, pos: cg})
        if (this.lastWord().length < 2) {
            this.allodisp.clearCandidates()
        }
    }

    keyup(evt: KeyboardEvent): void {
        if (!this.ready) { return };
        if (evt.code === 'ControlLeft') {
            this.anno.keydown_play()
            this.inputbox.nativeElement.focus()
        } else if (evt.code === 'ArrowUp') {
            this.activatePreviousRegion()
            this.inputbox.nativeElement.focus()
        } else if (evt.code === 'ArrowDown') {
            this.activateNextRegion()
            this.inputbox.nativeElement.focus()
        }
    }

    vadClick(time: number): void {
        const f = this.anno.navigateToApproximateTime(time)
        if (f !== null) {
            this.annotation = f
            this.pastannotation = f
            this.allodisp.setRegion(this.anno.thisRegion())
        }
    }

    activatePreviousRegion(): void {
        this.annotation = this.anno.activatePrevious()
        this.pastannotation = this.annotation
        this.allodisp.setRegion(this.anno.thisRegion())
    }
    activateNextRegion(): void {
        this.annotation = this.anno.activateNext()
        this.pastannotation = this.annotation
        this.allodisp.setRegion(this.anno.thisRegion())
    }

    lastWord(): string {
        if (!this.annotation || this.annotation === '') {
            return ''
        }
        const s = this.annotation.split(' ')
        return s[s.length - 1 ]
    }

    setPopupPos(): void {
        const target = this.inputbox.nativeElement
        const bb = (target as HTMLInputElement).getBoundingClientRect()
        const cursorpos = getCaretCoordinates(target)
        this.popupstyle = {
            left: (cursorpos.left + bb.x - 10).toString() + 'px',
            top: (cursorpos.top + bb.y - 25).toString() + 'px'
        }
    }

    filterSuggestions(): string[] {
        const lw = this.lastWord()
        if (lw.length < 2) {
            return []
        }
        const fl = this.anno.completions.filter(x => x.search(lw) !== -1)
        return fl
    }

    updateAlloDisp(): void {
    }



}
