import { Optional } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonRouterOutlet, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Dialog } from '@capacitor/dialog';
import { NativeSettings, IOSSettings } from 'capacitor-native-settings';

import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged } from 'rxjs';
import { NetworkService, ToastService } from '@services';
import { Location } from '@angular/common';

export class BaseComponent {
  tap = 0;

  constructor(
    protected router: Router,
    protected platform: Platform,
    protected toastService: ToastService,
    protected alertCtrl: AlertController,
    protected networkService: NetworkService,
    protected location: Location,
    @Optional() protected routerOutlet?: IonRouterOutlet,
  ) {
    this.platform.ready().then(async () => {
      if (this.platform.is('hybrid')) {
        this.listenToNetworkStatus();
        this.exitAppOnDoubleTap();
      }
      this.logDeviceInfo();
    });

    if (this.platform.is('capacitor')) {
      StatusBar.setOverlaysWebView({ overlay: true });

      const mediaDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
      this.setStatusBarColor(mediaDarkMode.matches);
      mediaDarkMode.addEventListener('change', (ev) => {
        this.setStatusBarColor(ev.matches);
      });
    }
  }

  private setStatusBarColor(isDark: boolean): void {
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  }

  private async logDeviceInfo() {
    const info = await Device.getInfo();

    const showConfirm = async () => {
      const { value } = await Dialog.confirm({
        title: 'Âttualiça',
        message: `Pa que l'aplicaçión funçione corrêttamente tiêh q'âttualiçá tu iOS`,
      });

      if (value) {
        NativeSettings.openIOS({
          option: IOSSettings.SoftwareUpdate,
        });
      }
    };

    const osArray = info.osVersion.split('.');
    const intOSVersion = parseInt(`${osArray[0]}0${osArray[1]}`);

    if (info.platform === 'ios' && intOSVersion < 1605) {
      await showConfirm();
    }
  }

  async listenToNetworkStatus() {
    this.networkService.networkStatus$
      .pipe(distinctUntilChanged(), untilDestroyed(this))
      .subscribe({
        next: async (value) => {
          await this.showConnectionInfo(value ? 'Conêççión rêttableçía' : 'Ça perdío la conêççión');
        },
      });
  }

  async showConnectionInfo(message: string) {
    await this.toastService.presentToast({
      message,
      duration: 0,
      icon: 'globe',
    });
  }

  exitAppOnDoubleTap() {
    const urls = ['/', '/deployment'];
    if (Capacitor.getPlatform() === 'android') {
      this.platform.backButton.subscribeWithPriority(10, async () => {
        console.log("We're trying to go back here");
        if (!this.routerOutlet?.canGoBack()) {
          if (urls.includes(this.router.url)) {
            this.tap++;
            if (this.tap === 2) await App.exitApp();
            else this.doubleTapExistToast();
          } else {
            console.log(this.location);
            console.log('We can go back in a location');
            this.location.back();
          }
        } else {
          console.log(this.location);
          console.log('We can go back in a location');
          this.location.back();
        }
      });
    }
  }

  async doubleTapExistToast() {
    const result = await this.toastService.presentToast({
      message: 'Dale de nuebo ar botón de regreçâh pa çerrâh la App',
      buttons: [],
    });
    if (result) {
      this.tap = 0;
    }
  }
}
