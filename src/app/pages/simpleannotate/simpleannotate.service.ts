import { Injectable } from "@angular/core";
import WaveSurfer from 'wavesurfer.js'
import { Subject } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { APIMediaEntry, APIProject, IAlloK } from 'src/app/interface'
import { BackendService } from 'src/app/services/backend.service'
import { AuthService } from 'src/app/services/auth.service'
import { SimplephonesComponent } from "src/app/components/simplephones/simplephones.component";

interface WSSProtocolResp {
    type: string
    data: WSAPIInit | WSAPINewTokenR | WSAPIRemTokenR | WSAPIAlign
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

interface WSAPIRemTokenS {
    glossary_id: string
    glossary_entry_id: string 
    token_id: string 
    media_id: string 
    breath_group_id: string 
}

interface WSAPIRemTokenR {
    removed_token_id: string
    breath_group: IBreathgroup
}

interface WASAPIEditTokenS {
    glossary_id: string
    breath_group_id: string
    token_id: string
    glossary_entry_id: string 
    media_id: string
    form: string
    canonical: boolean
}

interface WSAPIEditTokenR {
    glossary_entry: IGlossaryEntry
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

interface IToken {
    glossary_entry_id: string,
    token_id: string
    form: string 
}

export interface IBreathgroup {
    id: string
    start: number
    end: number
    tokens: { token_id: string, glossary_entry_id: string }[]
}

export interface IRegion {
    reg: any // wavesurfer isn't typed
    start: number
    end: number
    txt: string // total string, all tokens
    bgid?: string
    allo: string
    allok: IAlloK[] | null
    tokens: IToken[]
    aligned: ITokenPlace[]
}

export enum IAnnoState {
    busy,
    append,
    insert,
    edit
}

@Injectable({
    providedIn: 'root'
})
export class SimpleAnnotationService {
    ws: WaveSurfer
    readySubject: Subject<any> = new Subject()
    media: APIMediaEntry
    allodisp: SimplephonesComponent
    wssub: WebSocketSubject<WSSProtocolResp>
    host = location.hostname === 'localhost' ? 'ws://localhost:8000/session/' : 'wss://' + window.location.hostname + '/api/session/'
    playtick: number
    startplay: number
    regions: IRegion[] = []
    rIndex = null
    glossaryEntries: IGlossaryEntries
    project: APIProject
    alignments: ITokenPlace[] = []
    tokens: IToken[] = []
    prevanno = ''
    nextanno = ''
    state: IAnnoState
    // These are for the new simple edit/insert options
    insertpos: number | null = null
    editpos: number | null = null
    constructor(
        private backend: BackendService,
        private auth: AuthService
    ) { }
    async loadProject(ws: WaveSurfer, ad: SimplephonesComponent, project: APIProject, media: APIMediaEntry): Promise<void> {
        const subWS = () => {
            this.wssub.subscribe((resp: WSSProtocolResp) => {
                console.log('session ws got', resp)
                if (resp.type === 'init') {
                    this.postLoadInit(resp.data as WSAPIInit)
                } else if (resp.type === 'newtoken') {
                    const data = resp.data as WSAPINewTokenR
                    // add to glossary if it's not already
                    if (!this.glossaryEntries.hasOwnProperty(data.glossary_entry.id)) {
                        this.glossaryEntries[data.glossary_entry.id] = data.glossary_entry
                    }
                    this.setBreathgroupTokens(data.breath_group)
                    if (this.state === IAnnoState.insert) {
                        ++this.insertpos
                    }
                } else if (resp.type === 'remtoken') {
                    console.log('rem token', resp)
                    const data = resp.data as WSAPIRemTokenR
                    this.setBreathgroupTokens(data.breath_group)
                } else if (resp.type === 'edittoken') {
                    const data = resp.data as WSAPIEditTokenR
                    console.log('edit token', resp)
                    // add to glossary if it's not already
                    if (!this.glossaryEntries.hasOwnProperty(data.glossary_entry.id)) {
                        this.glossaryEntries[data.glossary_entry.id] = data.glossary_entry
                    }
                    this.setBreathgroupTokens(data.breath_group)
                } else if (resp.type === 'align') {
                    const data = resp.data as WSAPIAlign
                    if (this.reg().allo = data.phones) { // check same region
                        this.reg().aligned = data.alignment
                        this.allodisp.setAlignedTokens(data.alignment)
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
            //this.progressSubject.next({ t: this.ws.getCurrentTime() })
            if (this.reg().allok) {
                this.allodisp.setPhoneByTime(this.ws.getCurrentTime())
            }
            this.playtick = pt
        }
        if (this.ws.isPlaying()) {
            requestAnimationFrame(this.animtick.bind(this))
        }
    }
 
    seekRegionStart(): void {
        console.log('seek region start')
        this.seekTo(this.reg().start)
        this.allodisp.seekStart()
    }
    reg(): IRegion {
        return this.regions[this.rIndex]
    }
    seekTo(seconds: number): void {
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
            const regdat: IRegion = {
                start: bg.start,
                end: bg.end,
                allo: this.media.agents.regions[i].phones,
                allok: this.media.agents.regions[i].allok ? this.media.agents.regions[i].allok : null,
                bgid: bg.id,
                reg,
                txt: '',
                tokens: tokens,
                aligned: []
            }
            this.regions.push(regdat)
        }
        this.readySubject.complete()
        setTimeout(() => {
            this.changeRegion(0)
            console.log('regions', this.regions)
        }, 500)
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
        })
        this.seekTo(this.reg().start)
        this.reg().reg.play()
        this.tokens = this.reg().tokens // perf optimisation
        this.prevanno = this.getPreviousAnno() // perf optimisation
        this.nextanno = this.getNextAnno() // perf optimisation
        this.allodisp.setRegion(this.reg())
    }
    destroy(): void {
        if (this.ws) {
            this.ws.unAll()
        }
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
        if (this.rIndex !== null && this.rIndex < this.regions.length - 1) {
            let t = this.getAnnoStringForIndex(this.rIndex + 1)
            return this.getAnnoStringForIndex(this.rIndex + 1)
        } else {
            return ''
        }
    }

    getTokens() {
        return this.reg() ? this.reg().tokens : []
    }

    navigateToApproximateTime(time: number): string | null {
        console.log('time', time, this.regions)
        // first check if we have actually clicked in a region
        let fid = this.regions.findIndex(x => time >= x.start && time <= x.end)
        if (fid !== -1) {
            console.log('clicked in region', fid)
            this.changeRegion(fid)
            return this.reg().txt
        } else {
            console.log('finding closest')
            // else just work out the closest region start position
            let bestdistance: number = null
            fid = null
            for (const [i, v] of this.regions.entries()) {
                const d = Math.abs(v.start - time)
                if (fid === null || d < bestdistance) {
                    bestdistance = d
                    fid = i
                }
            }
            if (fid === null || fid === this.rIndex) {
                return null
            }
               
            this.changeRegion(fid)
            return this.reg().txt
        }
    }

    upsertToken(annotation: string, ipos: number = null) {
        const ts = annotation.toLowerCase().trim()
        if (ts === '') {
            return
        }
        const nt: WSAPINewTokenS = {
            breath_group_id: this.reg().bgid,
            glossary_id: this.project.glossary_id,
            form: ts,
            media_id: this.media.id,
            position: ipos
        }
        if (ipos !== null) {
            nt.position = ipos
        }
        this.send({ type: 'addtoken', data: nt })
    }

    editToken(pos: number, annotation: string) {
        const ts = annotation.toLowerCase().trim()
        const token = this.getTokens()[pos]
        if (ts === '') {
            this.removeToken(token)
        } else {
            const ut: WASAPIEditTokenS = {
                breath_group_id: this.reg().bgid,
                glossary_id: this.project.glossary_id,
                form: annotation,
                media_id: this.media.id,
                token_id: token.token_id,
                glossary_entry_id: token.glossary_entry_id,
                canonical: false
            }
            this.send({ type: 'edittoken', data: ut })
        }
    }

    removeToken(token: { glossary_entry_id: string, token_id: string, form: string }) {
        const t: WSAPIRemTokenS = {
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
        if (this.tokens.length > 0) {
            this.send({
                type: 'align',
                data: { tokens: this.tokens.map(x => x.form), phones: this.reg().allo }
            })
        }
    }

    keydown_play(): void {
        this.reg().reg.play()
    }

    // debounced calls to this with current annotation value and an insert position where possible
    annotationKeypress(anno: string, pos?: number): void {
        const annostr = anno.trim()
        const tokens: string[] = this.reg().tokens.map(x => x.form)
        if (this.state === IAnnoState.append) {
            // push anno to end
            if (anno !== '') {
                tokens.push(annostr)
            }
        } else if (this.state === IAnnoState.insert) {
            // insert anno into list
            tokens.splice(pos, 0, annostr)
        } else if (this.state === IAnnoState.edit) {
            // replace list item with anno
            tokens[pos] = annostr
        }
        const ftokens = tokens.filter(x => x.trim() !== '')
        if (ftokens.length > 0) {
            this.send({
                type: 'align',
                data: { tokens: ftokens, phones: this.reg().allo }
            })
        }
    }



}

