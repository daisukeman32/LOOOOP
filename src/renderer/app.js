// LOOOOP メインアプリケーション
class LOOOOPApp {
    constructor() {
        this.project = {
            name: 'Untitled Project',
            timeline: [],
            settings: {
                resolution: '1920x1080',
                bitrate: 10000000,
                fps: 30
            }
        };
        
        this.selectedClip = null;
        this.isPlaying = false;
        this.currentFilePath = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMenuEventListeners();
        this.setupDragAndDrop();
        this.initializeSpeedCurveEditor();
        console.log('LOOOOP App initialized');
    }
    
    setupEventListeners() {
        // インポートボタン
        document.getElementById('importButton').addEventListener('click', () => {
            this.importVideos();
        });
        
        // プレビューコントロール
        document.getElementById('playBtn').addEventListener('click', () => {
            this.playVideo();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseVideo();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopVideo();
        });
        
        document.getElementById('loopBtn').addEventListener('click', () => {
            this.toggleLoop();
        });
        
        // インスペクター
        document.getElementById('loopCount').addEventListener('change', (e) => {
            this.updateLoopCount(parseInt(e.target.value));
        });
        
        document.getElementById('resetCurve').addEventListener('click', () => {
            this.resetSpeedCurve();
        });
        
        // エクスポートモーダル
        document.getElementById('startExport').addEventListener('click', () => {
            this.startExport();
        });
        
        document.getElementById('cancelExport').addEventListener('click', () => {
            this.hideModal('exportModal');
        });
        
        // ヘルプモーダル
        document.getElementById('closeHelp').addEventListener('click', () => {
            this.hideModal('helpModal');
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });
    }
    
    setupMenuEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.onMenuNewProject(() => {
                this.newProject();
            });
            
            window.electronAPI.onMenuOpenProject((event, filePath) => {
                this.openProject(filePath);
            });
            
            window.electronAPI.onMenuSaveProject(() => {
                this.saveProject();
            });
            
            window.electronAPI.onMenuImportVideos((event, filePaths) => {
                this.addVideosToMediaPool(filePaths);
            });
            
            window.electronAPI.onMenuExportVideo(() => {
                this.showModal('exportModal');
            });
            
