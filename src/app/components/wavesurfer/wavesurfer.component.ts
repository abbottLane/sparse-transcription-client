import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.js'

@Component({
    selector: 'app-wavesurfer',
    template: `
        <div #timeline [style.height]="ticksheight.toString()+'px'"></div>
        <div #waveform class="waveform" [style.height]="wavheight.toString()+'px'"></div>
        <div *ngIf="minimap" #minimap class="minimap" [style.height]="minimapheight.toString()+'px'"></div>`,
    styleUrls: ['./wavesurfer.component.scss']
})
export class WavesurferComponent implements OnInit, AfterViewInit {
    @ViewChild('waveform') wavRef?: ElementRef
    @ViewChild('timeline') tlRef?: ElementRef
    @ViewChild('minimap') mmRef?: ElementRef
    wavesurfer: WaveSurfer
    @Input() wavheight = 128
    @Input() minimapheight = 50
    @Input() ticksheight = 20
    @Input() minimap = false
    x: false
    constructor() { }
    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        if (this.wavRef && this.tlRef) {
            const plugs = [
                TimelinePlugin.create({
                    container: this.tlRef.nativeElement,
                    primaryFontColor: 'black',
                    secondaryFontColor: 'black'
                }),
                RegionsPlugin.create({})]
            if (this.minimap) {
                plugs.push(MinimapPlugin.create({
                    container: this.mmRef.nativeElement,
                    height: this.minimapheight
                }))
            }
            this.wavesurfer = WaveSurfer.create({
                container: this.wavRef.nativeElement,
                backend: 'MediaElement',
                fillParent: true,
                scrollParent: true,
                hideScrollbar: true,
                normalize: true,
                minPxPerSec: 100,
                interact: false,
                height: this.wavheight,
                progressColor: '#777',
                waveColor: '#673ab7',
                cursorColor: '#7b1fa2',
                plugins: plugs
            })
        } else {
            console.log('The elements don\'t exist')
        }

    }

}
