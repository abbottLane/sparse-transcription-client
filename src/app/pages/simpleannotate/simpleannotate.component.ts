import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { EventManager } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { WavesurferComponent } from 'src/app/components/wavesurfer/wavesurfer.component';
import { BackendService } from 'src/app/services/backend.service';
import { SimpleAnnotationService, IAnnoState } from './simpleannotate.service';
import { VadmapComponent } from 'src/app/components/vadmap/vadmap.component';
import { APIProject, APIMediaEntry } from 'src/app/interface';

import {
    debounceTime,
    distinctUntilChanged
  } from 'rxjs/operators'
import { SimplephonesComponent } from 'src/app/components/simplephones/simplephones.component';

@Component({
    templateUrl: './simpleannotate.component.html',
    styleUrls: ['./simpleannotate.component.scss'],
    providers: [SimpleAnnotationService]
})
export class SimpleAnnotateComponent implements AfterViewInit, OnDestroy {
    @ViewChild(WavesurferComponent) wsc?: WavesurferComponent
    @ViewChild('typebox') inputbox: ElementRef
    @ViewChild('vad') vad: VadmapComponent
    @ViewChild('hinterbox') allodisp: SimplephonesComponent
    sub: Subscription
    ready = false
    removeGlobalEventListener: () => void
    media: APIMediaEntry
    project: APIProject
    annotation: string = ''
    keySub: Subject<any> = new Subject()
    @HostListener('window:blur', ['$event'])
    onBlur(event: FocusEvent): void {
        this.wsc.wavesurfer.pause()
    }
    constructor(
        public anno: SimpleAnnotationService,
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
                //console.log('annotate params', params.pid, params.mid)
                this.startup(params.pid, params.mid)
            })
        } else {
            console.log('wavesurfer element doesn\'t exist')
        }
        this.keySub.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe((anno: string) => {
            this.sendAlignmentRequest(anno)
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
            const dur = this.media.agents.regions.map(x => {
                return {start: x.start, end: x.end}
            })
            this.vad.load(this.media.metadata.duration, dur)
        }
        await this.anno.loadProject(this.wsc.wavesurfer, this.allodisp, this.project, this.media)
        this.wsc.wavesurfer.on('region-click', (region) => {
            const regidx =  this.anno.regions.findIndex(x => x.start === region.start)
            console.log('region click', regidx)
            this.anno.changeRegion(regidx)
            this.setState(IAnnoState.append)
        })
        setTimeout(() => {
            this.inputbox.nativeElement.focus()
            this.setState(IAnnoState.append)
        }, 500)
    }

    close(): void {
        this.router.navigate(['project', this.project.id])
    }

    // Global handler
    keyup(evt: KeyboardEvent): void {
        if (evt.repeat) {
            return
        }
        //console.log('keyup', evt.code)
        if (!this.ready) { return };
        if (evt.code === 'ControlLeft') {
            this.anno.keydown_play()
            this.inputbox.nativeElement.focus()
        } else if (evt.code === 'ArrowUp') {
            if (this.annotation === '') {
                console.log('empty anno')
                console.log('activatepreviousregion')
                this.activatePreviousRegion()
            }
        } else if (evt.code === 'ArrowDown') {
            if (this.annotation === '') {
                this.activateNextRegion()
            }
        }
        else if (evt.code === 'Escape') {
            this.setState(IAnnoState.append)
        }
    }
    // We only use this to detect enter
    annotationKeyPress(evt: KeyboardEvent): void {
        if (evt.repeat) {
            return
        }
        const target = evt.target as HTMLInputElement
        console.log(evt)
        if (evt.code === 'Enter' || evt.code === 'Space') {
            this.completeAnnotation()
        } else if (evt.code === 'ArrowLeft') {
            // shift cursor = force navigate
            // if we cusor left, shift the edit or insert position when in those modes, if at beginning, do nothing
            if (evt.shiftKey || target.selectionStart === 0) {
                if (this.anno.state === IAnnoState.append) {
                    // shift to editing the last token
                    this.setState(IAnnoState.edit, this.anno.tokens.length - 1)
                } else if (this.anno.state === IAnnoState.edit) {
                    if (this.anno.editpos === 0) {
                        this.setState(IAnnoState.insert, 0) // alternate between edit and insert
                    } else {
                        this.setState(IAnnoState.insert, this.anno.editpos)
                    }
                } else if (this.anno.state === IAnnoState.insert) {
                    if (this.anno.insertpos > 0) {
                        this.setState(IAnnoState.edit, this.anno.insertpos - 1) // edit is to the left of the current insert
                    }
                }
                evt.preventDefault()
            }
        } else if (evt.code === 'ArrowRight') {
            console.log('ar', target.selectionStart, this.annotation.length)
            // shift cursor = force navigate
            // if we cursor past the end of a word, and we are in an edit or insert mode, shift to append mode
            if (evt.shiftKey || this.annotation.length === 0 || target.selectionStart === this.annotation.length) {
                if (this.anno.state === IAnnoState.edit) {
                    if (this.anno.editpos < this.anno.tokens.length -1) {
                        this.setState(IAnnoState.insert, this.anno.editpos + 1) // again, alternative between edit and insert
                    } else if (this.anno.editpos === this.anno.tokens.length - 1) {
                        this.setState(IAnnoState.append)
                    } 
                } else if (this.anno.state === IAnnoState.insert) {
                    if (this.anno.insertpos < this.anno.tokens.length) { // doesn't make sense to insert after 
                        this.setState(IAnnoState.edit, this.anno.insertpos)
                    } else if (this.anno.editpos === this.anno.tokens.length - 1) {
                        this.setState(IAnnoState.append)
                    } 
                }
                evt.preventDefault()
            }
        }
    }
    // Otherwise we use this because it works better
    annotationChanged(): void {
        this.keySub.next(this.annotation)
        //this.tokenrow.reset()
    }

    completeAnnotation() {
        if (this.anno.state === IAnnoState.append) {
            this.anno.upsertToken(this.annotation)
            this.annotation = ''
        } else if (this.anno.state === IAnnoState.insert) {
            this.anno.upsertToken(this.annotation, this.anno.insertpos)
            this.annotation = ''

        } else if (this.anno.state === IAnnoState.edit) {
            console.log('calling editToken', this.anno.editpos, this.annotation)
            this.anno.editToken(this.anno.editpos, this.annotation)
            this.setState(IAnnoState.append)
            // now what?
        }
    }

    removeToken(token: { glossary_entry_id: string, token_id: string, form: string }) {
        this.anno.removeToken(token)
        this.inputbox.nativeElement.focus()
    }

    activatePreviousRegion(): void {
        this.anno.activatePrevious()
        this.setState(IAnnoState.append)
    }
    activateNextRegion(): void {
        this.anno.activateNext()
        this.setState(IAnnoState.append)
    }

    lastWord(): string {
        return this.annotation.toLocaleLowerCase().trim()
    }

    vadClick(time: number): void {
        const f = this.anno.navigateToApproximateTime(time)
        if (f !== null) {
            this.setState(IAnnoState.append)
        }
    }

    tokenEvent(event: {token?: {glossary_entry_id: string, token_id: string, form: string}, pos?: number, action: string}) {
        console.log('token event', event)
        if (event.action === 'insert') {
            this.anno.insertpos = event.pos
            this.inputbox.nativeElement.focus()
        } else if (event.action === 'del') {
            const t = this.anno.getTokens()[event.pos]
            this.removeToken(t)
        }
    }

    clickTranscript(i: number) {
        this.anno.changeRegion(i)
        this.setState(IAnnoState.append, i)
    }
    
    clickToken(pos: number) {
        if (this.anno.insertpos === null) {
            // enter token edit mode
            this.setState(IAnnoState.edit, pos)
            return
        } 
    }

    sendAlignmentRequest(anno: string) {
        if (this.anno.state === IAnnoState.append) {
            this.anno.annotationKeypress(anno)
        } else if (this.anno.state === IAnnoState.insert) {
            this.anno.annotationKeypress(anno, this.anno.insertpos)
        } else if (this.anno.state = IAnnoState.edit) {
            this.anno.annotationKeypress(anno, this.anno.editpos)
        }
    }

    setState(state: IAnnoState, pos?: number) {
        if (state === IAnnoState.busy) {
            this.ready = false
        } else if (state === IAnnoState.append) {
            console.log('set state: append')
            this.ready = true
            this.anno.editpos = null
            this.anno.insertpos = null
            this.annotation = ''
            this.allodisp.setRegion(this.anno.reg())
            this.sendAlignmentRequest('')
            this.inputbox.nativeElement.focus()
        } else if (state === IAnnoState.insert) {
            console.log('set state: insert')
            this.ready = true
            this.anno.insertpos = pos
            this.anno.editpos = null
            this.annotation = ''
            this.inputbox.nativeElement.focus()
        } else if (state === IAnnoState.edit) {
            console.log('set state: edit')
            this.ready = true
            this.anno.editpos = pos
            this.anno.insertpos = null
            this.annotation = this.anno.getTokens()[pos].form
            this.inputbox.nativeElement.focus()
            console.log('editing token', this.anno.getTokens()[pos])
        }
        this.anno.state = state
    }

    getPlaceholder(): string {
        if (this.anno.state === IAnnoState.append) {
            return 'Type here...'
        } else if (this.anno.state === IAnnoState.insert) {
            return 'Insert...'
        } else if (this.anno.state === IAnnoState.edit) {
            return 'Hit return to delete...'
        }
        return ''
    }

    formatTimestamp(sec: number) {
        return new Date(sec * 1000).toISOString().substr(12, 7)
    }

    clickRegion(num: number) {
        console.log('click region', num)
    }

    clickDeleteToken(token) {
        this.anno.removeToken(token)
        this.setState(IAnnoState.append)
    }

}