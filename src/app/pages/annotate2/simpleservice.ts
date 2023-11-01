import { APIMediaEntry, APIProject } from 'src/app/interface'
import { BackendService } from 'src/app/services/backend.service'
import { Injectable } from '@angular/core'
import WaveSurfer from 'wavesurfer.js'
import { Observable, Subject } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { AllodisplayComponent } from 'src/app/components/allodisplay/allodisplay.component'
import { VadmapComponent } from 'src/app/components/vadmap/vadmap.component';
import { AuthService } from 'src/app/services/auth.service'

interface WSSProtocolResp {
    type: string
    data: WSAPIDiscovered | WSAPIInit
}

interface WSAPIDiscovered {
    phones: string
    typed: string
    start: number
    stop: number
    completions: string[]
}

interface WSAPIBg {
    id: string
    start: number
    end: number
    tokens: {glossary_entry_id: string, token_id: string}[]
}

interface IGlossaryEntries {
    [id: string]: {
        _id: string
        gloss: string
        form: string
        user: string
        canonical: boolean
        glossary_id: string
        tokens: { breath_group_id: string, project_id: string, token_id: string }[]
    }
}

interface WSAPIInit {
    breathGroups: WSAPIBg[]
    glossaryEntries: IGlossaryEntries
}

interface ITokenPlace {
    start?: number
    stop?: number
    token: string
}

export interface IRegion {
    reg: any // wavesurfer isn't typed
    start: number
    end: number
    txt: string
    bgid?: string
    allo: string
    wordspot?: { token: string, alignment: { distance: number, start: number, stop: number }[] }[]
    accepted: ITokenPlace[]
}

export interface IBackendEvents {
    found?: {
        phones: string
        typed: string
        start: number
        stop: number
        completions: string[]
    }
}

@Injectable({
    providedIn: 'root'
})
export class SimpleAnnotationService {
    ws: WaveSurfer
    readySubject: Subject<any> = new Subject()
    media: APIMediaEntry
    //project: APIProject
    startplay: number
    playtick: number
    progressSubject: Subject<{ e: number, t: number }> = new Subject()
    regions: IRegion[] = []
    rIndex = null
    host = location.hostname === 'localhost' ? 'ws://localhost:8000/session/' : 'ws:/session/'
    wssub: WebSocketSubject<WSSProtocolResp>
    querying = false
    suggested: ITokenPlace[] = []
    completions: string[] = []
    allodisp: AllodisplayComponent
    projectId: string
    vad: VadmapComponent
    breathgroups: WSAPIBg[] = []
    glossaryEntries: IGlossaryEntries
    tokenSubject: Subject<any> = new Subject()
    constructor(
        private backend: BackendService,
        private auth: AuthService
    ) { }
    async loadProject(ws: WaveSurfer, ad: AllodisplayComponent, project: APIProject, media: APIMediaEntry): Promise<void> {
        this.media = media
        this.allodisp = ad
        this.ws = ws
        // connect websocket after wavesurfer loaded
        this.ws.on('ready', () => {
            this.subscribeWs()
        })
        this.projectId = project.id
        console.log('loading')
        this.wssub = webSocket(this.host + this.projectId + '/' + this.media.id)
        this.ws.load(this.backend.getMediaURL(this.media), this.media.agents.peaks)
        this.send({ type: 'user', data: this.auth.getUser().uid })
        await this.readySubject.toPromise()
        this.ws.on('play', () => {
            this.startplay = (new Date()).valueOf()
            this.playtick = 0
            this.animtick()
        })
        this.ws.on('pause', () => {
            this.seekRegionStart()
        })
    }
    animtick(): void {
        const elapsed = (new Date()).valueOf() - this.startplay
        const pt = Math.floor(elapsed / 50)
        if (pt !== this.playtick) {
            this.progressSubject.next({ e: elapsed, t: this.ws.getCurrentTime() })
            this.playtick = pt
        }
        if (this.ws.isPlaying()) {
            requestAnimationFrame(this.animtick.bind(this))
        }
    }
    observePlay(): Observable<{ e: number, t: number }> {
        return this.progressSubject.asObservable()
    }

    postLoadInit(): void {
        this.regions = []
        for (const seg of this.media.agents.regions) {
            const reg = this.ws.addRegion({
                start: seg.start,
                end: seg.end,
                drag: false,
                color: 'rgba(50, 50, 50, 0.1)',
                waveColor: 'blue',
                handleStyle: {
                    left: {
                        backgroundColor: '#673ab7'
                    },
                    right: {
                        backgroundColor: '#673ab7'
                    }
                }
            })
            this.regions.push({
                start: seg.start,
                end: seg.end,
                allo: seg.phones,
                wordspot: seg.wordspotting ? seg.wordspotting : null,
                reg,
                txt: '',
                accepted: []
            })
        }
        console.log('regions', this.regions)
        console.log('init data', this.breathgroups)
        this.changeRegion(0)
        this.allodisp.init(this.observePlay())
        this.allodisp.setRegion(this.thisRegion())
        this.readySubject.complete()
    }
    destroy(): void {
        if (this.ws) {
            this.ws.unAll()
        }
        this.progressSubject.complete()
        this.wssub.complete()
    }

