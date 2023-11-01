
export interface ILanguage {
    name: string
    glottocode?: string
    iso639_2?: string
}

export interface APIProject {
    name: string
    id: string
    owner: string
    date: number
    glossary_id: string,
    glossary_langs: ILanguage[],
    metadata?: {
        description?: string
        tags?: string[]
        where?: string
        languages?: string[]
    }
    project_body?: any
}

export interface IAlloK {
    start: number
    dur: number
    kvals: {
        c: string
        k: number
    }[]
}

export interface APIMediaEntry {
    id?: string
    mimetype: string
    name: string
    date: number
    project: string
    processed: boolean
    metadata: {
        description?: string
        samples: number
        sampleRate: number
        size: number
        channels: number
        duration: number
    }
    agents?: {
        regions?: {
            start: number
            end: number
            phones: string
            allok?: IAlloK[]
            wordspotting?: {token: string, alignment: {distance: number, start: number, stop: number}[]}[]
        }[]
        peaks?: number[]
    }
}

export interface APIGlossary {
    id: string
    entries: {[key: string]: any[]}
    language: ILanguage[]
    name: string
}

export interface IUser {
    displayName: string
    uid: string
    email: string
    photoURL: string
}