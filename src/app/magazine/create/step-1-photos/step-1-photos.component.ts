import * as _ from 'lodash';
import { Component, OnInit, Input, Output, EventEmitter, HostListener, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material';
import { NotificationsService } from 'angular2-notifications';
import { DragulaService } from 'ng2-dragula';
import { FilesService , AppStateService, CommonService } from '../../../shared/services';
import { Magazine } from '../../../shared/models';
import { ConfirmDialogComponent } from '../../../shared/components/dialogs/confirm-dialog/confirm-dialog.component';
import { PhotoEditorModalComponent } from './photo-editor-modal/photo-editor-modal.component';

@Component({
  selector: 'app-step-1-photos',
  templateUrl: './step-1-photos.component.html',
  styleUrls: ['./step-1-photos.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class Step1PhotosComponent implements OnInit {
  errors: Array<string> =[];
  dragAreaClass: string = 'dragarea';
  fileExt: string[] = ["JPG", "JPEG"];
  minPortraitFiles: number = 2;
  minFiles: number = 36;
  maxFiles: number = 100;
  maxSize: number = 5; // 5MB
  @Output() uploadStatus = new EventEmitter();

  totalPortraitCounts: number = 0;

  files = this.appStateService.getMagazine['files'] || [];
  newFiles: any[] = [];
  imageScaleUrl = this.filesService.imageScaleUrl;
  timestamp = new Date().getMilliseconds();
  selectedImage = 0;
  amountOfPhotosToUpload = 0;
  isUploading = false;
  rotation = 0;
  isDateAscending: boolean = false;
  isNameAscending: boolean = false;

  constructor(
    private filesService: FilesService,
    private _notifications: NotificationsService,
    private dragulaService: DragulaService,
    private matDialog: MatDialog,
    private appStateService: AppStateService,
    public commonService: CommonService
  ) {
    dragulaService.setOptions('draggable-photo-bag', {
      revertOnSpill: true,
      moves: function (el: any, container: any, handle: any): any {
        return handle.classList.contains('img-container');
      },
      // accepts: function (el: any, target: any, source: any, sibling: any): any {
      //   return !target.classList.contains('info-container');
      // },
      // invalid: function (el, handle) {
      //   console.log(11111, el, handle);
      //   return handle.classList.contains('info-container');
      // }
    });
    dragulaService.dropModel.subscribe((value) => {
      this.onDropModel(value.slice(1));
    });
    dragulaService.removeModel.subscribe((value) => {
      this.onRemoveModel(value.slice(1));
    });
  }

  private onDropModel(args) {
    let [el, target, source] = args;
    console.log(11111, this.files);
    // do something else
  }

  private onRemoveModel(args) {
    let [el, source] = args;
    // console.log(22222, el, source);
    // do something else
  }

  ngOnInit() {
    this.filesService.getFolder()
      .subscribe(
        success => {
          this.refreshPhotoList();
        },
        error => {
          console.log(error);
      })
  }

  refreshPhotoList(files = []) {
    this.filesService.getFolderPhotos()
      .subscribe((data) => {
        if (parseInt(data.errNum) == 100) {
          this.files = [];
          this.appStateService.setMagazine('files', this.files);
          this.filesService.files = this.files;
          return;
        }

        if (parseInt(data.errNum) != 200) {
          return;
        }

        const newFiles = [];
        data.images.forEach((image, idx) => {
          const file = image;
          const currentFile = this.filesService.getFileById(file.imgID);
          const newFile = {
            url: file.imgUrl,
            name: file.imgName,
            orientation: +file.imgWidth > +file.imgHeight ? 0 : 1,
            isCover: (file.isCover == true) ? true : false,
            id: file.imgID,
            height: +file.imgHeight,
            width: +file.imgWidth,
            text: file.text,
            weight: idx,
            isNotUploaded: false
          };

          if (newFile.orientation === 1) {
            this.totalPortraitCounts++;
          }

          if (currentFile) {
            // These properties can be updated by the server, so remove these.
            delete currentFile.width;
            delete currentFile.height;
            delete currentFile.orientation;

            _.merge(newFile, currentFile);
            newFiles.push(newFile);
          } else {
            newFiles.push(newFile);
          }
        })

        // Sort by weight
        this.isDateAscending = false;
        this.dateSort(newFiles);
        // newFiles.sort((a, b) => {
        //   var keyA = parseInt(a.weight),
        //       keyB = parseInt(b.weight);

        //   if(keyA < keyB) return -1;
        //   if(keyA > keyB) return 1;
        //   return 0;
        // });

        newFiles.forEach((newFile, idx) => {
          newFile.weight = idx;
        })

        this.files = newFiles;
        this.appStateService.setMagazine('files', this.files);
        this.filesService.files = this.files;
      },(err) => {
        console.log('Error listing folder contents', err);
      })
  }

  setMainImage(selectedIndex) {
    this.selectedImage = selectedIndex;
  }

  uploadNextFile() {
    if (this.newFiles.length > 0) {
      this.isUploading = true;
      const file = this.newFiles.shift();
      this.filesService.uploadFile(file)
        .subscribe(
          success => {
            this.uploadNextFile();
          },
          error => {
            this.uploadNextFile(); // Just skip the file
        });
    } else {
      this.isUploading = false;
      this.refreshPhotoList();
    }
  }

  saveNewFiles(files){
    this.errors = []; // Clear error
    // Validate file size and allowed extensions
    if (files.length > 0 && (!this.isValidFileExtension(files))) {
        this.uploadStatus.emit(false);
        return;
    }

    if (files.length > 0) {
      this.newFiles = _.values(files);
      // this.saveNewFilesFromLocal();
      this.uploadNextFile();
    }
  }

  saveNewFilesFromLocal() {
    this.errors = []; // Clear error
    this.newFiles.forEach((file, idx) => {
      const myReader: FileReader = new FileReader();

      myReader.onloadend = (e) => {
        const base64Data = myReader.result;

        var newFile = {
          url: base64Data,
          isNotUploaded: true,
          name: '',
          orientation: 0,
          isCover: false,
          id: '',
          height: 0,
          width: 0,
          text: '',
          weight: '',
        };

        this.files.push(newFile);
        if (idx === this.newFiles.length - 1) {
          this.appStateService.setMagazine('files', this.files);
          this.filesService.files = this.files;      
        }
      };

      myReader.readAsDataURL(file);
    })
  }

  openPhotoEditor(file) {
    const dialogRef = this.matDialog.open(PhotoEditorModalComponent, {
      // width: '570px',
      panelClass: 'photo-editor-dialog',
      data : {
        currentFile: file,
        files: this.files
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {

      }
    });
  }

  deleteFile(file) {
    const dialogRef = this.matDialog.open(ConfirmDialogComponent, {
      width: '570px',
      panelClass: 'confirm-dialog',
      data : {
        confirmMessage: 'Are you sure to delete this photo?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.filesService.deleteFile(file)
        .subscribe((data) => {
          if (file.isCover === true) {
            // deleteStepsStorage deletes the selected-cover
            // and we want to do this only if the user deletes their cover,
            // so that they are forced to go to step 2 again which shows them
            // a new cover.
            // storageService.deleteStepsStorage().then(function(state) {
              this.refreshPhotoList();
            // });
          } else {
            this.refreshPhotoList();
          }
        }, (error) => {
          console.log('Error removing photo', error);
        });
      }
    });
  }

  deleteAll() {
    const dialogRef = this.matDialog.open(ConfirmDialogComponent, {
      width: '570px',
      panelClass: 'confirm-dialog',
      data : {
        confirmMessage: 'Are you sure to delete all photos?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.filesService.deleteAllCloudPhotos()
        .subscribe((data) => {
          // storageService.deleteStepsStorage().then(function(state) {
          this.refreshPhotoList();        
        }, (error) => {
          this.refreshPhotoList();        
        });
      }
    });
  }

  dateSort(files, isToggle: boolean = false) {
    if (isToggle === true) {
      this.isDateAscending = !this.isDateAscending;
    }
    files.sort((a, b) => {
      const valueA = parseInt(a.weight);
      const valueB = parseInt(b.weight);

      return this.isDateAscending ? valueA > valueB ? -1 : valueA === valueB ? 0 : 1
      : valueA > valueB ? 1 : valueA === valueB ? 0 : -1;
    });
  }

  nameSort(files, isToggle: boolean = false) {
    if (isToggle === true) {
      this.isNameAscending = !this.isNameAscending;
    }
    files.sort((a, b) => {
      const valueA = a.name;
      const valueB = b.name;

      return this.isNameAscending ? valueA > valueB ? -1 : valueA === valueB ? 0 : 1
      : valueA > valueB ? 1 : valueA === valueB ? 0 : -1;
    });
  }

  photoUrl(file) {
    return file.isNotUploaded ? file.url : this.imageScaleUrl + '?width=300&height=300&image=' + file.url + '&t=' + this.timestamp;
  }

  isTooSmall(file) {
    if (!file) return;

    const min = 800;
    if (file.width < min || file.height < min) {
      return true;
    }

    return false;
  }

  isWrongRatio(file) {
    if (!file) return;

    const fourThree = 4 / 3;
    const threeFour = 3 / 4;
    const standardRatio = file.orientation === 0 ? fourThree : threeFour;
    const tolerance = 0.01;
    const ratio = file.width / file.height;
    if (Math.abs(ratio - standardRatio) > tolerance) {
      return true;
    }

    return false;
  }

  get warningFilesMessage() {
    const warningFiles = this.files.filter((file) => {
      return this.isTooSmall(file) || this.isWrongRatio(file);
    })

    const count = warningFiles.length;
    return count > 1
            ? this.commonService.translateTemplate('STEP_1_MESSAGE_WARNING_FILES', {n: count})
            : this.commonService.translateTemplate('STEP_1_MESSAGE_ONE_WARNING_FILE', {});
  }

  get uploadedFilesMessage() {
    const count = this.files.length;
    return count > 1
            ? this.commonService.translateTemplate('STEP_1_MESSAGE_UPLOADED_FILES', {n: count})
            : this.commonService.translateTemplate('STEP_1_MESSAGE_ONE_UPLOADED_FILES', {});
  }

  get minMaxWarningMessage() {
    const uploadedCount = this.files.length;
    const min = this.minFiles;
    const max = this.maxFiles;
    if (uploadedCount < min) {
      return this.commonService.translateTemplate('STEP_1_MESSAGE_MIN_FILES', {missingCount: min - uploadedCount});
    } else if (uploadedCount > max) {
      return this.commonService.translateTemplate('STEP_1_MESSAGE_MAX_FILES', {overCount: uploadedCount - max});
    }
  }

  private isValidFiles(files){
    // Check Number of files
      if (files.length > this.maxFiles) {
          this.errors.push("Error: At a time you can upload only " + this.maxFiles + " files");
          return;
      }
      this.isValidFileExtension(files);
      return this.errors.length === 0;
  }

  private isValidFileExtension(files){
      // Make array of file extensions
        var extensions = (this.fileExt)
                        .map(function (x) { return x.toLocaleUpperCase().trim() });

        for (var i = 0; i < files.length; i++) {
            // Get file extension
            var ext = files[i].name.toUpperCase().split('.').pop() || files[i].name;
            // Check the extension exists
            var exists = extensions.includes(ext);
            if (!exists) {
                this._notifications.error(`Error (Extension): ${ext}`, null, {
                  clickToClose: true,
                  timeOut: 2000
                });

                return false;
            }
            // Check file size
            // this.isValidFileSize(files[i]);
        }

        return true;
  }

  private isValidFileSize(file) {
        var fileSizeinMB = file.size / (1024 * 1000);
        var size = Math.round(fileSizeinMB * 100) / 100; // convert upto 2 decimal place
        if (size > this.maxSize)
            this.errors.push("Error (File Size): " + file.name + ": exceed file size limit of " + this.maxSize + "MB ( " + size + "MB )");
  }

  onFileChange(event){
    let files = event.target.files; 
    this.saveNewFiles(files);
  }

  @HostListener('dragover', ['$event']) onDragOver(event) {
      this.dragAreaClass = "droparea";
      event.preventDefault();
  }

  @HostListener('dragenter', ['$event']) onDragEnter(event) {
      this.dragAreaClass = "droparea";
      event.preventDefault();
  }

  @HostListener('dragend', ['$event']) onDragEnd(event) {
      this.dragAreaClass = "dragarea";
      event.preventDefault();
  }

  @HostListener('dragleave', ['$event']) onDragLeave(event) {
      this.dragAreaClass = "dragarea";
      event.preventDefault();
  }
  @HostListener('drop', ['$event']) onDrop(event) {   
      this.dragAreaClass = "dragarea";           
      event.preventDefault();
      event.stopPropagation();
      var files = event.dataTransfer.files;
      this.saveNewFiles(files);
  }
}
