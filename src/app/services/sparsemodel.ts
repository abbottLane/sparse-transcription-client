interface IMediaMetadata {
    duration: number
    samples: number
    sampleRate: number
    channels: number
    languageId?: string
}

export interface IMedia {
    id?: string
    name: string
    filepath?: string
    timestamp?: number
    project: string
    mimetype: string
    metadata: IMediaMetadata
}

interface IToken {
    glossaryEntryId: string
    breathGroupId: string
    confidence: number
    start: number
    end: number
    duration: number
}

interface IGlossaryEntry {
    form: string
    gloss: string
    tokens: { [key: string]: IToken }
}

interface IGlossary {
    entries: { [key: string]: IGlossaryEntry }
}

interface IBreathGroup {
    timelineId: string
    tokens: { [key: string]: IToken }
    start: number
    end: number
    duration: number
    excludedSpans: { start: number, end: number }[]
}

interface IInterpretation {
    start: number
    end: number
    timelineId: string
    context: string
}

interface ITimeline {
    id: string
    projectId: string
    interpretations: IInterpretation[]
    breathGroups: { [key: string]: IBreathGroup }
    media: IMedia[]
}

export interface ISparseProject {
    id: string
    glossary: IGlossary
    timelines: { [key: string]: ITimeline }
}

export class SparseProject {
    private data: ISparseProject
    constructor(loaddata: ISparseProject) {
        if (loaddata) {
            this.data = loaddata
        } else {
            this.data = {
                id: this._makeGuid(),
                glossary: { entries: {} },
                timelines: {}
            }
        }
    }
    getAllData(): ISparseProject {
        return this.data
    }
    //
    // Dodgy stackoverflow bitwise hax
    //
    _makeGuid(): string {
        const S4 = () => {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
        }
        return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
    }
    _hash(str1: string, str2: string): string {
        const combinedstring = str1 + str2;
        let h = 0;
        for (let i = 0; i < combinedstring.length; i++) {
            h = Math.imul(31, h) + combinedstring.charCodeAt(i) | 0
        }
        return h.toString().replace('-', 'm')
    }
    //
    // Project
    //
    createTimeline(media: IMedia[]): string {
        const nid = this._makeGuid()
        const newTimeline: ITimeline = {
            id: nid,
            projectId: this.data.id,
            interpretations: [],
            breathGroups: {},
            media
        }
        this.data.timelines[nid] = newTimeline
        return nid
    }
    getTimeline(id: string): ITimeline {
        return this.data.timelines[id]
    }
    getTimelineTranscript(id: string): Error {
        return new Error('Not implemented')
    }
    //
    // Timeline
    //
    addMediaToTimeline(timelineId: string, media: IMedia): void {
        this.data.timelines[timelineId].media.push(media)
    }
    addBreathGroup(timelineId: string, start: number, end: number): string {
        const t = this.data.timelines[timelineId]
        Object.values(t.breathGroups).forEach((bg: IBreathGroup) => {
            if ((start > bg.start && start < bg.end) || (end < bg.end && end > bg.start)) {
                throw new Error('Existing BreathGroup overlaps with span')
            }
        })
        const nid = this._makeGuid()
        t.breathGroups[nid] = {
            timelineId,
            start,
            end,
            duration: end - start,
            tokens: {},
            excludedSpans: []
        }
        return nid
    }
    getBreathGroups(timelineId: string): IBreathGroup[] {
        const t = this.data.timelines[timelineId]
        return Object.values(t.breathGroups).sort((a, b) => (a.start > b.start) ? 1 : -1)
    }
    getBreathGroup(timelineId: string, breathGroupId: string): IBreathGroup {
        return this.data.timelines[timelineId].breathGroups[breathGroupId]
    }
    //
    // Breathgroup
    //
    addAnnotation(  timelineId: string,
                    breathGroupId: string,
                    start: number,
                    end: number,
                    form: string,
                    gloss?: string,
                    confidence?: number): string {
        const b = this.data.timelines[timelineId].breathGroups[breathGroupId]
        if (!(start >= b.start && end <= b.end)) {
            throw new Error('Transcription region exceeds bounds of the breathgroup')
        }
        const glossary = this.data.glossary
        const glossaryEntryId = this._hash(form, gloss)
        const ge = this.getGlossaryEntry(glossaryEntryId)
        const tokenId = this._makeGuid()
        if (!ge) {
            const token: IToken = {
                glossaryEntryId,
                breathGroupId,
                start,
                end,
                confidence,
                duration: end - start
            }
            b.tokens[tokenId] = token
            ge.tokens[tokenId] = token
        } else {
            const geid = this.addGlossaryEntry({
                form,
                gloss,
                tokens: {}
            })
            const token: IToken = {
                glossaryEntryId: geid,
                breathGroupId,
                start,
                end,
                confidence,
                duration: end - start
            }
            glossary.entries[geid].tokens[tokenId] = token
            b.tokens[tokenId] = token
        }
        return tokenId
    }
    updateAnnotation(   timelineId: string,
                        breathGroupId: string,
                        tokenId: string,
                        start: number,
                        end: number,
                        form?: string,
                        gloss?: string,
                        confidence?: number
    ): string {
        const b = this.data.timelines[timelineId].breathGroups[breathGroupId]
        const annotation = this.getToken(timelineId, breathGroupId, tokenId)
        if (form != null || gloss != null) {
            delete b.tokens[tokenId]
            delete this.data.glossary.entries[annotation.glossaryEntryId]
            return this.addAnnotation(timelineId, breathGroupId, start, end, form, gloss, confidence)
        }
        // If the edit is simple to the spans of the annotation, we can do that in place
        // mat : because these are pointers this should just work
        if (start != null) {
            annotation.start = start
        }
        if (end != null) {
            annotation.end = end
        }
        return tokenId
    }
    addInterpretationToBreathgroup(timelineId: string, breathGroupId: string, start: number, end: number, context: string): void {
        const b = this.data.timelines[timelineId].breathGroups[breathGroupId]
        const t = this.data.timelines[timelineId]
        if (start >= b.start && end <= b.end) {
            t.interpretations.push({ timelineId, start, end, context })
        }
        else {
            throw new Error('Cannot add interperetation to span exceeding bounds of the breathgroup')
        }
    }
    excludeFromBreathgroup(timelineId: string, breathGroupId: string, start: number, end: number): void {
        const b = this.data.timelines[timelineId].breathGroups[breathGroupId]
        b.excludedSpans.push({ start, end })
    }
    getTokens(timelineId: string, breathGroupId: string): IToken[] {
        const bg = this.data.timelines[timelineId].breathGroups[breathGroupId]
        return Object.values(bg.tokens).sort((a, b) => (a.start > b.start) ? 1 : -1)
    }

    getToken(timelineId: string, breathGroupId: string, tokenId: string): IToken {
        return this.data.timelines[timelineId].breathGroups[breathGroupId].tokens[tokenId]
    }
    //
    // Glossary
    //
    addGlossaryEntry(ge: IGlossaryEntry): string {
        const nid = this._makeGuid()
        this.data.glossary.entries[nid] = ge
        return nid
    }
    getGlossaryEntry(id: string): IGlossaryEntry {
        return this.data.glossary.entries[id]
    }
    getSimilarGlossaryEntries(glossaryEntry: IGlossaryEntry, distance: number): Error {
        return new Error('Not Implemented')
    }
    clusterGlossaryEntries(glossaryEntry: IGlossaryEntry): Error {
        return new Error('not Implemented')
    }
}
