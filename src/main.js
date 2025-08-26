const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// BOM付きUTF-8でファイルを保存する関数
function saveWithBOM(filepath, data) {
    const BOM = '\uFEFF';
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, BOM + jsonString, 'utf8');
}

// ファイル読み込み時のBOM処理
function loadWithBOM(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return JSON.parse(content);
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../assets/icons/icon.png'),
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // 開発者モードの判定
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// メニューの作成
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-project');
                    }
                },
                {
                    label: 'Open Project',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            filters: [
                                { name: 'LOOOOP Projects', extensions: ['loooop'] }
                            ],
                            properties: ['openFile']
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            mainWindow.webContents.send('menu-open-project', result.filePaths[0]);
                        }
                    }
                },
                {
                    label: 'Save Project',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-project');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Import Videos',
                    accelerator: 'CmdOrCtrl+I',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            filters: [
                                { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
                            ],
                            properties: ['openFile', 'multiSelections']
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            mainWindow.webContents.send('menu-import-videos', result.filePaths);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export Video',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-video');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'CmdOrCtrl+Y',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.reloadIgnoringCache();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    role: 'zoomin'
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    role: 'zoomout'
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    role: 'resetzoom'
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Quick Guide',
                    click: () => {
                        mainWindow.webContents.send('menu-show-guide');
                    }
                },
                {
                    label: 'About LOOOOP',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About LOOOOP',
                            message: 'LOOOOP v1.0.0',
                            detail: 'プロフェッショナル向けループ動画作成ツール\n\n© 2025 LOOOOP Development Team'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('save-project', async (event, projectData, filePath) => {
    try {
        if (!filePath) {
            const result = await dialog.showSaveDialog(mainWindow, {
                filters: [
                    { name: 'LOOOOP Projects', extensions: ['loooop'] }
                ],
                defaultPath: 'untitled.loooop'
            });
            
            if (result.canceled) return null;
            filePath = result.filePath;
        }
        
        saveWithBOM(filePath, projectData);
        return filePath;
    } catch (error) {
        console.error('Error saving project:', error);
        return null;
    }
});

ipcMain.handle('load-project', async (event, filePath) => {
    try {
        const projectData = loadWithBOM(filePath);
        return projectData;
    } catch (error) {
        console.error('Error loading project:', error);
        return null;
    }
});

// アプリケーションイベント
app.whenReady().then(() => {
    createWindow();
    createMenu();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});