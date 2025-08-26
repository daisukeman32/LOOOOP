const { contextBridge, ipcRenderer } = require('electron');

// Rendererプロセスに安全なAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
    // プロジェクト管理
    saveProject: (projectData, filePath) => ipcRenderer.invoke('save-project', projectData, filePath),
    loadProject: (filePath) => ipcRenderer.invoke('load-project', filePath),
    
    // メニューイベント
    onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
    onMenuOpenProject: (callback) => ipcRenderer.on('menu-open-project', callback),
    onMenuSaveProject: (callback) => ipcRenderer.on('menu-save-project', callback),
    onMenuImportVideos: (callback) => ipcRenderer.on('menu-import-videos', callback),
    onMenuExportVideo: (callback) => ipcRenderer.on('menu-export-video', callback),
    onMenuShowGuide: (callback) => ipcRenderer.on('menu-show-guide', callback),
    
    // イベントリスナーの削除
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});