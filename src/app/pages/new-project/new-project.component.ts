import { Component, OnInit } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { BackendService } from 'src/app/services/backend.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { APIGlossary, ILanguage } from 'src/app/interface';

@Component({
    templateUrl: './new-project.component.html',
    styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnInit {
    visible = true;
    selectable = true;
    removable = true;
    addOnBlur = true;
    readonly separatorKeysCodes: number[] = [ENTER, COMMA];
    chips: string[] = []
    glossaries: APIGlossary[] = []
    loading = true
    nameField = new FormControl('', Validators.required)
    glossaryField = new FormControl('', Validators.required)
    glossaryName = new FormControl('', Validators.required)
    poo = new FormGroup({
        nameField: this.nameField,
        glossaryField: this.glossaryField
    })
    lang: ILanguage = null
    tags: any[] = []
    constructor(private backend: BackendService, private matRef: MatDialogRef<NewProjectComponent>) {
        console.log(this.glossaryField)
    }

    async ngOnInit(): Promise<void> {
        this.glossaries = await this.backend.getGlossaries()
        this.loading = false
    }
    add(event: MatChipInputEvent): void {
        const input = event.input;
        const value = event.value;
        // Add our fruit
        if ((value || '').trim()) {
            this.chips.push(value.trim());
        }
        // Reset the input value
        if (input) {
            input.value = '';
        }
        console.log('chips', this.chips)
    }
    remove(fruit: string): void {
        const index = this.chips.indexOf(fruit)
        if (index >= 0) {
            this.chips.splice(index, 1)
        }
    }
    selectLang(evt): void {
        if (evt) {
            this.lang = {
                glottocode: evt.glottocode,
                iso639_2: evt.iso,
                name: evt.name
            }
        }
    }

    async createProject(): Promise<void> {
        if (this.glossaryField.value === 'new') {
            const glossaryId = await this.backend.createGlossary(this.glossaryName.value, [this.lang])
            await this.backend.createProject(this.nameField.value, glossaryId, [this.lang], this.chips)
        } else {
            await this.backend.createProject(this.nameField.value, this.glossaryField.value, [this.lang], this.chips)
        }
        this.matRef.close()
    }

}
