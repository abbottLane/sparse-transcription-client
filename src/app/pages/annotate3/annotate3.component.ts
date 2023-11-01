import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { EventManager } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { WavesurferComponent } from 'src/app/components/wavesurfer/wavesurfer.component';
import { BackendService } from 'src/app/services/backend.service';
import { AnnotationService } from './annotate.service';
import { VadmapComponent } from 'src/app/components/vadmap/vadmap.component';
import { APIProject, APIMediaEntry } from 'src/app/interface';
import { AllodisplayComponent } from 'src/app/components/allodisplay/allodisplay.component';
import { TokenComponent } from 'src/app/components/token/token.component';
import {
    debounceTime,
    distinctUntilChanged
  } from 'rxjs/operators'

@Component({
    templateUrl: './annotate3.component.html',
    styleUrls: ['./annotate3.component.scss'],
    providers: [AnnotationService]
})
export class Annotate3Component implements AfterViewInit, OnDestroy {
    @ViewChild(WavesurferComponent) wsc?: WavesurferComponent
    @ViewChild('typebox') inputbox: ElementRef
    @ViewChild('vad') vad: VadmapComponent
    @ViewChild('hinterbox') allodisp: AllodisplayComponent
    sub: Subscription
    ready = false
    removeGlobalEventListener: () => void
    media: APIMediaEntry
    project: APIProject
    annotation: string = ''
    insertpos: number = null
    @ViewChild('trow') tokenrow: TokenComponent
    keySub: Subject<any> = new Subject()
    @HostListener('window:blur', ['$event'])
    onBlur(event: FocusEvent): void {
        this.wsc.wavesurfer.pause()

    }
    constructor(
        public anno: AnnotationService,
        private router: Router,
        private route: ActivatedRoute,
        private backend: BackendService,
        private eventManager: EventManager) {
        this.removeGlobalEventListener = this.eventManager.addGlobalEventListener(
            'document', 'keyup', this.keyup.bind(this)) as () => void
    }
    async ngAfterViewInit(): Promise<void> {
        if (this.wsc) {
            this.sub = this.route.params.subscribe(params => {
                console.log('annotate params', params.pid, params.mid)
                this.startup(params.pid, params.mid)
            })
        } else {
            console.log('wavesurfer element doesn\'t exist')
        }
        this.keySub.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe((anno: string) => {
            this.anno.annotationKeypress(anno, this.insertpos)
        })
    }
    ngOnDestroy(): void {
        this.anno.destroy()
        if (this.sub) {
            this.sub.unsubscribe()
        }
        this.removeGlobalEventListener()
        this.keySub.unsubscribe()
    }

    async startup(projectId: string, mediaId: string): Promise<void> {
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

    keyup(evt: KeyboardEvent): void {
        if (!this.ready) { return };
        if (evt.code === 'ControlLeft') {
            this.anno.keydown_play()
            this.inputbox.nativeElement.focus()
        } else if (evt.code === 'ArrowUp') {
            if (this.annotation === '') {
                console.log('empty anno')
                if (this.tokenrow.isSelected()) {
                    console.log('tokenrow isSelected() true')
                    this.tokenrow.upArrow()
                } else {
                    console.log('activatepreviousregion')
                    this.activatePreviousRegion()
                    this.inputbox.nativeElement.focus()
                }
            }
        } else if (evt.code === 'ArrowDown') {
            if (this.annotation === '') {
                if (this.tokenrow.isSelected()) {
                    this.tokenrow.downArrow()
                } else {
                    this.activateNextRegion()
                    this.inputbox.nativeElement.focus()
                }
            }
        } else if (evt.code === 'ArrowLeft') {
            if (this.annotation === '') {
                this.tokenrow.leftArrow()
            }
        }
        else if (evt.code === 'ArrowRight') {
            if (this.annotation === '') {
                this.tokenrow.rightArrow()
            }
        }
        else if (evt.code === 'Escape') {
            this.insertpos = null
            this.tokenrow.setInsert(null)
            this.tokenrow.reset()
            this.annotation = ''
            this.anno.completions = []
            this.allodisp.clearCandidates()
        }
    }
    // We only use this to detect enter
    annotationKeyPress(evt: KeyboardEvent): void {
        if (evt.code === 'Enter') {
            if (this.annotation !== '') {
                this.newToken()               
            } else {
                if (this.tokenrow.isSelected()) {
                    this.tokenrow.enter()
                } else {
                    if (this.insertpos !== null) {
                        this.tokenrow.setInsert(null)
                    } else {
                        this.activateNextRegion()
                        this.inputbox.nativeElement.focus()
                    }
                }
            }
        } else if (evt.code === 'Space') {
            this.newToken()
        }
    }
    // Otherwise we use this because it works better
    annotationChanged(): void {
        this.keySub.next(this.annotation)
        this.tokenrow.reset()
    }

    newToken() {
        this.anno.upsertToken(this.annotation, this.tokenrow.getinsertpos())
        this.clearAnno()
        if (this.insertpos !== null) {
            this.tokenrow.setInsert(this.insertpos + 1)
        }
    }


    removeToken(token: { glossary_entry_id: string, token_id: string, form: string }) {
        this.anno.removeToken(token)
        this.inputbox.nativeElement.focus()
    }

    activatePreviousRegion(): void {
        this.insertpos = null
        this.anno.activatePrevious()
        this.clearAnno()
        this.tokenrow.setInsert(null)
        this.allodisp.setRegion(this.anno.reg())
    }
    activateNextRegion(): void {
        this.insertpos = null
        this.anno.activateNext()
        this.clearAnno()
        this.tokenrow.setInsert(null)
        this.allodisp.setRegion(this.anno.reg())
    }

    lastWord(): string {
        return this.annotation.toLocaleLowerCase().trim()
    }

    // filterSuggestions(): string[] {
    //     const lw = this.lastWord()
    //     if (lw.length < 2) {
    //         return []
    //     }
    //     const fl = this.anno.completions.filter(x => x.search(lw) !== -1)
    //     return fl
    // }

    vadClick(time: number): void {
        const f = this.anno.navigateToApproximateTime(time)
        if (f !== null) {
            this.insertpos = null
            this.annotation = f
            this.allodisp.setRegion(this.anno.reg())
        }
    }
    // clickbreak(evt: MouseEvent, pos: number) {
    //     evt.preventDefault()
    //     this.insertpos = this.insertpos === pos ? null : pos
    //     this.inputbox.nativeElement.focus()
    // }
    tokenEvent(event: {token?: {glossary_entry_id: string, token_id: string, form: string}, pos?: number, action: string}) {
        console.log('token event', event)
        if (event.action === 'insert') {
            this.insertpos = event.pos
            this.inputbox.nativeElement.focus()
        } else if (event.action === 'del') {
            const t = this.anno.getTokens()[event.pos]
            this.removeToken(t)
        }
    }

    clickTranscript(i: number) {
        this.insertpos = null
        this.anno.changeRegion(i)
        this.allodisp.setRegion(this.anno.reg())
        this.inputbox.nativeElement.focus()
    }

    clearAnno() {
        this.annotation = ''
        this.anno.completions = []
    }


}