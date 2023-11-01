import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

interface IToken {
  glossary_entry_id: string,
  token_id: string,
  form: string
}

@Component({
  selector: 'app-token',
  templateUrl: './token.component.html',
  styleUrls: ['./token.component.scss']
})
export class TokenComponent implements OnChanges {
  @Input() tokens: IToken[]
  @Output() clicks: EventEmitter<{pos: number, action: string}> = new EventEmitter()
  tokensel: number = null
  selwhat: string = ''
  insertpos: number = null
  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if ('tokens' in changes) {
      this.tokensel = null
      this.selwhat = ''
    }
  }

  remove(num: number) {
    this.clicks.emit({
      action: 'del',
      pos: num
    })
    this.tokensel = null
    this.selwhat = ''
  }
  edit(num: number) {

  }

  leftArrow() {
    if (this.selwhat === '') {
      if (this.tokens.length === 0) {
        return
      } else if (this.tokensel === null) {
        this.tokensel = this.tokens.length - 1
      } else if (this.tokensel === 0) {
        this.tokensel = this.tokens.length - 1
      } else {
        --this.tokensel
      }
      console.log('tokensel', this.tokensel)
    } else if (this.selwhat === 'edit') {
      this.selwhat = 'prev'
    } else if (this.selwhat === 'next') {
      this.selwhat = 'edit'
    }
  }
  rightArrow() {
    if (this.selwhat === '') {
      if (this.tokens.length === 0) {
        return
      } else if (this.tokensel === null) {
        this.tokensel = 0
      } else if (this.tokensel === this.tokens.length - 1) {
        this.tokensel = 0
      } else {
        ++this.tokensel
      }
    } else if (this.selwhat === 'edit') {
      this.selwhat = 'next'
    } else if (this.selwhat === 'prev') {
      this.selwhat = 'edit'
    }
    console.log('rightarrow', this.tokensel, this.selwhat)

  }
  upArrow() {
    if (this.selwhat === 'del') {
      this.selwhat = 'edit'
    } else if (this.selwhat === 'edit' || this.selwhat === 'prev' || this.selwhat === 'next') {
      this.selwhat = ''
    } else if (this.selwhat === '') {
      this.tokensel = null
    }
    console.log('uparrow', this.tokensel, this.selwhat)

  }
  downArrow() {
    if (this.selwhat === '') {
      this.selwhat = 'edit'
    } else if (this.selwhat === 'edit') {
      this.selwhat = 'del'
    }
    console.log('downarrow', this.tokensel, this.selwhat)
  }
  isSelected(): boolean {
    return this.tokensel !== null
  }
  enter() {
    if (this.isSelected()) {
      if (this.selwhat === 'del' || this.selwhat === 'edit') {
        this.clicks.emit({
          pos: this.tokensel,
          action: this.selwhat
        })
      } else if (this.selwhat === 'next') {
        this.setInsert(this.tokensel + 1)
      } else if (this.selwhat === 'prev') {
        this.setInsert(this.tokensel)
      }
      this.selwhat = ''
      this.tokensel = null
    }
  }
  getinsertpos(): number {
    return this.insertpos
  }
  setInsert(num: number) {
    if (num === this.tokens.length) {
      this.insertpos = null
    } else {
      this.insertpos = num
    }
    this.clicks.emit({
      action: 'insert',
      pos: this.insertpos
    })
  }
  reset() {
    this.tokensel = null
    this.selwhat = ''
  }

}
