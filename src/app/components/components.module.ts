import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WavesurferComponent } from './wavesurfer/wavesurfer.component';
import { LangselectorComponent } from './langselector/langselector.component';
import { LangselectorModal } from './langselector/langselector.modal';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { HighlightSearch } from './langselector/highlight.pipe';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { HinterComponent } from './hinter/hinter.component';
import { VadmapComponent } from './vadmap/vadmap.component';
import { MediasnippetComponent } from './mediasnippet/mediasnippet.component';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { InputinatorComponent } from './inputinator/inputinator.component';
import { AutoSizeInputModule } from 'ngx-autosize-input';
import { AllodisplayComponent } from './allodisplay/allodisplay.component';
import { TokenComponent } from './token/token.component';
import { SimplephonesComponent } from './simplephones/simplephones.component';

@NgModule({
  declarations: [
    WavesurferComponent,
    LangselectorComponent,
    LangselectorModal,
    HighlightSearch,
    HinterComponent,
    VadmapComponent,
    MediasnippetComponent,
    InputinatorComponent,
    AllodisplayComponent,
    TokenComponent,
    SimplephonesComponent
],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatInputModule,
    MatChipsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    AutoSizeInputModule
  ],
  exports: [
    WavesurferComponent,
    LangselectorComponent,
    HinterComponent,
    VadmapComponent,
    MediasnippetComponent,
    InputinatorComponent,
    AllodisplayComponent,
    HighlightSearch,
    TokenComponent,
    SimplephonesComponent
]
})
export class ComponentsModule { }
