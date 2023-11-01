import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WavesurferComponent } from 'src/app/components/wavesurfer/wavesurfer.component';
import WaveSurfer from 'wavesurfer.js'
import { MatDialog } from '@angular/material/dialog';
import { EventManager } from '@angular/platform-browser';
import { AnnotateService } from './annotate.service';

enum RegionState {
    VIRGIN,
    TEMPMARK,
    REGIONSEL
}

@Component({
    templateUrl: './annotate.component.html',
    styleUrls: ['./annotate.component.scss'],
    providers: [AnnotateService]
})
export class AnnotateComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(WavesurferComponent) wsc?: WavesurferComponent
    @ViewChild('typebox') inputbox: ElementRef
    ws: WaveSurfer
    removeGlobalEventListener1: () => void
    removeGlobalEventListener2: () => void
    regions: Map<string, { tokenId: string, wsRegion: any }> = new Map() // key = wavesurfer region ids
    transcript: { token: string, regionId: string }[] = []
    // currentRegion: {
    //     wsRegion: any
    //     tokenId?: string
    // } = null
    // state properties
    annotation = '' // value of text input box
    prevAnno = ''
    nextAnno = ''
    ready = false
    maxplaypoint: number = null // to stop playback on entering a new region
    regionState: RegionState = RegionState.VIRGIN
    wsRegion: any
    seeking = false
    constructor(private dialog: MatDialog, private eventManager: EventManager, private annoservice: AnnotateService) {
        this.removeGlobalEventListener1 = this.eventManager.addGlobalEventListener(
            'document', 'keydown', this.keydown.bind(this)) as () => void
        this.removeGlobalEventListener2 = this.eventManager.addGlobalEventListener(
            'document', 'keyup', this.keyup.bind(this)) as () => void
    }

    ngOnInit(): void {
        this.annoservice.startblank()
    }

    ngOnDestroy(): void {
        this.removeGlobalEventListener1()
        this.removeGlobalEventListener2()
        if (this.ws) {
            this.ws.unAll()
        }
    }

    ngAfterViewInit(): void {
        if (this.wsc) {
            this.ws = this.wsc.wavesurfer
            this.ws.load('/assets/stuart_norne.wav')
            // for (const x of SampleJson.hits) {
            //     this.ws.addRegion({
            //         start: x.start,
            //         end: x.end,
            //         color: 'rgba(0, 0, 0, 0.5)'
            //     })
            // }
            this.ws.on('audioprocess', () => {
                this.playtick()
            })
            this.ws.on('ready', () => {
                this.postLoadInit()
            })
            this.ws.on('pause', () => {
                if (this.regionState === RegionState.REGIONSEL) {
                    this.seekTo(this.wsRegion.start + 0.001)
                }
            })
            this.ws.on('seek', (point: number) => {
                console.log('seek event', this.seeking)
                if (!this.seeking) {
                    const sec = point * this.ws.getDuration()

                    this.manualSeekTo(sec)
                }
                this.seeking = false
            })
        } else {
            console.log('wavesurfer element doesn\'t exist')
        }
        this.inputbox.nativeElement.focus()
    }

    postLoadInit(): void {
        this.annoservice.addTimeline(this.ws.getDuration())
        this.ready = true
    }

    playtick(): void {
        let t = this.ws.getCurrentTime()
        if (this.maxplaypoint && t > this.maxplaypoint) {
            this.ws.pause()
            t = this.maxplaypoint
        }
        if (this.regionState === RegionState.TEMPMARK) {
            this.wsRegion.update({ end: t })
        }

    }

    //
    // Keyboard event dispatchers
    //
    keydown(evt: KeyboardEvent): void {
        if (!this.ready || evt.repeat) { return };
        console.log('kd', evt)
        if (evt.code === 'ControlLeft') {
            this.keydown_play()
        } else if (evt.code === 'ArrowRight') {
            this.keydown_ff()
        } else if (evt.code === 'ArrowLeft') {
           this.keydown_rwd()
        }
    }

    keyup(evt: KeyboardEvent): void {
        if (!this.ready) { return };
        if (evt.code === 'ControlLeft') {
            if (this.regionState === RegionState.TEMPMARK) {
                this.ws.pause()
                this.inputbox.nativeElement.focus()
            }
        } else if (evt.code === 'ArrowRight') {
            if (this.ws.isPlaying()) {
                this.ws.setPlaybackRate(1)
                this.ws.pause()
            }
        }
    }

    annotationKeyPress(evt: KeyboardEvent): void {
        if (evt.code === 'Enter') {
            if (this.regionState === RegionState.REGIONSEL) {
                this.editAnnotation()
            } else if (this.regionState === RegionState.TEMPMARK) {
                this.addAnnotation()
            }
        }
    }

    //
    // Keyboard state change logic
    //
    keydown_play(): void {
        if (this.regionState === RegionState.REGIONSEL) {
            this.wsRegion.play()
        } else if (this.regionState === RegionState.VIRGIN) {
            // create temporary region
            this.wsRegion = this.ws.addRegion({
                start: this.ws.getCurrentTime(),
                end: this.ws.getCurrentTime(),
                drag: false,
                color: 'rgba(0, 200, 0, 0.2)'
            })
            this.regionState = RegionState.TEMPMARK
            this.inputbox.nativeElement.focus()
            this.play()
        } else if (this.regionState === RegionState.TEMPMARK) {
            // this is a 're play' to zero the end pos
            this.wsRegion.update({ end: this.wsRegion.start })
            this.play(this.wsRegion.start)
        }
    }

    keydown_ff(): void {
        if (this.regionState === RegionState.REGIONSEL) {
            this.activateNextRegion()
        } else if (this.regionState === RegionState.VIRGIN) {
            this.ws.setPlaybackRate(2)
            this.play()
        } else if (this.regionState === RegionState.TEMPMARK) {
            this.wsRegion.remove()
            this.regionState = RegionState.VIRGIN
            this.ws.setPlaybackRate(2)
            this.play()
        }
    }

    keydown_rwd(): void {
        if (this.regionState === RegionState.TEMPMARK) {
            this.wsRegion.remove()

        } else {
            this.activatePreviousRegion()
        }
    }

    addAnnotation(): void {
        console.log('add annotation')
        const tokenId = this.annoservice.addAnnotation(
            this.wsRegion.start,
            this.wsRegion.end,
            this.annotation)
        this.regions.set(this.wsRegion.id, {
            tokenId,
            wsRegion: this.wsRegion
        })
        this.transcript.push({ token: this.annotation, regionId: this.wsRegion.id })
        this.annotation = ''
        this.setWaveSurferRegionColours()
        this.regionState = RegionState.VIRGIN
        this.seekTo(this.wsRegion.end + 0.001) // bump one millisecond
        this.setPrevNextAnnoStrings()
        // to do: detect if we are hard up against another region, or at the end
    }

    editAnnotation(): void {
        console.log('edit annotation')
        this.annoservice.editAnnotation(
            this.regions.get(this.wsRegion.id).tokenId,
            this.wsRegion.start,
            this.wsRegion.end,
            this.annotation)
        const thisTranscript = this.transcript.find(t => t.regionId === this.wsRegion.id)
        console.log('edit found', thisTranscript)
        thisTranscript.token = this.annotation
    }

    play(playfrom?: number): void {
        const rid = this.findNextRegion()
        this.maxplaypoint = rid ? this.regions.get(rid).wsRegion.start : null
        this.ws.play(playfrom)
    }

    playpause(): void {
        this.ws.playPause()
    }

    getSortedWavesurferRegionList(): any[] {
        const regionList = Object.getOwnPropertyNames(this.ws.regions.list)
        if (regionList.length === 0) {
            return []
        } else {
            return regionList.map(x => this.ws.regions.list[x])
            //.filter(x => this.regionState !== RegionState.TEMPMARK || x.id !== this.wsRegion.id)
            .sort((a, b) => a.start - b.start)
        }
    }

    setWaveSurferRegionColours(): void {
        console.log('setWaveSurferRegionColours()')
        const altcols = ['rgba(75,75,75,0.2)', 'rgba(75,75,125,0.25)']
        const sList = this.getSortedWavesurferRegionList()
        console.log('region list', sList)
        for (let i = 0; i < sList.length; ++i) {
            const evencol = i % 2
            const reg = sList[i]
            // if (!reg.data.evencol || reg.data.evencol !== evencol) {
            //     console.log('seeing region',i,'to',altcols[evencol])
            //     reg.update({ color: altcols[evencol], data: { evencol } })
            // }
            reg.update({ color: altcols[evencol]})
        }
    }

    activatePreviousRegion(): void {
        const regId = this.findPreviousRegion()
        if (regId) {
            this.activateRegion(regId)
        } else {
            this.ws.seekAndCenter(0)
        }
    }

    findPreviousRegion(): string {
        const sList = this.getSortedWavesurferRegionList()
        if (sList.length === 0) {
            return null
        }
        const cTime = this.ws.getCurrentTime()
        for (let i = sList.length - 1; i >= 0; i--) {
            const region = sList[i]
            if (region.end < cTime) {
                return region.id
            }
        }
        return null
    }

    activateNextRegion(): void {
        const regId = this.findNextRegion()
        console.log('activateNextRegion()', regId)
        if (regId) {
            this.activateRegion(regId)
        } else {
            // aint no next region so go to next virgin space
            this.seekTo(this.wsRegion.end + .001)
            this.annotation = ''
            this.regionState = RegionState.VIRGIN
            this.setWaveSurferRegionColours()
        }
    }

    findNextRegion(): string {
        const sList = this.getSortedWavesurferRegionList()
        if (sList.length === 0) {
            return null
        }
        const cTime = this.ws.getCurrentTime()
        for (const region of sList) {
            if (region.start > cTime) {
                return region.id
            }
        }
        return null
    }

    activateRegion(regionId: string): void {
        if (this.ws.isPlaying()) {
            this.ws.pause()
        }
        this.setWaveSurferRegionColours() // reset colours
        const thisRegion = this.regions.get(regionId)
        this.wsRegion = this.regions.get(regionId).wsRegion
        this.wsRegion.update({color: 'rgba(0, 200, 0, 0.2)' })
        this.annotation = this.transcript.find(x => x.regionId === regionId).token
        this.seekTo(thisRegion.wsRegion.start)
        this.setPrevNextAnnoStrings(thisRegion.wsRegion.start)
        this.inputbox.nativeElement.focus()
        this.regionState = RegionState.REGIONSEL
    }

    seekTo(seconds: number): void {
        this.seeking = true
        this.ws.seekAndCenter(seconds / this.ws.getDuration())
    }

    setPrevNextAnnoStrings(time?: number): void {
        const tstart = time ? time : this.ws.getCurrentTime()
        const preg = this.findPreviousRegion()
        this.prevAnno = preg ? this.transcript.find(x => x.regionId === preg).token : ''
        const nreg = this.findNextRegion()
        this.nextAnno = nreg ? this.transcript.find(x => x.regionId === nreg).token : ''
    }

    manualSeekTo(s: number): void {
        console.log('manual seek to', s)
        if (this.ws.isPlaying()) {
            this.ws.pause()
        }
        const regions = this.getSortedWavesurferRegionList()
        const regspan = regions.find(x => s >= x.start && s <= x.end)
        console.log('found region', regspan)
        if (this.regionState === RegionState.TEMPMARK) {
            this.wsRegion.remove()
        }
        if (regspan) {
            this.activateRegion(regspan.id)
        } else {
            this.regionState = RegionState.VIRGIN
        }
    }


}
