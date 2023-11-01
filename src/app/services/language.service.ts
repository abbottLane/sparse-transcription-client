import { Injectable } from "@angular/core";
//import glotto from '../../assets/glotto.json'

export interface GpsPoint {
    lat: number;
    lng: number;
}

export interface IGlottoLanguage {
    name: string
    iso?: string
    glottocode?: string
    pos?: [number, number]
}

interface Irawglotto {
    [key: string]: {
        name: string,
        iso: string
        pos: [number, number]
    }
}


@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    usedMaps: { langs: Map<string, string[]>, tags: Map<string, string[]> } = { langs: new Map(), tags: new Map() }
    position: GpsPoint = null
    posWatcher: number
    glotto: Irawglotto
    constructor() {
        this._positionSetup()
    }

    async _positionSetup(): Promise<void> {
        const posLat = localStorage.getItem('cachedLattitude')
        const posLng = localStorage.getItem('cachedLongitude')
        if (posLat) {
            this.position = {
                lat: parseFloat(posLat),
                lng: parseFloat(posLng)
            }
            //this._setNearbyLanguages()
        }
        if ("geolocation" in navigator) {
            this.posWatcher = navigator.geolocation.watchPosition((position) => {
                this.position = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
                localStorage.setItem('cachedLattitude', position.coords.latitude.toString())
                localStorage.setItem('cachedLongitude', position.coords.longitude.toString())
                this._setNearbyLanguages() // fire when we have an actual position from the browser
            })
        } else {
            console.warn('no geolocation')
        }
        const response = await fetch('/assets/glotto.json')
        const jsondata = await response.json()
        this.glotto = jsondata
        if (this.position) {
            this._setNearbyLanguages()
        }
    }

    // triggers on having obtained a new location
    _setNearbyLanguages(): void {
        this._addLanguageToUsedMap('stan1293') // always add english
        Object.keys(this.glotto).forEach((key) => {
            if (this.glotto[key].pos) {
                const dist = this.getDistance({ lat: this.glotto[key].pos[0], lng: this.glotto[key].pos[1] })
                if (dist < 100000) {
                    this._addLanguageToUsedMap(key)
                }
            }
        })
    }
    // UsedMaps.langs can have empty array entries. This means 'show the language, but it doesn't refer
    // to any session we have made'. This is non destructive, it only ever adds.
    _addLanguageToUsedMap(code: string, id: string = null): void {
        if (code !== 'unknown') {
            if (this.usedMaps.langs.has(code) && id) {
                // it's in the map and we have an id, so push it
                this.usedMaps.langs.get(code).push(id)
            } else if (!this.usedMaps.langs.has(code)) {
                // it's not in the map, so either add it with an id or an empty array if we have no id
                this.usedMaps.langs.set(code, id ? [id] : [])
            }
        }
    }
    getDistance(gp: GpsPoint): number {
        return this.haversineDistance(gp, this.position)
    }

    getUsedLanguages(): IGlottoLanguage[] {
        console.log('usedMaps.langs', this.usedMaps.langs)
        return Array.from(this.usedMaps.langs.keys()).map((x) => {
            return Object.assign({ glottocode: x }, this.glotto[x])
        })
    }
    searchLanguages(search: string, limit: number = 10): IGlottoLanguage[] {
        if (search === '') {
            return []
        }
        let count = 0
        let flangs: IGlottoLanguage[] = []
        let gc = Object.keys(this.glotto)
        // slightly more costly than an Object.keys().forEach() but we cannot break that search
        // so small substrings will be very costly.
        for (let x = 0; x < gc.length; ++x) {
            const gkey = gc[x]
            const gentry = this.glotto[gkey]
            let st = gentry.name.toLowerCase()
            if (gentry.iso) {
                st += ' ' + gentry.iso
            }
            if (st.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) !== -1) {
                flangs.push(Object.assign({ glottocode: gkey }, gentry))
                ++count
                if (count === limit) {
                    break
                }
            }
        }
        return flangs
    }

    haversineDistance(a: GpsPoint, b: GpsPoint): number {
        const toRad = (x) => x * Math.PI / 180.0
        const hav = (x) => Math.pow(Math.sin(x / 2), 2)
        const R = 6378137
        const aLat = toRad(a.lat)
        const bLat = toRad(b.lat)
        const aLng = toRad(a.lng)
        const bLng = toRad(b.lng)
        const ht = hav(bLat - aLat) + Math.cos(aLat) * Math.cos(bLat) * hav(bLng - aLng)
        return 2 * R * Math.asin(Math.sqrt(ht))
    }
}