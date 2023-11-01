import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { APIMediaEntry } from 'src/app/interface';

@Component({
    selector: 'app-mediasnippet',
    templateUrl: './mediasnippet.component.html',
    styleUrls: ['./mediasnippet.component.scss']
})
export class MediasnippetComponent implements OnInit {
    @Input() media: APIMediaEntry
    @Output() actions: EventEmitter<{ id: string, action: string }> = new EventEmitter()
    constructor() { }

    ngOnInit(): void {
    }

    secondsToHms(d: number): string {
        const h = Math.floor(d / 3600)
        const m = Math.floor(d % 3600 / 60)
        const s = Math.floor(d % 3600 % 60)
        const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : ""
        const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : ""
        const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : ""
        return hDisplay + mDisplay + sDisplay
    }

    delete(mediaId: string): void {
        this.actions.emit({id: mediaId, action: 'delete'})
    }

}
