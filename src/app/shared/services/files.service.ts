import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { HttpHeaders, HttpParams } from '@angular/common/http';

import { HttpService } from './http.service';
import { AppStateService } from './app-state.service';
import { environment } from '../../../environments/environment';
import { API } from '../consts';

@Injectable()
export class FilesService {
  files = this.appStateService.magazine || [];
  user = this.appStateService.userInfo || {};
  folder_id = -1;
  cloudfolder = '';
  user_id = -1;
  imageScaleUrl = API.url.imageScaleUrl;

  // getFolder = getFolder;
  // getFolderPhotos = getFolderPhotos;
  // uploadFile = uploadFile;
  // deleteFile = deleteFile;
  // deleteAllCloudPhotos = deleteAllCloudPhotos;
  // getFileById = getFileById;
  // getFirstPortrait = getFirstPortrait;
  // updateRotation = updateRotation;

  // vm.uploadPDF = uploadPDF;

  constructor(
    private httpService: HttpService,
    private appStateService: AppStateService
  ) {}

  public getFolder() {
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams()
      .set('use_guid', this.user.use_guid);

    return this.httpService.post(API.url.getCloudFolder, body, { headers })
      .map((res) => {
        this.folder_id = res.folder_id;
        this.cloudfolder = res.cloudfolder;
        this.user_id = res.user_id;
        return res;
      });
  }

  public getFolderPhotos() {
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/x-www-form-urlencoded');
    const body = new HttpParams()
      .set('use_guid', this.user.use_guid)
      .set('folder_id', this.folder_id.toString());

    return this.httpService.post(API.url.getCloudPhotos, body, { headers })
      .map((res) => {
        return res;
      });
  }

  public uploadFile(file) {
    console.log(123123123, file);
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', undefined);
    let formData: FormData = new FormData();
    formData.append('folder_id', this.folder_id.toString());
    formData.append('user_id', this.user_id.toString());
    formData.append('cloudfolder', this.cloudfolder);
    formData.append('upl_filename', file.name);
    formData.append('upl_attachment', file);

    return this.httpService.post(API.url.uploadCloud, formData)
      .map((res) => {
        return res;
      });
  }
}