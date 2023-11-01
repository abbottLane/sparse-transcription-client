import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { IAudioMetadata } from './audio.service';
import { ILanguage, APIProject, APIMediaEntry, IUser } from 'src/app/interface';
//import { environment } from '../../environments/environment';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import firebase from 'firebase/app';

interface IResponse {
    code: number
    message: string
    data: any
}

@Injectable({
    providedIn: 'root'
})
export class BackendService {
    host = location.hostname !== 'localhost' ? '/api/' : 'http://localhost:8000/'
    constructor(private http: HttpClient) { }

    async getRequest(ep: string): Promise<any> {
        return new Promise((resolve, reject) => {
            //console.log('get request to', this.host + ep)
            this.http.get<IResponse>(this.host + ep, { responseType: 'json' })
                .pipe(
                    retry(2),
                )
                .subscribe((result) => {
                    //console.log('get got', result)
                    if (result.code !== 200) {
                        reject(result.message)
                    } else {
                        resolve(result.data)
                    }
                })
        })
    }
    async postRequest(ep: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.post<IResponse>(this.host + ep, data, { responseType: 'json' })
                .pipe(
                    retry(2),
                )
                .subscribe((result) => {
                    if (result.code !== 200) {
                        reject(result.message)
                    } else {
                        resolve(result.data)
                    }
                })
        })
    }

    async delRequest(ep: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.delete<IResponse>(this.host + ep, { responseType: 'json' })
                .pipe(
                    retry(2),
                )
                .subscribe((result) => {
                    if (result.code !== 200) {
                        reject(result.message)
                    } else {
                        resolve(result.data)
                    }
                })
        })
    }

    async getProjects(): Promise<APIProject[]> {
        return this.getRequest('projects/')
    }

    async getGlossaries(): Promise<any[]> {
        return this.getRequest('glossary/')
    }

    async createGlossary(gname: string, lang: ILanguage[]): Promise<string> {
        return this.postRequest('glossary/', { name: gname, language: lang })
    }


    async createProject(name: string, glossaryid: string, langs: ILanguage[], tags: string[]): Promise<string> {
        const d = {
            name,
            owner: '2',
            date: (new Date()).getTime(),
            glossary_id: glossaryid,
            glossary_langs: langs,
            metadata: {
                tags
            }
        }
        return this.postRequest('projects', d)
    }

    async getProject(id: string): Promise<APIProject> {
        return this.getRequest('projects/' + id)
    }

    async uploadMedia(pid: string, fh: File, md: IAudioMetadata): Promise<void> {
        const mentry: APIMediaEntry = {
            mimetype: fh.type,
            name: fh.name,
            date: fh.lastModified,
            project: pid,
            processed: false,
            metadata: {
                size: fh.size,
                sampleRate: md.sampleRate,
                channels: md.channels,
                samples: md.samples,
                duration: md.duration
            }
        }
        const mediaId = await this.postRequest('media', mentry)
        console.log('mediaid', mediaId)
        console.log('file', fh)
        const formData = new FormData()
        formData.append('media', fh)
        try {
            const result = await this.http.post<IResponse>(this.host + 'media/upload/' + mediaId, formData)
            .pipe(retry(3)).toPromise()
            if (result.code !== 200) {
                // delete the media entry
                await this.delRequest('media/upload/' + mediaId)
                throw new Error(result.message)
            } else {
                console.log('success:', result.message)
            }
        } catch {
            console.error('well that was a fuck up')

        }
    }

    getProjectMedia(projectId: string): Promise<APIMediaEntry[]> {
        return this.getRequest('media/project/' + projectId)
    }

    getMediaById(mediaId: string): Promise<APIMediaEntry[]> {
        return this.getRequest('media/' + mediaId)
    }

    getGlossaryById(glossaryId: string): Promise<any> {
        return this.getRequest('glossary/' + glossaryId)
    }

    getMediaURL(mediaentry: APIMediaEntry): string {
        const fh = location.hostname === 'localhost' ? 'http://localhost:8000/media/files/' : '/media/'
        //return fh + mediaentry.id + '.' + mediaentry.mimetype.split('/')[1]
        return fh + mediaentry.id + '.wav'
    }

    getMediaSegmentationById(mediaId: string): Promise<{vad: {start: number, end: number}[]}> {
        return this.getRequest('segmentation/' + mediaId)
    }

    observeProject(projectId: string): WebSocketSubject<APIMediaEntry[]> {
        const f = location.hostname === 'localhost' ? 'ws://localhost:8000/media/project/ws/' : 'wss://' + window.location.hostname + '/api/media/project/ws/'
        const fh = f + projectId
        const subject: WebSocketSubject<APIMediaEntry[]> = webSocket(fh)
        return subject
    }

    async deleteMedia(mediaId: string): Promise<void> {
        await this.delRequest('media/delete/' + mediaId)
    }

    // alignPhones(tokens: string[], phones: string): Promise<APIAlignPhone[]> {
    //     return this.postRequest('alignPhones/', {tokens, phones})
    // }

    async loginUser(user: IUser): Promise<void> {
        await this.postRequest('users/login', user)
    }
}
