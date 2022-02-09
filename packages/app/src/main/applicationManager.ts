import { ActionCreatorWithOptionalPayload, Unsubscribe } from "@reduxjs/toolkit";
import { app, BrowserWindow, ipcMain, Menu, shell, Tray } from "electron";
import { isPackaged } from "electron-is-packaged";
import config from "./config";
import { ApplicationStore } from "./applicationStore";
import { getIconPath, getAssetsPath } from "./paths";
import path from "path";
import { WindowState } from "../redux/state";
import { actions } from "../redux/slice";

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const ABOUT_WINDOW_WEBPACK_ENTRY: string;
declare const ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class ApplicationManager {
  applicationStore: ApplicationStore;
  mainWindow: BrowserWindow;
  settingsWindow: BrowserWindow;
  aboutWindow: BrowserWindow;
  webWindow: BrowserWindow;
  tray: Tray;
  inTrayMode: boolean;
  isQuitting: boolean;
  unsubscriber: Unsubscribe;

  constructor(applicationStore: ApplicationStore) {
    this.isQuitting = false;
    this.applicationStore = applicationStore;
    const settings = this.applicationStore.getState().settings;
    // launch tray if in tray mode
    if (settings.runInTray) {
      this.inTrayMode = true;
      this.createTray();
    } else {
      this.inTrayMode = false;
    }
    this.unsubscriber = this.applicationStore.runtimeStore.subscribe(this.runtimeStoreSubscriber);
    ipcMain.on("showProfile", (event, args) => {
      const profileURL = "https://coh2stats.com/players/" + args;
      if (this.applicationStore.getState().settings.openLinksInBrowser) {
        shell.openExternal(profileURL);
      } else {
        this.showWebWindow(profileURL);
      }
    });

    this.showMainWindow();
    if (!settings.coh2LogFileFound) {
      this.showSettingsWindow();
    }
  }

  protected createTray = (): void => {
    this.tray = new Tray(getIconPath());
    const trayMenu = Menu.buildFromTemplate([
      {
        label: "Settings",
        click: this.showSettingsWindow,
      },
      {
        label: "About",
        click: this.showAboutWindow,
      },
      {
        label: "Exit",
        click: this.quit,
      },
    ]);
    this.tray.on("click", () => {
      this.showMainWindow();
    });
    this.tray.setToolTip(config.applicationName);
    this.tray.setContextMenu(trayMenu);
    this.inTrayMode = true;
  };

  protected getMainWindowMenu = (): Menu => {
    if (this.applicationStore.getState().settings.runInTray) {
      return Menu.buildFromTemplate([
        {
          label: "&Settings",
          click: this.showSettingsWindow,
        },
        {
          label: "&About",
          click: this.showAboutWindow,
        },
        {
          label: "&Exit",
          click: this.quit,
        },
      ]);
    }
    return Menu.buildFromTemplate([
      {
        label: "&Settings",
        click: this.showSettingsWindow,
      },
      {
        label: "&About",
        click: this.showAboutWindow,
      },
    ]);
  };

  protected mainWindowCloseHandler = (event: Electron.Event): void => {
    if (this.applicationStore.getState().settings.runInTray) {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState(
          this.mainWindow,
          actions.setMainWindowState,
          this.applicationStore.getState().windowStates.main,
        );
        this.mainWindow.destroy();
      }
    } else {
      this.saveWindowState(
        this.mainWindow,
        actions.setMainWindowState,
        this.applicationStore.getState().windowStates.main,
      );
      this.quit();
    }
  };

  protected runtimeStoreSubscriber = (): void => {
    // update setting changes
    const settings = this.applicationStore.getState().settings;
    if (settings.runInTray !== this.inTrayMode) {
      if (settings.runInTray) {
        this.inTrayMode = true;
        this.createTray();
      } else {
        this.inTrayMode = false;
        if (!this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        this.tray.destroy();
      }
    }
  };

  protected saveWindowState(
    window: BrowserWindow,
    actionCreator: ActionCreatorWithOptionalPayload<WindowState>,
    oldWindowState: WindowState,
  ) {
    const windowState: WindowState = {
      x: oldWindowState.x,
      y: oldWindowState.y,
      width: oldWindowState.width,
      height: oldWindowState.height,
      maximized: window.isMaximized(),
    };
    if (!window.isMaximized()) {
      const bounds = window.getBounds();
      windowState.x = bounds.x;
      windowState.y = bounds.y;
      windowState.height = bounds.height;
      windowState.width = bounds.width;
    }
    this.applicationStore.dispatch(actionCreator(windowState));
  }

  showMainWindow = (): void => {
    const lastWindowState = this.applicationStore.getState().windowStates.main;
    this.mainWindow = new BrowserWindow({
      icon: getIconPath(),
      height: lastWindowState.height,
      width: lastWindowState.width,
      x: lastWindowState.x,
      y: lastWindowState.y,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        // This disables ability to use NODE functions in the render process
        // it's important for firebase to work
        nodeIntegration: false,
      },
    });
    this.mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    if (!isPackaged) {
      this.mainWindow.webContents.openDevTools();
    }
    this.mainWindow.setMenu(this.getMainWindowMenu());
    this.mainWindow.on("close", this.mainWindowCloseHandler);
    if (lastWindowState.maximized) {
      this.settingsWindow.maximize();
    }
    this.mainWindow.focus();
  };

  showSettingsWindow = (): void => {
    const lastWindowState = this.applicationStore.getState().windowStates.settings;
    this.settingsWindow = new BrowserWindow({
      icon: getIconPath(),
      height: lastWindowState.height,
      width: lastWindowState.width,
      x: lastWindowState.x,
      y: lastWindowState.y,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        preload: SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });
    this.settingsWindow.setMenu(Menu.buildFromTemplate([]));
    this.settingsWindow.loadURL(SETTINGS_WINDOW_WEBPACK_ENTRY);
    if (!isPackaged) {
      this.settingsWindow.webContents.openDevTools();
    }
    this.settingsWindow.on("close", (event: Electron.Event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState(
          this.settingsWindow,
          actions.setSettingsWindowState,
          this.applicationStore.getState().windowStates.settings,
        );
        this.settingsWindow.destroy();
      }
    });
    this.settingsWindow.focus();
  };

  showAboutWindow = (): void => {
    const lastWindowState = this.applicationStore.getState().windowStates.about;
    this.aboutWindow = new BrowserWindow({
      height: 250,
      width: 650,
      x: lastWindowState.x,
      y: lastWindowState.y,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      title: "",
      icon: path.join(getAssetsPath(), "blank.ico"),
      webPreferences: {
        preload: ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });
    this.aboutWindow.setMenu(Menu.buildFromTemplate([]));
    this.aboutWindow.loadURL(ABOUT_WINDOW_WEBPACK_ENTRY);
    if (!isPackaged) {
      this.aboutWindow.webContents.openDevTools();
    }
    this.aboutWindow.on("close", (event: Electron.Event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState(
          this.aboutWindow,
          actions.setAboutWindowState,
          this.applicationStore.getState().windowStates.about,
        );
        this.aboutWindow.destroy();
      }
    });
    this.aboutWindow.focus();
  };

  showWebWindow = (url: string): void => {
    const lastWindowState = this.applicationStore.getState().windowStates.web;
    this.webWindow = new BrowserWindow({
      icon: getIconPath(),
      height: lastWindowState.height,
      width: lastWindowState.width,
      x: lastWindowState.x,
      y: lastWindowState.y,
    });
    this.webWindow.setMenu(Menu.buildFromTemplate([]));
    this.webWindow.loadURL(url);
    this.webWindow.on("close", (event: Electron.Event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState(
          this.webWindow,
          actions.setWebWindowState,
          this.applicationStore.getState().windowStates.web,
        );
        this.webWindow.destroy();
      }
    });
    if (lastWindowState.maximized) {
      this.settingsWindow.maximize();
    }
    this.webWindow.focus();
  };

  quit = (): void => {
    this.isQuitting = true;
    app.quit();
  };

  destroy(): void {
    this.unsubscriber();
  }
}
