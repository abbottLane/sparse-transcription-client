import { Injectable } from "@angular/core";
import WaveSurfer from 'wavesurfer.js'
import { Subject } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { APIMediaEntry, APIProject } from 'src/app/interface'
import { BackendService } from 'src/app/services/backend.service'
import { AuthService } from 'src/app/services/auth.service'
import { AllodisplayComponent } from "src/app/components/allodisplay/allodisplay.component";

interface WSSProtocolResp {
    type: string
    data: WSAPIDiscovered | WSAPIInit | WSAPINewTokenR | WSAPIRemTokenR
}

interface IGlossaryEntry {
    canonical: boolean
    form: string
    gloss: string
    glossary_id: string
    id: string
    lexical_entry?: {
        examples: string[][]
        pos: string
        translation: string
    }
    tokens: { breath_group_id: string, project_id: string, token_id: string, glossary_entry_id: string }[][]
    user: string
}

interface ICompletion {
    token: string
    userEntry: IGlossaryEntry,
    canonEntry: IGlossaryEntry
}

interface WSAPIDiscovered {
    alignment: ITokenPlace[]
    phones: string
    typedPos: number
    typed: string
    completions: ICompletion[]
}

interface WSAPIInit {
    breathGroups: {
        id: string
        start: number
        end: number
        tokens: { glossary_entry_id: string, token_id: string, form: string }[]
    }[]
    glossaryEntries: IGlossaryEntries
}

interface WSAPIAlign {
    alignment: ITokenPlace[]
    phones: string
}

interface WSAPINewTokenR {
    glossary_entry: IGlossaryEntry
    breath_group: IBreathgroup
}

interface WSAPINewTokenS {
    breath_group_id: string
    glossary_id: string
    media_id: string
    form: string
    position?: number
}

interface WSAPIRemTokenR {
    removed_token_id: string
    breath_group: IBreathgroup
}

interface IGlossaryEntries {
    [id: string]: IGlossaryEntry
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
    txt: string // total string, all tokens
    bgid?: string
    allo: string
    tokens: IToken[]
    accepted: ITokenPlace[]
}

export interface IBreathgroup {
    id: string
    start: number
    end: number
    tokens: { token_id: string, glossary_entry_id: string }[]
}

interface IToken {
    glossary_entry_id: string,
    token_id: string
    form: string 
}

@Injectable({
    providedIn: 'root'
})
export class AnnotationService {
    ws: WaveSurfer
    readySubject: Subject<any> = new Subject()
    media: APIMediaEntry
    allodisp: AllodisplayComponent
    wssub: WebSocketSubject<WSSProtocolResp>
    host = location.hostname === 'localhost' ? 'ws://localhost:8000/session/' : 'wss://' + window.location.hostname + '/api/session/'
    playtick: number
    startplay: number
    progressSubject: Subject<{ t: number }> = new Subject()
    regions: IRegion[] = []
    rIndex = null
    glossaryEntries: IGlossaryEntries
    project: APIProject
    completions: ICompletion[] = []
    alignments: ITokenPlace[] = []
    tokens: IToken[] = []
    prevanno = ''
    nextanno = ''
    constructor(
        private backend: BackendService,
        private auth: AuthService
    ) { }
    async loadProject(ws: WaveSurfer, ad: AllodisplayComponent, project: APIProject, media: APIMediaEntry): Promise<void> {
        const subWS = () => {
            this.wssub.subscribe((resp: WSSProtocolResp) => {
                console.log('session ws got', resp)
                if (resp.type === 'discovered') {
                    const data = resp.data as WSAPIDiscovered
                    this.incomingDiscovered(data)
                }
                else if (resp.type === 'init') {
                    const data = resp.data as WSAPIInit
                    this.postLoadInit(resp.data as WSAPIInit)
                } else if (resp.type === 'newtoken') {
                    const data = resp.data as WSAPINewTokenR
                    this.gotNewToken(data)
                } else if (resp.type === 'remtoken') {
                    console.log('rem token')
                    const data = resp.data as WSAPIRemTokenR
                    this.setBreathgroupTokens(data.breath_group)
                } else if (resp.type === 'align') {
                    const data = resp.data as WSAPIAlign
                    if (this.reg().allo = data.phones) {
                        this.reg().accepted = data.alignment
                        this.allodisp.setRegion(this.reg())
                    }
                }
            })
        }
        this.media = media
        this.allodisp = ad
        this.ws = ws
        // connect websocket after wavesurfer loaded
        this.ws.on('ready', () => {
            subWS()
        })
        this.project = project
        console.log('loading')
        this.wssub = webSocket(this.host + this.project.id + '/' + this.media.id)
        this.ws.load(this.backend.getMediaURL(this.media), this.media.agents.peaks)
        this.send({ type: 'user', data: this.auth.getUser().uid })
        await this.readySubject.toPromise()
        this.ws.on('play', () => {
            this.playtick = 0
            this.startplay = (new Date()).valueOf()
            this.animtick()
        })
        this.ws.on('pause', () => {
            this.seekRegionStart()
        })
    }
    animtick(): void {
        if (this.ws.getCurrentTime() > this.reg().end) {
            this.ws.pause()
            return
        }
        const elapsed = (new Date()).valueOf() - this.startplay
        const pt = Math.floor(elapsed / 50)
        if (pt !== this.playtick) {
            this.progressSubject.next({ t: this.ws.getCurrentTime() })
            this.playtick = pt
        }
        if (this.ws.isPlaying()) {
            requestAnimationFrame(this.animtick.bind(this))
        }
    }
    seekRegionStart(): void {
        this.seekTo(this.reg().start)
        this.progressSubject.next({ t: this.ws.getCurrentTime() })
    }
    reg(): IRegion {
        return this.regions[this.rIndex]
    }
    seekTo(seconds: number): void {
        console.log('seeking to', seconds)
        this.ws.seekAndCenter(seconds / this.ws.getDuration())
    }

