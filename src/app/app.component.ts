import { Component } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    openned: false
    isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
        .pipe(
            map(result => result.matches),
            shareReplay()
        );
    title = 'spannotate';
    loggedIn = false
    user: any
    constructor(
        private breakpointObserver: BreakpointObserver,
        public auth: AuthService,
        private matIconRegistry: MatIconRegistry,
        private domSanitizer: DomSanitizer) { 
            this.matIconRegistry.addSvgIcon(
                "slave",
                this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/noun_slave_2085902.svg")
              );
        }
    loginuser(): void {
        this.auth.login()
    }
}
