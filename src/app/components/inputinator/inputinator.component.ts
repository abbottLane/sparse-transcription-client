import { Component, OnInit, HostListener } from '@angular/core';
import getCaretCoordinates from 'textarea-caret'

@Component({
    selector: 'app-inputinator',
    templateUrl: './inputinator.component.html',
    styleUrls: ['./inputinator.component.scss']
})
export class InputinatorComponent implements OnInit {
    inputSegments: {type: string, text?: string, chips?: string[]}[] = [
        { type: 'text', text: 'some input here' },
        { type: 'chips', chips: ['one', 'two', 'three'] },
        { type: 'text', text: 'and more here' }
    ]
    whee = {
        top: "50px",
        left: "50px"
    }
    constructor() { }
    ngOnInit(): void {
    }
    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent): void {
        console.log(event);
        const foo = getCaretCoordinates(event.target)
        const bb = (event.target as HTMLInputElement).getBoundingClientRect()
        console.log('foo', bb, foo)
        this.whee = {
            left: (foo.left + bb.x).toString() + 'px',
            top: (foo.top + bb.y - 35).toString() + 'px'
        }
        console.log(this.whee)
    }
    modelChanged(i: number, evt) {
    }


}
