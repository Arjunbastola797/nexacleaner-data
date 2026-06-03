'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron:       true,
  // System
  scanSystem:       ()       => ipcRenderer.invoke('scan-system'),
  getSystemStats:   ()       => ipcRenderer.invoke('get-system-stats'),
  getApps:          ()       => ipcRenderer.invoke('get-apps'),
  getIphoneInfo:    ()       => ipcRenderer.invoke('get-iphone-info'),
  deleteItem:       (p)      => ipcRenderer.invoke('delete-item', p),
  revealInFinder:   (p)      => ipcRenderer.invoke('reveal-in-finder', p),
  quit:             ()       => ipcRenderer.invoke('quit-app'),
  // GitHub
  githubValidate:   (pat)    => ipcRenderer.invoke('github-validate', pat),
  githubListRepos:  (pat)    => ipcRenderer.invoke('github-list-repos', pat),
  githubCreateRepo: (opts)   => ipcRenderer.invoke('github-create-repo', opts),
  githubSaveScan:   (opts)   => ipcRenderer.invoke('github-save-scan', opts),
  githubPushCode:   (opts)   => ipcRenderer.invoke('github-push-code', opts),
});