    changeRegion(r: number): void {
        if (r === this.rIndex) {
            return
        }
        if (this.rIndex !== null) {
            console.log('set grey')
            this.thisRegion().reg.update({
                color: 'rgba(50, 50, 50, 0.1)'
            })
        }
        this.updateGlossary()
        this.rIndex = r
        this.thisRegion().reg.update({
            color: 'rgba(20, 150, 0, 0.15)'
            //color: 'rgba(255, 240, 65, 0.2)'
        })
        this.seekTo(this.thisRegion().start)
        this.thisRegion().reg.play()
        this.completions = []
    }
    thisRegion(): IRegion {
        return this.regions[this.rIndex]
    }
    seekTo(seconds: number): void {
        console.log('seeking to', seconds)
        this.ws.seekAndCenter(seconds / this.ws.getDuration())
    }
    previousAnno(): string {
        if (!this.rIndex) {
            return ''
        } else {
            return this.regions[this.rIndex - 1].txt
        }
    }

    nextAnno(): string {
        if (this.rIndex && this.rIndex < this.regions.length - 1) {
            return this.regions[this.rIndex + 1].txt
        } else {
            return ''
        }
    }
    setAnnotation(anno: string): void {
        this.regions[this.rIndex].txt = anno
    }
    activateNext(): string {
        if (this.suggested.length) {
            this.thisRegion().accepted.push(
                this.suggested[0]
            )
            this.suggested = []
        }
        if (this.rIndex === this.regions.length - 1) {
            return this.thisRegion().txt
        } else {
            this.changeRegion(this.rIndex + 1)
            return this.thisRegion().txt
        }
    }

    activatePrevious(): string {
        if (this.suggested.length) {
            this.thisRegion().accepted.push(
                this.suggested[0]
            )
            this.suggested = []
        }
        if (!this.rIndex) {
            return this.thisRegion().txt
        } else {
            this.changeRegion(this.rIndex - 1)
            return this.thisRegion().txt
        }
    }
    navigateToApproximateTime(time: number): string {
        let bestdistance: number = null
        let fid: number = null
        for (const [i, v] of this.regions.entries()) {
            const d = Math.abs(v.start - time)
            if (fid === null || d < bestdistance) {
                bestdistance = d
                fid = i
            }
        }
        if (fid !== null) {
            this.changeRegion(fid)
            return this.thisRegion().txt
        } else {
            return null
        }
    }
    keydown_play(): void {
        this.thisRegion().reg.play()
    }
    annotationKeypress(anno: string, cg: number): void {
        console.log('keypress', anno)
        const splitwords = anno.split(' ')
        const lastword = splitwords[splitwords.length - 1]
        if (lastword.length >= 2) {
            this.send({
                type: 'typed',
                data: { poschange: cg, tokens: splitwords, phones: this.thisRegion().allo }
            })
        } else {
            this.suggested = []
        }
        // lets make sure the current input matches our accepted range
        const ra = this.thisRegion().accepted.filter(x => splitwords.findIndex(y => y === x.token) !== -1)
        if (ra.length !== this.thisRegion().accepted.length) {
            // it doesn't so let's do something about it
            this.thisRegion().accepted = ra
            this.allodisp.setRegion(this.thisRegion())
        }
    }


    //
    // Websocket
    //
    subscribeWs(): void {
        const fixCompletions = (arr: string[], ent: string): string[] => {
            console.log('start', arr)
            const unique = [...new Set(arr)].filter(x => x !== ent)
            unique.sort((a, b) => b.length - a.length)
            console.log('sorted', unique)
            return unique
        }
        this.wssub.subscribe((resp: WSSProtocolResp) => {
            console.log('session ws got', resp)
            if (resp.type === 'discovered') {
                console.log('discovered returned', resp.data)
                const data = resp.data as WSAPIDiscovered
                if (data.phones !== this.thisRegion().allo) {
                    console.log('discovered response is for another region')
                } else {
                    // since this is delayed, have we accepted it already?
                    console.log('resp', data.typed, resp.data)
                    const fi = this.thisRegion().accepted.find(x => x.token === data.typed)
                    if (fi) {
                        // if so, set the alignment
                        console.log('setting alignment', resp.data)
                        fi.start = data.start
                        fi.stop = data.stop
                    } else {
                        // otherwise let's add it as a suggestion
                        this.suggested = [{
                            token: data.typed,
                            start: data.start,
                            stop: data.stop
                        }
                        ]
                    }
                    this.completions = fixCompletions(data.completions, data.typed)
                    this.allodisp.setRegion(this.thisRegion())
                    this.allodisp.addCandidate(this.suggested[0])
                }
            }
            else if (resp.type === 'init') {
                const data = resp.data as WSAPIInit
                this.breathgroups = data.breathGroups
                this.glossaryEntries = data.glossaryEntries
                this.postLoadInit()
            }
        })
    }


    send(data: any): void {
        console.log('sending to ws', data)
        this.wssub.next(data)
    }
    space(): void {
        const splitwords = this.thisRegion().txt.split(' ')
        const lastword = splitwords[splitwords.length - 1]
        if (this.suggested.length) {
            this.thisRegion().accepted.push(this.suggested[0])
        } else {
            this.thisRegion().accepted.push({ token: lastword })
        }
        this.suggested = []
        this.completions = []
        console.log('region', this.thisRegion())
        this.allodisp.setRegion(this.thisRegion())
        this.updateGlossary()
    }

    seekRegionStart(): void {
        this.seekTo(this.thisRegion().start)
        this.progressSubject.next({ e: this.startplay, t: this.ws.getCurrentTime() })
    }


    updateGlossary(): void {
        if (!this.regions[this.rIndex]) {
            return
        }
        

    }

    getTokens(): {form: string, token_id: string}[] {
        if (!this.breathgroups || !this.breathgroups[this.rIndex]) {
            return []
        }
        return this.breathgroups[this.rIndex].tokens.map(x => {
            return {
                form: this.glossaryEntries[x.glossary_entry_id].form,
                token_id: x.token_id
            }
        })
    }
}

