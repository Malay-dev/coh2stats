import { Unsubscribe } from "@reduxjs/toolkit";
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell, Tray } from "electron";
import config from "./config";
import { ApplicationStore } from "./applicationStore";
import { getIconPath } from "./paths";
import { ApplicationWindows, WindowState } from "../redux/state";
import { actions } from "../redux/slice";
import { events } from "./mixpanel";
import { ApplicationWindow, WindowCloseHandlerCreator } from "./applicationWindow";

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
  windows: Record<ApplicationWindows, ApplicationWindow>;
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
    // initialize windows
    this.windows = {
      main: new ApplicationWindow("main", {
        minWidth: 550,
        minHeight: 300,
        displayExternalContent: false,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        url: MAIN_WINDOW_WEBPACK_ENTRY,
        maximizable: true,
        fullscreenable: false,
        resizable: true,
        closeHandlerCreator: this.mainWindowCloseHandlerCreator,
        getLastWindowSateFunc: this.getLastWindowState,
      }),
      settings: new ApplicationWindow("settings", {
        minWidth: 700,
        minHeight: 250,
        displayExternalContent: false,
        preload: SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY,
        url: SETTINGS_WINDOW_WEBPACK_ENTRY,
        maximizable: false,
        fullscreenable: false,
        resizable: true,
        closeHandlerCreator: this.sideWindowCloseHandlerCreator,
        getLastWindowSateFunc: this.getLastWindowState,
      }),
      about: new ApplicationWindow("about", {
        minWidth: 650,
        minHeight: 250,
        displayExternalContent: false,
        preload: ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY,
        url: ABOUT_WINDOW_WEBPACK_ENTRY,
        maximizable: false,
        fullscreenable: false,
        resizable: false,
        closeHandlerCreator: this.sideWindowCloseHandlerCreator,
        getLastWindowSateFunc: this.getLastWindowState,
      }),
      web: new ApplicationWindow("web", {
        minWidth: 720,
        minHeight: 350,
        displayExternalContent: true,
        url: "https://coh2stats.com/",
        maximizable: true,
        fullscreenable: false,
        resizable: true,
        closeHandlerCreator: this.sideWindowCloseHandlerCreator,
        getLastWindowSateFunc: this.getLastWindowState,
      }),
    };

    ipcMain.on("showProfile", (event, args) => {
      const profileURL = "https://coh2stats.com/players/" + args;
      if (this.applicationStore.getState().settings.openLinksInBrowser) {
        shell.openExternal(profileURL);
        events.click_on_player("browser");
      } else {
        this.windows.web.show(profileURL);
        events.click_on_player("electron");
      }
    });

    ipcMain.on("showWindow", (event, args: ApplicationWindows) => {
      this.windows[args].show();
    });

    ipcMain.on("minimizeWindow", (event, args: ApplicationWindows) => {
      this.windows[args].minimize();
    });

    ipcMain.on("maximizeWindow", (event, args: ApplicationWindows) => {
      this.windows[args].toggleMaximize();
    });

    ipcMain.on("closeWindow", (event, args: ApplicationWindows) => {
      this.windows[args].close();
    });

    ipcMain.on("reloadAllWindows", () => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.reload();
      });
    });

    this.windows.main.show();
    if (!settings.coh2LogFileFound) {
      this.windows.settings.show();
    }
    events.init();
  }

  protected mainWindowCloseHandlerCreator: WindowCloseHandlerCreator = (windowName, window) => {
    return (event: Electron.Event): void => {
      if (this.applicationStore.getState().settings.runInTray) {
        if (!this.isQuitting) {
          event.preventDefault();
          this.saveWindowState(
            windowName,
            window,
            this.applicationStore.getState().windowStates.main,
          );
          window.destroy();
        }
      } else {
        this.saveWindowState(
          windowName,
          window,
          this.applicationStore.getState().windowStates.main,
        );
        this.quit();
      }
    };
  };

  protected sideWindowCloseHandlerCreator: WindowCloseHandlerCreator = (windowName, window) => {
    return (event: Electron.Event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState(
          windowName,
          window,
          this.applicationStore.getState().windowStates.settings,
        );
        window.destroy();
      }
    };
  };

  protected getLastWindowState = (windowName: ApplicationWindows): WindowState => {
    return this.applicationStore.getState().windowStates[windowName];
  };

  protected createTray = (): void => {
    this.tray = new Tray(getIconPath());
    const trayMenu = Menu.buildFromTemplate([
      {
        label: "Settings",
        click: () => this.windows.settings.show(),
      },
      {
        label: "About",
        click: () => this.windows.about.show(),
      },
      {
        label: "Exit",
        click: this.quit,
      },
    ]);
    this.tray.on("click", () => {
      this.windows.main.show();
    });
    this.tray.setToolTip(config.applicationName);
    this.tray.setContextMenu(trayMenu);
    this.inTrayMode = true;
  };

  protected runtimeStoreSubscriber = (): void => {
    // update setting changes
    const settings = this.applicationStore.getState().settings;
    if (nativeTheme.themeSource !== settings.theme) {
      nativeTheme.themeSource = settings.theme;
    }
    if (settings.runInTray !== this.inTrayMode) {
      if (settings.runInTray) {
        this.inTrayMode = true;
        this.createTray();
      } else {
        this.inTrayMode = false;
        this.windows.main.show();
        this.tray.destroy();
      }
    }
  };

  protected saveWindowState(
    windowName: ApplicationWindows,
    window: BrowserWindow,
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
    this.applicationStore.dispatch(actions.setWindowState({ windowName, state: windowState }));
  }

  quit = (): void => {
    this.isQuitting = true;
    this.windows.main = null;
    this.windows.web = null;
    this.windows.settings = null;
    this.windows.about = null;
  };

  destroy(): void {
    this.unsubscriber();
  }
}

// When all windows are closed the app will end all processes
app.on("window-all-closed", () => {
  app.quit();
});
