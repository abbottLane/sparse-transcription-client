import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { IGlottoLanguage, LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-langselector-modal',
  templateUrl: './langselector.modal.html',
  styleUrls: ['./langselector.modal.scss'],
})
export class LangselectorModal {
  searchinput = ''
  langhits: IGlottoLanguage[] = []
  constructor(
    private data: LanguageService,
    public dialogRef: MatDialogRef<LangselectorModal>
  ) { }
  close() {
    
  }
  start() {
    return this.searchinput === ''
  }
  noHits() {
    return this.searchinput !== '' && this.langhits.length === 0
  }
  input(evt) {
    //this.searchinput = evt.target.value
    this.langhits = this.data.searchLanguages(evt, 12)
    console.log('hits', this.langhits)
  }
  selectLang(lang: IGlottoLanguage) {
    console.log('sending this from langselectore modal', lang)
    this.dialogRef.close(lang)
  }


}
