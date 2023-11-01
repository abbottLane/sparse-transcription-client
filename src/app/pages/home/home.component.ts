import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BackendService } from 'src/app/services/backend.service';
import { APIProject, ILanguage } from 'src/app/interface';
import { NewProjectComponent } from '../new-project/new-project.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    projects: APIProject[] = []
    username: string
    constructor(public dialog: MatDialog, private backend: BackendService, private router: Router, private auth: AuthService) { }
    async ngOnInit(): Promise<void> {
        this.username = this.auth.getUser().displayName.split(' ')[0]
        await this.refreshProjects()
    }

    async openNewProject(): Promise<void> {
        const dialogRef = this.dialog.open(NewProjectComponent, {
            minHeight: '350px',
            minWidth: '450px',
          })
        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`);
            this.refreshProjects()
        })
    }

    async refreshProjects(): Promise<void> {
        this.projects = await this.backend.getProjects()
        console.log('home got ', this.projects)
    }

    openProject(p: APIProject): void {
        this.router.navigate(['/project', p.id])
    }

    getDateString(epoch: number): string {
        const d = new Date(epoch)
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
    }

    langToString(lang: ILanguage): string {
        const ls = lang.name
        if (lang.glottocode) {
            return ls + ' (' + lang.glottocode + ')'
        } else if (lang.iso639_2) {
            return ls + ' (' + lang.iso639_2 + ')'
        } else {
            return ls
        }
    }

}
