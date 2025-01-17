import { createSlice, PayloadAction, Store } from "@reduxjs/toolkit";
import { defaultSettings, defaultWindowStates, startupGameData } from "./defaultState";
import {
  ApplicationCache,
  ApplicationSettings,
  ApplicationState,
  ApplicationThemes,
  ApplicationWindows,
  GameData,
  GameState,
  MapStatCache,
  StreamOverlayPositions,
  TwitchExtensionConfigStatus,
  WindowState,
} from "./state";

export const initialState: ApplicationState = {
  settings: defaultSettings,
  cache: {},
  windowStates: defaultWindowStates,
  game: startupGameData,
  updateCounter: 0,
};

export const slice = createSlice({
  name: "application",
  initialState,
  reducers: {
    setAppVersion: (state, { payload }: PayloadAction<string>) => {
      state.settings.appVersion = payload;
    },
    setCurrentAppInfos: (
      state,
      { payload }: PayloadAction<{ version: string; releaseInfo: string; downloadLink: string }>,
    ) => {
      state.settings.appNewestVersion = payload.version;
      state.settings.appReleaseInfos = payload.releaseInfo;
      state.settings.appUpdateDownloadLink = payload.downloadLink;
    },
    setLogFileFound: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.coh2LogFileFound = payload;
    },
    setLogFilePath: (state, { payload }: PayloadAction<string>) => {
      state.settings.coh2LogFileLocation = payload;
    },
    setUpdateInterval: (state, { payload }: PayloadAction<number>) => {
      state.settings.updateInterval = payload;
    },
    setRunInTray: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.runInTray = payload;
    },
    setSettingsTheme: (state, { payload }: PayloadAction<ApplicationThemes>) => {
      state.settings.theme = payload;
    },
    setOpenLinksInBrowser: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.openLinksInBrowser = payload;
    },
    setGameNotification: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.gameNotification = payload;
    },
    setStreamOverlay: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.streamOverlay = payload;
    },
    setStreamOverlayPort: (state, { payload }: PayloadAction<number>) => {
      if (Number.isInteger(payload) && payload >= 0 && payload <= 65535) {
        state.settings.streamOverlayPort = payload;
      }
    },
    setStreamOverlayPortFree: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.streamOverlayPortFree = payload;
    },
    setStreamOverlayPosition: (state, { payload }: PayloadAction<StreamOverlayPositions>) => {
      state.settings.streamOverlayPosition = payload;
    },
    setTwitchExtension: (state, { payload }: PayloadAction<boolean>) => {
      state.settings.twitchExtension = payload;
    },
    setTwitchExtensionConfigStep: (state, { payload }: PayloadAction<0 | 1 | 2>) => {
      state.settings.twitchExtensionConfigStep = payload;
    },
    setTwitchExtensionConfigStatus: (
      state,
      { payload }: PayloadAction<TwitchExtensionConfigStatus>,
    ) => {
      state.settings.twitchExtensionConfigStatus = payload;
    },
    setTwitchExtensionConfiguration: (
      state,
      { payload }: PayloadAction<{ passwordHash: string; uuid: string; secret: string }>,
    ) => {
      state.settings.twitchExtensionPasswordHash = payload.passwordHash;
      state.settings.twitchExtensionUUID = payload.uuid;
      state.settings.twitchExtensionSecret = payload.secret;
    },
    setWindowState: (
      state,
      { payload }: PayloadAction<{ windowName: ApplicationWindows; state: WindowState }>,
    ) => {
      state.windowStates[payload.windowName] = payload.state;
    },
    setGameData: (state, { payload }: PayloadAction<GameData>) => {
      state.game = payload;
    },
    setGameState: (state, { payload }: PayloadAction<GameState>) => {
      state.game.state = payload;
    },
    setMapStatCache: (state, { payload }: PayloadAction<MapStatCache>) => {
      state.cache.mapStats = payload;
    },
  },
});

export const selectSettings = (state: ApplicationState): ApplicationSettings => state.settings;
export const selectCache = (state: ApplicationState): ApplicationCache => state.cache;
export const selectGame = (state: ApplicationState): GameData => state.game;

export type ReduxStore = Store<ApplicationState>;
export const actions = slice.actions;
export default slice.reducer;