    postLoadInit(init: WSAPIInit): void {
        this.regions = []
        this.glossaryEntries = init.glossaryEntries
        for (const [i, bg] of init.breathGroups.entries()) {
            const reg = this.ws.addRegion({
                start: bg.start,
                end: bg.end,
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
            const tokens = bg.tokens.map(x => {
                return {
                    glossary_entry_id: x.glossary_entry_id,
                    token_id: x.token_id,
                    form: init.glossaryEntries[x.glossary_entry_id].form
                }
            })
            this.regions.push({
                start: bg.start,
                end: bg.end,
                allo: this.media.agents.regions[i].phones,
                bgid: bg.id,
                reg,
                txt: '',
                tokens: tokens,
                accepted: []
            })
        }
        console.log('regions', this.regions)
        this.changeRegion(0)
        this.allodisp.init(this.progressSubject.asObservable())
        this.allodisp.setRegion(this.reg())
        this.readySubject.complete()
        if (this.reg().tokens.length) {
            this.send({
                type: 'align',
                data: { tokens: this.reg().tokens.map(x => x.form), phones: this.reg().allo }
            })
        }
    }
    send(data: any): void {
        console.log('sending to ws', data)
        this.wssub.next(data)
    }
    changeRegion(r: number): void {
        if (r === this.rIndex) {
            return
        }
        if (this.ws.isPlaying()) {
            console.log('pausing')
            this.ws.pause()
        }
        if (this.rIndex !== null) {
            console.log('set grey')
            this.reg().reg.update({
                color: 'rgba(50, 50, 50, 0.1)'
            })
        }
        //this.updateGlossary()
        this.rIndex = r
        this.reg().reg.update({
            color: 'rgba(20, 150, 0, 0.15)'
            //color: 'rgba(255, 240, 65, 0.2)'
        })
        this.seekTo(this.reg().start)
        console.log('playing')
        this.reg().reg.play()
        this.completions = []
        this.tokens = this.reg().tokens // perf optimisation
        this.prevanno = this.getPreviousAnno() // perf optimisation
        this.nextanno = this.getNextAnno() // perf optimisation
    }
    destroy(): void {
        if (this.ws) {
            this.ws.unAll()
        }
        this.progressSubject.complete()
        this.wssub.complete()
    }
    activateNext(): string {
        if (this.rIndex === this.regions.length - 1) {
            return this.reg().txt
        } else {
            this.changeRegion(this.rIndex + 1)
            return this.reg().txt
        }
    }

    activatePrevious(): string {
        if (this.rIndex === 0) {
            return this.reg().txt
        } else {
            this.changeRegion(this.rIndex - 1)
            return this.reg().txt
        }
    }

    getAnnoStringForIndex(ind: number): string {
        const r = this.regions[ind]
        let anno = ''
        for (const t of r.tokens) {
            anno += t.form + ' '
        }
        return anno.trim()
    }

    getPreviousAnno(): string {
        if (!this.rIndex) {
            return ''
        } else {
            return this.getAnnoStringForIndex(this.rIndex - 1)
        }
    }

    getNextAnno(): string {
        console.log('x', this.rIndex, this.regions.length)
        if (this.rIndex !== null && this.rIndex < this.regions.length - 1) {
            let t = this.getAnnoStringForIndex(this.rIndex + 1)
            console.log('t', t)
            return this.getAnnoStringForIndex(this.rIndex + 1)
        } else {
            return ''
        }
    }

    getTokens() {
        return this.reg() ? this.reg().tokens : []
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
            return this.reg().txt
        } else {
            return null
        }
    }

    upsertToken(annotation: string, ipos: number) {
        const ts = annotation.toLowerCase().trim()
        if (ts !== '') {
            const nt: WSAPINewTokenS = {
                breath_group_id: this.reg().bgid,
                glossary_id: this.project.glossary_id,
                form: ts,
                media_id: this.media.id,
                position: ipos
            }
            this.send({ type: 'addtoken', data: nt })
        }
    }

    gotNewToken(response: WSAPINewTokenR) {
        // add to glossary if it's not already
        if (!this.glossaryEntries.hasOwnProperty(response.glossary_entry.id)) {
            this.glossaryEntries[response.glossary_entry.id] = response.glossary_entry
        }
        this.setBreathgroupTokens(response.breath_group)
    }

    removeToken(token: { glossary_entry_id: string, token_id: string, form: string }) {
        const t = {
            glossary_id: this.project.glossary_id,
            glossary_entry_id: token.glossary_entry_id,
            token_id: token.token_id,
            media_id: this.media.id,
            breath_group_id: this.reg().bgid
        }
        this.send({ type: 'deltoken', data: t })
    }

    setBreathgroupTokens(bg: IBreathgroup) {
        const reg = this.regions.find(x => bg.id === x.bgid)
        const tokens = bg.tokens.map(x => {
            return {
                glossary_entry_id: x.glossary_entry_id,
                token_id: x.token_id,
                form: this.glossaryEntries[x.glossary_entry_id].form
            }
        })
        reg.tokens = tokens
        this.tokens = tokens
    }

    keydown_play(): void {
        this.reg().reg.play()
    }

    annotationKeypress(anno: string, insertpos: number): void {
        const annostr = anno.trim()
        if (annostr.length < 2) {
            this.alignments = []
            return
        }
        const tokens = this.reg().tokens.map(x => x.form)
        if (insertpos !== null) {
            tokens.splice(insertpos, 0, annostr)
        } else {
            tokens.push(annostr)
        }
        this.send({
            type: 'typed',
            data: { tokens, phones: this.reg().allo, typedPos: insertpos }
        })
    }

    incomingDiscovered(data: WSAPIDiscovered) {
        console.log('processing discovered')
        if (data.phones !== this.reg().allo) {
            console.warn('discovered response is for another region')
            return
        }
        const fixCompletions = (arr: string[], ent: string): string[] => {
            console.log('start', arr)
            const unique = [...new Set(arr)].filter(x => x !== ent)
            unique.sort((a, b) => b.length - a.length)
            console.log('sorted', unique)
            return unique
        }
        this.completions = data.completions
        console.log('alignments', this.alignments)
        console.log('completitions', this.alignments)

        //this.completions = fixCompletions(data.completions, data.typed)
        const aligned: ITokenPlace[] = []
        let cand: ITokenPlace
        console.log('typedPos', data.typedPos)
        const tpos = data.typedPos !== undefined ? data.typedPos : aligned.length - 1
        cand = data.alignment.splice(tpos,1)[0]
        this.reg().accepted = data.alignment
        console.log('tpos', tpos)
        console.log('candidate', cand, 'alignment', data.alignment)
        this.allodisp.setRegion(this.reg())
        this.allodisp.addCandidate(cand)   
    }

}

