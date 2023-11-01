import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AudioService } from 'src/app/services/audio.service';
import { BackendService } from 'src/app/services/backend.service';
import { Router } from '@angular/router';
import { APIProject } from 'src/app/interface';

@Component({
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss']
})
export class ProjectComponent implements OnInit, OnDestroy {
    sub: Subscription
    project: APIProject
    loading = true
    dstring = ''
    mediaList: any[] = []
    //$media: WebSocketSubject<APIMediaEntry[]>
    wssub: Subscription
    @ViewChild('fileinput', { static: true }) inputElement: ElementRef;
    constructor(
        private route: ActivatedRoute,
        private backend: BackendService,
        private audio: AudioService,
        private dialog: MatDialog,
        private router: Router) { }
    ngOnInit(): void {
        this.sub = this.route.params.subscribe(params => {
            this.loadProject(params.id)
        })
    }
    async loadProject(id: string): Promise<void> {
        console.log('project id', id)
        this.project = await this.backend.getProject(id)
        this.wssub = this.backend.observeProject(id).subscribe((x) => {
            this.mediaList = x
            console.log('web socket got ', x)
        })
        const d = new Date(this.project.date)
        this.dstring = d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
        //await this.refreshMedia()
        this.loading = false
    }
    ngOnDestroy(): void {
        this.sub.unsubscribe()
    }
    // async refreshMedia(): Promise<void> {
    //     this.mediaList = await this.backend.getProjectMedia(this.project.id)
    // }

    addMedia(): void {
        this.inputElement.nativeElement.click()
    }
    async handleFiles(f: any): Promise<void> {
        f.preventDefault()
        const numfiles = f.target.files.length
        if (numfiles === 0) {
            return
        }
        const metadata = await this.audio.getAudioMetadata(f.target.files[0])
        const src = {
            filename: f.target.files[0].name,
            lastModifiedDate: f.target.files[0].lastModifiedDate
        }
        await this.backend.uploadMedia(this.project.id, f.target.files[0], metadata)
        //await this.refreshMedia()
    }

    async mediaAction(evt: {id: string, action: string}): Promise<void> {
        if (evt.action === 'annotate') {
            this.router.navigate(['sannotate', this.project.id, evt.id])
        } else if (evt.action === 'delete') {
            await this.backend.deleteMedia(evt.id)
        }
    }



    close(): void {
        this.router.navigate(['/home'])
    }

}
