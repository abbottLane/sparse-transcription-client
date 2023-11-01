//import { STProject, Timeline, STMedia, Glossary, BreathGroup } from 'sparsanmodel/lib/data_model'
import { SparseProject } from '../../services/sparsemodel'

export class AnnotateService {
    //project: STProject
    timelineId: string
    breathgroupId: string
    constructor() {}
    startblank(): void {
        //this.project = new STProject(new Glossary())
    }
    addTimeline(durSec: number): void {
        // const newmedia = new STMedia(
        //     '1',
        //     '/assets/stuart_norne.wav', {
        //         durSec,
        //         mimetype: 'audio/wav',
        //         samples: Math.round(48000 * durSec),
        //         sampleRate: 48000,
        //         channels: 1
        //     })
       // this.timelineId = this.project.create_timeline([newmedia])
        //const tl = this.project.get_timeline(this.timelineId)
        //this.breathgroupId = tl.add_breath_group(0, durSec)
    }

    addAnnotation(startSec: number, endSec: number, text: string): string {
        //const bg = this.project.get_timeline(this.timelineId).get_breath_group(this.breathgroupId)
        //return bg.make_annotation(startSec, endSec, text)
        return ''
    }

    editAnnotation(id: string, start: number, end: number, text: string): void {
        //const bg = this.project.get_timeline(this.timelineId).get_breath_group(this.breathgroupId)
        //bg.change_annotation(id, start, end, text)
    }

}