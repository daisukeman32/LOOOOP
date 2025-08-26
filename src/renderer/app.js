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
        
        // ループ再生制御
        this.loopState = {
            isLooping: false,
            currentLoop: 0,
            totalLoops: 3,
            isReverse: false,
            playbackDirection: 1 // 1: forward, -1: reverse
        };
        
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
        
        // セットボタン
        document.getElementById('setToTimeline').addEventListener('click', () => {
            this.setClipToTimeline();
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
        
        // メディアプールへのドロップ（thisコンテキストを修正）
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, this.preventDefaults.bind(this), false);
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
            try {
                const files = Array.from(e.dataTransfer.files)
                    .filter(file => file.type.startsWith('video/'));
                
                if (files.length > 0) {
                    const filePaths = files.map(file => file.path);
                    this.addVideosToMediaPool(filePaths);
                } else {
                    console.warn('No video files found in dropped items');
                }
            } catch (error) {
                console.error('Error processing dropped files:', error);
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
    
    setClipToTimeline() {
        if (!this.selectedClip) {
            alert('まずメディアプールからクリップを選択してください');
            return;
        }
        
        const loopCount = parseInt(document.getElementById('loopCount').value) || 3;
        this.selectedClip.loopCount = loopCount;
        
        // タイムラインに追加
        const timeline = document.getElementById('timelineTrack');
        const placeholder = timeline.querySelector('.timeline-placeholder');
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        const timelineClip = document.createElement('div');
        timelineClip.className = 'timeline-clip';
        timelineClip.style.left = `${this.project.timeline.length * 120}px`;
        timelineClip.innerHTML = `
            <div>${this.selectedClip.fileName}</div>
            <div>Loop: ${loopCount}</div>
        `;
        
        // タイムラインクリップのクリックイベント
        timelineClip.addEventListener('click', () => {
            this.selectTimelineClip(timelineClip);
        });
        
        timeline.appendChild(timelineClip);
        
        // プロジェクトデータに追加
        this.project.timeline.push({
            ...this.selectedClip,
            id: Date.now(),
            position: this.project.timeline.length
        });
        
        console.log(`Set clip to timeline: ${this.selectedClip.fileName} (${loopCount} loops)`);
        this.updateTimelineInfo();
    }
    
    selectTimelineClip(clipElement) {
        // 他の選択を解除
        document.querySelectorAll('.timeline-clip').forEach(clip => {
            clip.classList.remove('selected');
        });
        
        clipElement.classList.add('selected');
        console.log('Selected timeline clip');
    }
    
    updateTimelineInfo() {
        const totalClips = this.project.timeline.length;
        const totalLoops = this.project.timeline.reduce((sum, clip) => sum + clip.loopCount, 0);
        
        document.getElementById('timelineInfo').textContent = 
            `Timeline: ${totalClips} clips, ${totalLoops} total loops`;
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
        // ファイル選択用の隠しinput要素を作成
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.multiple = true;
        
        input.onchange = (event) => {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
                const filePaths = files.map(file => file.path || file.name);
                this.addVideosToMediaPool(filePaths);
                console.log(`Imported ${files.length} videos via button`);
            }
        };
        
        // ファイル選択ダイアログを開く
        input.click();
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
        this.selectedClip = {
            filePath: clipElement.dataset.filePath,
            fileName: clipElement.querySelector('.clip-name').textContent,
            loopCount: parseInt(document.getElementById('loopCount').value) || 3,
            element: clipElement
        };
        
        this.loadVideoForPreview(clipElement.dataset.filePath);
        console.log('Selected clip:', this.selectedClip);
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
            if (this.loopState.isLooping) {
                this.startLoopPlayback();
            } else {
                video.play();
            }
            this.isPlaying = true;
            document.getElementById('playBtn').style.display = 'none';
            document.getElementById('pauseBtn').style.display = 'inline-block';
        }
    }
    
    pauseVideo() {
        const video = document.getElementById('previewVideo');
        video.pause();
        this.isPlaying = false;
        this.stopLoopPlayback();
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    stopVideo() {
        const video = document.getElementById('previewVideo');
        video.pause();
        video.currentTime = 0;
        this.isPlaying = false;
        this.stopLoopPlayback();
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    toggleLoop() {
        this.loopState.isLooping = !this.loopState.isLooping;
        this.loopState.totalLoops = parseInt(document.getElementById('loopCount').value) || 3;
        
        const loopBtn = document.getElementById('loopBtn');
        loopBtn.style.backgroundColor = this.loopState.isLooping ? '#0078d4' : '#3e3e3e';
        
        const video = document.getElementById('previewVideo');
        if (!this.loopState.isLooping) {
            // 通常再生に戻す
            video.loop = false;
            this.stopLoopPlayback();
        }
        
        console.log(`Loop mode: ${this.loopState.isLooping ? 'ON' : 'OFF'} (${this.loopState.totalLoops} loops)`);
    }
    
    updateLoopCount(count) {
        this.loopState.totalLoops = count;
        if (this.selectedClip) {
            this.selectedClip.loopCount = count;
        }
        console.log(`Updated loop count to: ${count}`);
    }
    
    startLoopPlayback() {
        const video = document.getElementById('previewVideo');
        if (!video.src || !video.duration) return;
        
        // ループ状態をリセット
        this.loopState.currentLoop = 0;
        this.loopState.isReverse = false;
        this.loopState.playbackDirection = 1;
        
        // 動画を最初から開始
        video.currentTime = 0;
        video.pause();
        
        console.log(`Starting loop playback: ${this.loopState.totalLoops} loops`);
        this.updateLoopPlayback();
    }
    
    stopLoopPlayback() {
        if (this.loopAnimationId) {
            cancelAnimationFrame(this.loopAnimationId);
            this.loopAnimationId = null;
        }
        this.loopState.currentLoop = 0;
        this.loopState.isReverse = false;
        console.log('Loop playback stopped');
    }
    
    updateLoopPlayback() {
        if (!this.isPlaying || !this.loopState.isLooping) return;
        
        const video = document.getElementById('previewVideo');
        const duration = video.duration;
        
        if (this.loopState.currentLoop >= this.loopState.totalLoops) {
            // ループ完了
            this.pauseVideo();
            this.loopState.currentLoop = 0;
            video.currentTime = 0;
            console.log('All loops completed');
            return;
        }
        
        // フレーム更新
        const frameTime = 1000 / 30; // 30fps
        
        if (!this.loopState.isReverse) {
            // 正再生
            video.currentTime += (frameTime / 1000);
            
            if (video.currentTime >= duration) {
                // 正再生終了、逆再生開始
                this.loopState.isReverse = true;
                video.currentTime = duration;
                console.log(`Loop ${this.loopState.currentLoop + 1}: Forward complete, starting reverse`);
            }
        } else {
            // 逆再生
            video.currentTime -= (frameTime / 1000);
            
            if (video.currentTime <= 0) {
                // 逆再生終了、次のループへ
                this.loopState.isReverse = false;
                this.loopState.currentLoop++;
                video.currentTime = 0;
                console.log(`Loop ${this.loopState.currentLoop}: Complete (${this.loopState.currentLoop}/${this.loopState.totalLoops})`);
            }
        }
        
        // 次のフレーム
        this.loopAnimationId = requestAnimationFrame(() => {
            this.updateLoopPlayback();
        });
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