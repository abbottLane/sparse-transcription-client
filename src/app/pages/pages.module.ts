import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { AnnotateComponent } from './annotate/annotate.component';
import { ComponentsModule } from '../components/components.module';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NewProjectComponent } from './new-project/new-project.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { ProjectComponent } from './project/project.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Annotate2Component } from './annotate2/annotate2.component';
import { BoldPipe } from './annotate2/bold.pipe';
import { Annotate3Component } from './annotate3/annotate3.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SimpleAnnotateComponent } from './simpleannotate/simpleannotate.component';

@NgModule({
  declarations: [
      HomeComponent,
      AnnotateComponent,
      Annotate2Component,
      Annotate3Component,
      SimpleAnnotateComponent,
      NewProjectComponent,
      ProjectComponent,
      BoldPipe
    ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    ComponentsModule,
    MatDividerModule,
    MatCardModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  entryComponents: [NewProjectComponent]
})
export class PagesModule { }
