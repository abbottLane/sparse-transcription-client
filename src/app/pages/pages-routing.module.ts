import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnnotateComponent } from './annotate/annotate.component';
import { Annotate2Component } from './annotate2/annotate2.component';
import { Annotate3Component } from './annotate3/annotate3.component';
import { SimpleAnnotateComponent } from './simpleannotate/simpleannotate.component';
import { HomeComponent } from './home/home.component';
import { ProjectComponent } from './project/project.component';

const routes: Routes = [
    {
        path: 'project/:id',
        component: ProjectComponent },
    {
        path: 'annotate/:id',
        component: AnnotateComponent
    },
    {
        path: 'annotate2/:pid/:mid',
        component: Annotate2Component
    },
    {
        path: 'annotate3/:pid/:mid',
        component: Annotate3Component
    },
    {
        path: 'sannotate/:pid/:mid',
        component: SimpleAnnotateComponent
    },
    {
        path: 'home',
        component: HomeComponent
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PagesRoutingModule { }