            window.electronAPI.onMenuShowGuide(() => {
                this.showModal('helpModal');
            });
        }
    }
    
    setupDragAndDrop() {
        const importArea = document.getElementById('importArea');
        const timeline = document.getElementById('timelineTrack');
        
        // メディアプールへのドロップ
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            importArea.addEventListener(eventName, () => {
                importArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, () => {
                importArea.classList.remove('drag-over');
            }, false);
        });
        
        importArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files)
                .filter(file => file.type.startsWith('video/'));
            
            if (files.length > 0) {
                const filePaths = files.map(file => file.path);
                this.addVideosToMediaPool(filePaths);
            }
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    initializeSpeedCurveEditor() {
        const svg = document.getElementById('speedCurveSvg');
        const path = document.getElementById('speedCurvePath');
        const points = [
            document.getElementById('point1'),
            document.getElementById('point2')
        ];
        
        let dragging = null;
        
        points.forEach((point, index) => {
            point.addEventListener('mousedown', (e) => {
                dragging = { point, index };
                e.preventDefault();
            });
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            
            const rect = svg.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 300;
            const y = ((e.clientY - rect.top) / rect.height) * 200;
            
            // 制限範囲内に収める
            const clampedX = Math.max(20, Math.min(280, x));
            const clampedY = Math.max(20, Math.min(180, y));
            
            dragging.point.setAttribute('cx', clampedX);
            dragging.point.setAttribute('cy', clampedY);
            
            this.updateSpeedCurvePath();
        });
        
        document.addEventListener('mouseup', () => {
            dragging = null;
        });
        
        // SVGクリックで制御点追加
        svg.addEventListener('click', (e) => {
            if (e.target === svg || e.target.tagName === 'rect') {
                this.addSpeedCurvePoint(e);
            }
        });
    }
    
    updateSpeedCurvePath() {
        const points = Array.from(document.querySelectorAll('#speedCurveSvg circle'))
            .map(point => ({
                x: parseFloat(point.getAttribute('cx')),
                y: parseFloat(point.getAttribute('cy'))
            }))
            .sort((a, b) => a.x - b.x);
        
        if (points.length < 2) return;
        
        const path = document.getElementById('speedCurvePath');
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        path.setAttribute('d', pathData);
    }
    
    addSpeedCurvePoint(e) {
        const svg = document.getElementById('speedCurveSvg');
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 300;
        const y = ((e.clientY - rect.top) / rect.height) * 200;
        
        const newPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        newPoint.setAttribute('cx', x);
        newPoint.setAttribute('cy', y);
        newPoint.setAttribute('r', '4');
        newPoint.setAttribute('fill', '#fff');
        newPoint.setAttribute('stroke', '#0078d4');
        newPoint.setAttribute('stroke-width', '2');
        newPoint.style.cursor = 'pointer';
        
        // 右クリックで削除
        newPoint.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (svg.querySelectorAll('circle').length > 2) { // 最低2点は維持
                newPoint.remove();
                this.updateSpeedCurvePath();
            }
        });
        
        svg.appendChild(newPoint);
        this.updateSpeedCurvePath();
    }
    
    resetSpeedCurve() {
        const svg = document.getElementById('speedCurveSvg');
        const circles = svg.querySelectorAll('circle');
        
        // デフォルトの2点以外を削除
        for (let i = circles.length - 1; i >= 2; i--) {
            circles[i].remove();
        }
        
        // デフォルト位置にリセット
        document.getElementById('point1').setAttribute('cx', '20');
        document.getElementById('point1').setAttribute('cy', '180');
        document.getElementById('point2').setAttribute('cx', '280');
        document.getElementById('point2').setAttribute('cy', '180');
        
        this.updateSpeedCurvePath();
    }
    
    async importVideos() {
        // ファイル選択ダイアログの表示はメインプロセスで処理
        console.log('Import videos requested');
    }
    
    addVideosToMediaPool(filePaths) {
        const mediaPool = document.getElementById('mediaPool');
        
        filePaths.forEach(filePath => {
            const clipElement = this.createMediaClipElement(filePath);
            
            // インポートエリアの前に挿入
            const importArea = document.getElementById('importArea');
            mediaPool.insertBefore(clipElement, importArea);
        });
        
        console.log(`Added ${filePaths.length} videos to media pool`);
    }
    
    createMediaClipElement(filePath) {
        const clip = document.createElement('div');
        clip.className = 'media-clip';
        clip.draggable = true;
        clip.dataset.filePath = filePath;
        
        // ファイル名を抽出
        const fileName = filePath.split(/[\\/]/).pop();
        
        clip.innerHTML = `
            <div class="clip-thumbnail" style="width: 100%; height: 80%; background: linear-gradient(45deg, #333, #555); display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 24px;">
                🎬
            </div>
            <div class="clip-name">${fileName}</div>
        `;
        
        // ドラッグ開始
        clip.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', filePath);
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        // クリック選択
        clip.addEventListener('click', () => {
            this.selectMediaClip(clip);
        });
        
        return clip;
    }
    
    selectMediaClip(clipElement) {
        // 他の選択を解除
        document.querySelectorAll('.media-clip').forEach(clip => {
            clip.classList.remove('selected');
        });
        
        clipElement.classList.add('selected');
        this.loadVideoForPreview(clipElement.dataset.filePath);
    }
    
    loadVideoForPreview(filePath) {
        const video = document.getElementById('previewVideo');
        const overlay = document.getElementById('previewOverlay');
        
        video.src = filePath;
        overlay.style.display = 'none';
        
        video.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
        });
        
        console.log(`Loaded video for preview: ${filePath}`);
    }
    
    playVideo() {
        const video = document.getElementById('previewVideo');
        if (video.src) {
            video.play();
            this.isPlaying = true;
            document.getElementById('playBtn').style.display = 'none';
            document.getElementById('pauseBtn').style.display = 'inline-block';
        }
    }
    
    pauseVideo() {
        const video = document.getElementById('previewVideo');
        video.pause();
        this.isPlaying = false;
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    stopVideo() {
        const video = document.getElementById('previewVideo');
        video.pause();
        video.currentTime = 0;
        this.isPlaying = false;
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    toggleLoop() {
        const video = document.getElementById('previewVideo');
        video.loop = !video.loop;
        
        const loopBtn = document.getElementById('loopBtn');
        loopBtn.style.backgroundColor = video.loop ? '#0078d4' : '#3e3e3e';
    }
    
    updateLoopCount(count) {
        if (this.selectedClip) {
            this.selectedClip.loopCount = count;
            console.log(`Updated loop count to: ${count}`);
        }
    }
    
    updateTimeDisplay() {
        const video = document.getElementById('previewVideo');
        const display = document.getElementById('timeDisplay');
        
        if (video.duration) {
            const current = this.formatTime(video.currentTime);
            const total = this.formatTime(video.duration);
            display.textContent = `${current} / ${total}`;
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    handleKeyboardShortcut(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'e':
                    e.preventDefault();
                    this.showModal('exportModal');
                    break;
                case 'i':
                    e.preventDefault();
                    this.importVideos();
                    break;
            }
        } else if (e.key === ' ') {
            e.preventDefault();
            if (this.isPlaying) {
                this.pauseVideo();
            } else {
                this.playVideo();
            }
        }
    }
    
    newProject() {
        this.project = {
            name: 'Untitled Project',
            timeline: [],
            settings: {
                resolution: '1920x1080',
                bitrate: 10000000,
                fps: 30
            }
        };
        this.currentFilePath = null;
        this.clearUI();
        console.log('New project created');
    }
    
    async saveProject() {
        if (window.electronAPI) {
            try {
                const filePath = await window.electronAPI.saveProject(this.project, this.currentFilePath);
                if (filePath) {
                    this.currentFilePath = filePath;
                    console.log(`Project saved to: ${filePath}`);
                }
            } catch (error) {
                console.error('Failed to save project:', error);
            }
        }
    }
    
    async openProject(filePath) {
        if (window.electronAPI) {
            try {
                const projectData = await window.electronAPI.loadProject(filePath);
                if (projectData) {
                    this.project = projectData;
                    this.currentFilePath = filePath;
                    this.loadProjectToUI();
                    console.log(`Project loaded from: ${filePath}`);
                }
            } catch (error) {
                console.error('Failed to load project:', error);
            }
        }
    }
    
    loadProjectToUI() {
        // UIにプロジェクトデータを反映
        console.log('Loading project to UI...');
        // TODO: タイムラインの復元など
    }
    
    clearUI() {
        // UIをクリア
        const mediaPool = document.getElementById('mediaPool');
        const clips = mediaPool.querySelectorAll('.media-clip');
        clips.forEach(clip => clip.remove());
        
        const video = document.getElementById('previewVideo');
        video.src = '';
        document.getElementById('previewOverlay').style.display = 'flex';
        
        console.log('UI cleared');
    }
    
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    startExport() {
        const fileName = document.getElementById('fileName').value;
        const resolution = document.getElementById('resolution').value;
        const bitrate = parseInt(document.getElementById('bitrate').value);
        const fps = parseInt(document.getElementById('fps').value);
        
        console.log('Export started:', { fileName, resolution, bitrate, fps });
        
        // プログレス表示
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('startExport').disabled = true;
        
        // TODO: 実際のエクスポート処理
        this.simulateExport();
    }
    
    simulateExport() {
        let progress = 0;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                progressText.textContent = 'エクスポート完了！';
                setTimeout(() => {
                    this.hideModal('exportModal');
                    this.resetExportModal();
                }, 2000);
            } else {
                progressText.textContent = `処理中... ${Math.round(progress)}%`;
            }
            
            progressFill.style.width = `${progress}%`;
        }, 200);
    }
    
    resetExportModal() {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('startExport').disabled = false;
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    window.loooopApp = new LOOOOPApp();
    
    // ビデオの時間更新
    const video = document.getElementById('previewVideo');
    video.addEventListener('timeupdate', () => {
        window.loooopApp.updateTimeDisplay();
    });
});