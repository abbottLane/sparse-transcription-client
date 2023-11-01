import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { LangselectorModal } from './langselector.modal';
import { LanguageService, IGlottoLanguage } from 'src/app/services/language.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
    selector: 'app-langselector',
    templateUrl: './langselector.component.html',
    styleUrls: ['./langselector.component.scss']
})
export class LangselectorComponent implements OnInit {
    @Input() selected: { iso: string, name: string } = null
    @Output() selectLanguage: EventEmitter<IGlottoLanguage> = new EventEmitter()
    languages: IGlottoLanguage[] = []
    selectedlanguage: IGlottoLanguage = null
    show = false
    modalAddedLang: IGlottoLanguage = null
    inputvalue = ''
    constructor(
        private data: LanguageService,
        public dialog: MatDialog) { }

    ngOnInit(): void {
        this.languages = [
            ...this.data.getUsedLanguages(),
            {
                glottocode: 'add',
                name: '+'
            }
        ]
        this.show = true
        console.log('default languages = ', this.languages)
    }

    selectLang(l: IGlottoLanguage): void {
        if (l.glottocode === 'add') {
            this.addNew()
            return
        }
        if (this.selectedlanguage && (this.selectedlanguage.glottocode === l.glottocode)) {
            this.selectedlanguage = null
            // in this specific case we have removed a language we added from the modal.
            // In which case, remove it from the list, and put the add button back
            if (this.modalAddedLang && l.glottocode === this.modalAddedLang.glottocode) {
                this.languages.pop() // remove the 
                this.languages.push({
                    glottocode: 'add',
                    name: '+'
                })
                this.modalAddedLang = null
            }
        } else {
            this.selectedlanguage = l
        }
        this.selectLanguage.emit(this.selectedlanguage)
    }

    async addNew(): Promise<void> {
        const dialogRef = this.dialog.open(LangselectorModal)
        dialogRef.afterClosed().subscribe(res => {
            console.log(`Dialog result: ${res}`)
            if (!res) { return }
            this.modalAddedLang = res
            this.languages.pop()
            // only add it if it isn't in the list already
            if (this.languages.findIndex(x => x.glottocode === res.glottocode) === -1) {
                this.languages.push(res)
            }
            this.selectLang(res)
        })
    }

}
