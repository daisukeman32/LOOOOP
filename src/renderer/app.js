// LOOOOP メインアプリケーション - 正しいワークフロー実装
class LOOOOPApp {
    constructor() {
        // 基本状態管理
        this.selectedClip = null;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.loopCount = 3;
        this.isSet = false; // セット状態管理
        
        // タイムライン管理
        this.timelineClips = []; // セットされたクリップの配列
        this.selectedClipIndex = -1; // 選択中のクリップインデックス
        
        // Canvas/Video要素
        this.canvas = null;
        this.ctx = null;
        this.hiddenVideo = null;
        this.frames = [];
        
        // 速度制御
        this.speedCurveData = [];
        this.currentSpeed = 1.0;
        
        // 動画時間軸同期
        this.videoDuration = 0; // 秒
        this.videoFrameRate = 30; // fps
        this.speedCurveWidth = 800; // px - 初期値、動画ロード時に自動調整
        this.pixelsPerSecond = 0; // px/sec
        
        // アニメーション
        this.animationId = null;
        this.lastFrameTime = 0;
        
        this.init();
    }
    
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeedCurveEditor();
        this.setupSpeedCurveEditorWide();
        this.initializeNewSpeedSystem();
        this.setupTimelineSpeedSync();
        this.setupThemeToggle();
        this.setupTimelineClipSelection();
        this.setupVideoTimelineSync();
        console.log('🚀 LOOOOP App initialized with speed curve editor');
    }
    
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        
        // ローカルストレージから保存されたテーマを読み込み（デフォルトはdark）
        const savedTheme = localStorage.getItem('loooop-theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeIcon) themeIcon.textContent = '🌙';
        } else {
            if (themeIcon) themeIcon.textContent = '🌞';
        }
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-mode');
                themeIcon.textContent = isDark ? '🌙' : '🌞';
                localStorage.setItem('loooop-theme', isDark ? 'dark' : 'light');
                
                console.log(`🎨 Theme switched to ${isDark ? 'Night' : 'Day'} mode`);
            });
        }
    }
    
    initializeElements() {
        this.canvas = document.getElementById('previewCanvas');
        this.hiddenVideo = document.getElementById('hiddenVideo');
        
        if (!this.canvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        if (!this.hiddenVideo) {
            console.error('❌ Hidden video element not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // LoopEngineを初期化
        this.initializeLoopEngine();
        
        // Canvas初期設定
        this.canvas.width = 640;
        this.canvas.height = 360;
        
        // 黒背景で初期化
        if (this.ctx) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            console.log('✅ Canvas initialized: 640x360');
        }
        
        console.log('Elements initialized');
    }
    
    // LoopEngineを初期化
    initializeLoopEngine() {
        // LoopEngine.jsをインポート（ESモジュールではないので、グローバルスコープから使用）
        if (typeof LoopEngine !== 'undefined') {
            this.loopEngine = new LoopEngine(this.canvas, this.hiddenVideo);
            console.log('✅ LoopEngine initialized successfully');
            
            // LoopEngineのコールバック設定
            this.loopEngine.onFrameUpdate = (currentFrame, totalFrames) => {
                this.onLoopEngineFrameUpdate(currentFrame, totalFrames);
            };
            
            this.loopEngine.onPlaybackEnd = () => {
                this.onLoopEnginePlaybackEnd();
            };
        } else {
            console.error('❌ LoopEngine class not found - loopEngine.js not loaded?');
        }
    }
    
    // LoopEngineからのフレーム更新コールバック
    onLoopEngineFrameUpdate(currentFrame, totalFrames) {
        // UI更新
        this.currentFrame = currentFrame;
        this.updateFrameInfo(); // フレーム情報更新
        this.updatePlayhead(); // タイムラインの再生ヘッド更新
    }
    
    // LoopEngineからの再生終了コールバック
    onLoopEnginePlaybackEnd() {
        console.log('🔄 Loop playback completed');
        // 必要に応じて追加処理
    }
    
    setupEventListeners() {
        // インポートボタン
        document.getElementById('importButton').addEventListener('click', () => {
            this.importVideos();
        });
        
        // ドラッグ&ドロップ
        this.setupDragAndDrop();
        
        // セットボタン（重要な機能）
        document.getElementById('setToTimeline').addEventListener('click', () => {
            this.setToTimeline();
        });
        
        // 再生コントロール
        document.getElementById('playBtn').addEventListener('click', () => {
            if (this.isSet) this.playLoop();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseLoop();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopLoop();
        });
        
        // ループ回数変更（リアルタイム反映）
        document.getElementById('loopCount').addEventListener('input', (e) => {
            this.loopCount = parseInt(e.target.value) || 3;
            if (this.isSet) {
                this.updateLoopSettings(); // 即座に反映
            }
        });
        
        // 新しい速度パターンシステム
        this.setupNewSpeedEditor();
        
        // 新しいコントロールボタン
        document.getElementById('playBtn').addEventListener('click', () => {
            this.playLoop();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseLoop();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopLoop();
        });
        
        // 新しいタイムラインシークバー
        this.setupTimelineSeekbar();
        
        // 従来のシークバーも維持
        // this.setupSeekbar(); // プレビューシークバーを削除したため無効化
        
        // タイムライン削除ボタン
        this.setupTimelineDeleteButtons();
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
            // 削除キー処理を追加
            if (e.key === 'Delete' && this.selectedClipIndex !== -1) {
                this.deleteSelectedClip();
            }
        });
        
        console.log('Event listeners setup completed');
    }
    
    setupDragAndDrop() {
        const importArea = document.getElementById('importArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            importArea.addEventListener(eventName, () => {
                importArea.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, () => {
                importArea.classList.remove('drag-over');
            });
        });
        
        importArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files)
                .filter(file => file.type.startsWith('video/'));
            
            if (files.length > 0) {
                this.addVideosToMediaPool(files);
            }
        });
    }
    
    // 1. 動画インポート → サムネ表示
    async importVideos() {
        const fileInput = document.getElementById('fileInput');
        fileInput.onchange = (event) => {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
                this.addVideosToMediaPool(files);
            }
        };
        fileInput.click();
    }
    
    addVideosToMediaPool(files) {
        const mediaPool = document.getElementById('mediaPool');
        const importArea = document.getElementById('importArea');
        
        console.log(`📦 Starting to add ${files.length} videos to media pool`);
        
        if (!mediaPool) {
            console.error('❌ Media pool element not found');
            return;
        }
        
        if (!importArea) {
            console.error('❌ Import area element not found');
            return;
        }
        
        files.forEach((file, index) => {
            console.log(`📹 Processing video ${index + 1}/${files.length}: ${file.name}`);
            const clipElement = this.createMediaClipElement(file);
            mediaPool.insertBefore(clipElement, importArea);
            console.log(`✅ Video element created and inserted: ${file.name}`);
        });
        
        console.log(`✅ Successfully added ${files.length} videos to media pool`);
    }
    
    createMediaClipElement(file) {
        console.log(`🎬 Creating media clip element for: ${file.name}`);
        const clip = document.createElement('div');
        clip.className = 'media-clip';
        clip.dataset.filePath = file.path || URL.createObjectURL(file);
        
        // 初期表示（サムネ生成前）
        clip.innerHTML = `
            <div class="thumbnail-container">
                <div class="thumbnail-loading">📹</div>
            </div>
            <div class="clip-name">${file.name}</div>
        `;
        
        console.log(`📋 Clip element HTML structure created for: ${file.name}`);
        
        // サムネ生成
        const video = document.createElement('video');
        video.src = clip.dataset.filePath;
        video.muted = true;
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        
        video.addEventListener('loadedmetadata', () => {
            console.log(`📊 Video metadata loaded: ${file.name}, Duration: ${video.duration}s, Dimensions: ${video.videoWidth}x${video.videoHeight}`);
            // 動画の中間地点をサムネに
            video.currentTime = Math.max(0.1, Math.min(1, video.duration / 2));
        });
        
        video.addEventListener('seeked', () => {
            try {
                const thumbnailCanvas = document.createElement('canvas');
                const aspectRatio = video.videoWidth / video.videoHeight || 16/9;
                
                // サムネイルサイズ計算
                if (aspectRatio > 1.6) {
                    thumbnailCanvas.width = 160;
                    thumbnailCanvas.height = Math.round(160 / aspectRatio);
                } else {
                    thumbnailCanvas.height = 64;
                    thumbnailCanvas.width = Math.round(64 * aspectRatio);
                }
                
                const thumbCtx = thumbnailCanvas.getContext('2d');
                thumbCtx.drawImage(video, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
                
                // サムネイル更新
                const thumbnailContainer = clip.querySelector('.thumbnail-container');
                const thumbnailDataURL = thumbnailCanvas.toDataURL();
                thumbnailContainer.innerHTML = `<img src="${thumbnailDataURL}" alt="thumbnail">`;
                
                console.log(`✅ Thumbnail generated for: ${file.name} (${thumbnailCanvas.width}x${thumbnailCanvas.height})`);
            } catch (error) {
                console.warn('⚠️ Thumbnail generation failed:', error);
                const thumbnailContainer = clip.querySelector('.thumbnail-container');
                thumbnailContainer.innerHTML = `<div class="thumbnail-error">❌</div>`;
            }
        });
        
        video.addEventListener('error', (e) => {
            console.error('❌ Video loading error:', e);
            const thumbnailContainer = clip.querySelector('.thumbnail-container');
            thumbnailContainer.innerHTML = `<div class="thumbnail-error">❌</div>`;
        });
        
        // クリック選択
        clip.addEventListener('click', () => {
            this.selectMediaClip(clip, file);
        });
        
        return clip;
    }
    
    selectMediaClip(clipElement, file) {
        // 他の選択を解除
        document.querySelectorAll('.media-clip').forEach(clip => {
            clip.classList.remove('selected');
        });
        
        clipElement.classList.add('selected');
        this.selectedClip = {
            filePath: clipElement.dataset.filePath,
            fileName: file.name,
            file: file,
            element: clipElement
        };
        
        console.log('✅ Selected clip:', this.selectedClip.fileName);
    }
    
    // 2. セット機能（重要）- 複数クリップ対応
    async setToTimeline() {
        if (!this.selectedClip) {
            alert('まず動画を選択してください');
            return;
        }
        
        console.log('🔄 Setting clip to timeline...');
        
        try {
            // 動画を読み込んでフレーム情報を取得
            const frameData = await this.loadVideoFrames(this.selectedClip);
            
            // タイムラインクリップオブジェクトを作成
            const timelineClip = {
                id: Date.now(),
                ...this.selectedClip,
                loopCount: this.loopCount,
                frames: frameData.frames,
                duration: frameData.duration,
                startTime: this.calculateTotalDuration(), // 現在の総時間
                selected: false
            };
            
            // タイムラインに追加
            this.timelineClips.push(timelineClip);
            this.isSet = true;
            
            // ⚡ 重要: 最初のクリップのframesを一時的に設定（後で複数クリップ対応に変更）
            this.frames = frameData.frames;
            this.selectedTimelineClip = timelineClip;
            this.currentClipId = null; // 動画切り替え用ID
            
            // hiddenVideoに動画をセット（完全準備まで待機）
            this.hiddenVideo.src = this.selectedClip.filePath;
            await new Promise((resolve, reject) => {
                this.hiddenVideo.oncanplaythrough = () => {
                    console.log('✅ Hidden video ready for playback');
                    resolve();
                };
                this.hiddenVideo.onerror = reject;
            });
            
            // フレーム総数更新
            this.updateTotalFrames();
            
            // UI更新
            this.updateUI();
            this.renderTimeline();
            
            // LoopEngineに動画を読み込み
            if (this.loopEngine && this.selectedClip) {
                try {
                    const videoPath = this.selectedClip.filePath || this.selectedClip.path;
                    console.log('🔄 Loading video into LoopEngine:', videoPath);
                    await this.loopEngine.loadVideo(videoPath);
                    console.log('✅ Video loaded into LoopEngine');
                } catch (error) {
                    console.warn('⚠️ Failed to load video into LoopEngine:', error);
                }
            }
            
            // 実際の再生時間を計算して表示
            this.updateActualDurationDisplay();
            
            console.log(`✅ Clip set successfully - ${this.frames.length} frames ready`);
            console.log(`📊 Total frames: ${this.totalFrames} (${this.loopCount} loops)`);
            
        } catch (error) {
            console.error('❌ Failed to set clip:', error);
            alert('動画の読み込みに失敗しました');
        }
    }
    
    async loadVideoFrames(clip) {
        return new Promise((resolve, reject) => {
            const tempVideo = document.createElement('video');
            tempVideo.src = clip.filePath;
            tempVideo.muted = true;
            
            tempVideo.onloadedmetadata = () => {
                const duration = tempVideo.duration;
                const fps = 30;
                const frameCount = Math.floor(duration * fps);
                
                // 動画メタデータを保存
                this.videoDuration = duration;
                this.videoFrameRate = fps;
                
                const frames = Array.from({length: frameCount}, (_, i) => ({
                    index: i,
                    time: i / fps
                }));
                
                // 速度曲線を動画時間に同期
                this.syncSpeedCurveToVideoTime();
                
                resolve({ frames, duration });
            };
            
            tempVideo.onerror = reject;
        });
    }
    
    calculateTotalDuration() {
        return this.timelineClips.reduce((total, clip) => {
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            const clipTotalFrames = framesPerLoop * clip.loopCount;
            return total + (clipTotalFrames / 30); // 30fps基準で秒数計算
        }, 0);
    }
    
    // 速度曲線を考慮した実際の再生時間を計算
    calculateActualDuration() {
        if (!this.timelineClips || this.timelineClips.length === 0) {
            return 0;
        }
        
        return this.timelineClips.reduce((total, clip) => {
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            const clipTotalFrames = framesPerLoop * clip.loopCount;
            
            // このクリップの実際の再生時間を計算
            const clipActualDuration = this.calculateClipActualDuration(clipTotalFrames);
            return total + clipActualDuration;
        }, 0);
    }
    
    // 個別クリップの実際の再生時間を速度曲線から計算
    calculateClipActualDuration(totalFrames) {
        if (!this.speedCurvePointsWide || this.speedCurvePointsWide.length < 5) {
            return totalFrames / 30; // 速度曲線がない場合は通常速度
        }
        
        let totalTime = 0;
        const samplesPerFrame = 10; // フレーム内のサンプリング数（精度調整）
        
        for (let frame = 0; frame < totalFrames; frame++) {
            let frameTime = 0;
            
            // フレーム内を細かくサンプリングして速度を積分
            for (let sample = 0; sample < samplesPerFrame; sample++) {
                const progress = (frame + sample / samplesPerFrame) / totalFrames;
                const speed = this.getSpeedAtProgress(progress);
                frameTime += (1.0 / speed) / samplesPerFrame; // 速度の逆数が時間の倍率
            }
            
            totalTime += frameTime;
        }
        
        return totalTime / 30; // 30fpsで秒数に変換
    }
    
    updateTotalFrames() {
        // 🎬 複数動画対応: 全クリップの総フレーム数を計算
        if (!this.timelineClips || this.timelineClips.length === 0) {
            this.totalFrames = 0;
            return;
        }
        
        this.totalFrames = this.timelineClips.reduce((total, clip) => {
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            const clipTotalFrames = framesPerLoop * clip.loopCount;
            return total + clipTotalFrames;
        }, 0);
        
        // UI更新
        const totalFramesEl = document.getElementById('totalFrames');
        const totalLoopsEl = document.getElementById('totalLoops');
        
        if (totalFramesEl) totalFramesEl.textContent = this.totalFrames;
        if (totalLoopsEl) totalLoopsEl.textContent = this.timelineClips.length;
        
        console.log(`📊 Total frames: ${this.totalFrames} (${this.timelineClips.length} clips)`);
    }
    
    updateUI() {
        // プレビューオーバーレイを隠す
        document.getElementById('previewOverlay').style.display = 'none';
        
        // タイムライン情報更新
        document.getElementById('timelineInfo').textContent = 
            `${this.selectedClip.fileName} - ${this.loopCount}回ループ設定済み`;
    }
    
    renderTimeline() {
        const timelineTrack = document.getElementById('timelineTrack');
        
        if (!timelineTrack) {
            console.error('❌ Timeline track element not found');
            return;
        }
        
        console.log(`🎬 Rendering timeline with ${this.timelineClips.length} clips`);
        
        const placeholder = timelineTrack.querySelector('.timeline-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // 既存のクリップをすべて削除
        timelineTrack.querySelectorAll('.timeline-clip').forEach(clip => clip.remove());
        
        // 総時間を計算
        const totalSeconds = this.calculateTotalDuration();
        const trackWidth = timelineTrack.clientWidth - 40; // パディング分を除く
        
        let currentTime = 0;
        
        this.timelineClips.forEach((clip, index) => {
            console.log(`🎬 Processing clip ${index}: ${clip.name || clip.fileName}`, {
                frames: clip.frames?.length,
                loopCount: clip.loopCount,
                totalSeconds
            });
            
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            const clipTotalFrames = framesPerLoop * clip.loopCount;
            const clipDuration = clipTotalFrames / 30; // 秒数
            
            // 時系列での位置とサイズを計算
            const startPercent = (currentTime / totalSeconds) * 100;
            const widthPercent = (clipDuration / totalSeconds) * 100;
            
            console.log(`📊 Clip positioning: start=${startPercent.toFixed(1)}%, width=${widthPercent.toFixed(1)}%`);
            
            const timelineClip = document.createElement('div');
            timelineClip.className = 'timeline-clip';
            timelineClip.dataset.clipId = clip.id;
            timelineClip.draggable = true;
            
            timelineClip.style.left = `${startPercent}%`;
            timelineClip.style.width = `${widthPercent}%`;
            timelineClip.style.minWidth = '80px';
            
            timelineClip.innerHTML = `
                <div style="font-size: 10px; font-weight: bold;">${clip.fileName}</div>
                <div style="font-size: 8px;">Loop: ${clip.loopCount}回</div>
                <div style="font-size: 8px;">${this.formatTime(clipDuration)}</div>
            `;
            
            // ドラッグ&ドロップイベント
            this.setupTimelineClipDragAndDrop(timelineClip, index);
            
            // クリック選択
            timelineClip.addEventListener('click', () => {
                this.selectTimelineClip(index);
            });
            
            timelineTrack.appendChild(timelineClip);
            console.log(`✅ Added timeline clip to DOM: ${clip.fileName}`);
            currentTime += clipDuration;
        });
        
        console.log(`🎬 Timeline rendering complete: ${this.timelineClips.length} clips added`);
        console.log('Final timelineTrack children:', timelineTrack.children.length);
        
        // 全体時間の更新
        this.updateTotalFrames();
    }
    
    setupTimelineClipDragAndDrop(clipElement, clipIndex) {
        clipElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', clipIndex.toString());
            clipElement.style.opacity = '0.5';
        });
        
        clipElement.addEventListener('dragend', (e) => {
            clipElement.style.opacity = '1';
        });
        
        clipElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        clipElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropIndex = clipIndex;
            
            if (dragIndex !== dropIndex) {
                // 配列の要素を入れ替え
                [this.timelineClips[dragIndex], this.timelineClips[dropIndex]] = 
                [this.timelineClips[dropIndex], this.timelineClips[dragIndex]];
                
                this.renderTimeline();
                console.log(`✅ Moved clip from ${dragIndex} to ${dropIndex}`);
            }
        });
    }
    
    selectTimelineClip(index) {
        // 全クリップの選択状態をリセット
        this.timelineClips.forEach(clip => clip.selected = false);
        
        // 選択状態を設定
        this.timelineClips[index].selected = true;
        
        // 視覚的フィードバック
        document.querySelectorAll('.timeline-clip').forEach((element, i) => {
            if (i === index) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
        
        console.log(`✅ Selected timeline clip: ${this.timelineClips[index].fileName}`);
    }
    
    // 3. リアルタイム調整 - ループ数変更を即座に反映
    updateLoopSettings() {
        this.updateTotalFrames();
        this.renderTimeline();
        
        // 実際の再生時間を更新
        this.updateActualDurationDisplay();
        
        // 現在再生中なら効果を即座に反映
        if (this.isPlaying) {
            if (this.currentFrame >= this.totalFrames) {
                this.currentFrame = 0;
            }
            this.updateFrameInfo();
        }
        
        console.log('⚡ Loop settings updated in real-time');
    }
    
    // 実際の再生時間表示を更新
    updateActualDurationDisplay() {
        const originalDuration = this.calculateTotalDuration();
        const actualDuration = this.calculateActualDuration();
        
        const originalTimeEl = document.getElementById('totalTimeDisplay');
        const averageSpeedEl = document.getElementById('averageSpeedDisplay');
        
        if (originalTimeEl) {
            // 実際の再生時間を表示
            const originalText = this.formatTime(originalDuration);
            const actualText = this.formatTime(actualDuration);
            const speedRatio = (originalDuration / actualDuration).toFixed(2);
            
            originalTimeEl.textContent = actualText;
            originalTimeEl.title = `元の長さ: ${originalText} | 実際の長さ: ${actualText} | 平均速度: ${speedRatio}x`;
        }
        
        if (averageSpeedEl) {
            // 平均速度を表示
            const speedRatio = (originalDuration / actualDuration).toFixed(2);
            averageSpeedEl.textContent = `${speedRatio}x`;
            
            // 速度による色分け
            const speed = parseFloat(speedRatio);
            if (speed > 1.5) {
                averageSpeedEl.style.color = '#ff4444'; // 高速（赤）
            } else if (speed > 1.1) {
                averageSpeedEl.style.color = '#ffaa44'; // やや高速（橙）
            } else if (speed < 0.8) {
                averageSpeedEl.style.color = '#44ff44'; // 低速（緑）
            } else {
                averageSpeedEl.style.color = '#ffffff'; // 通常（白）
            }
        }
        
        console.log(`⏱️ Duration updated - Original: ${this.formatTime(originalDuration)}, Actual: ${this.formatTime(actualDuration)}, Speed: ${(originalDuration / actualDuration).toFixed(2)}x`);
    }
    
    // 4. リッチな速度曲線エディタ - 高機能ベジエ曲線制御
    setupSpeedCurveEditor() {
        console.log('🎨 Initializing rich speed curve editor...');
        
        // DOM要素の存在確認付き取得（5点制御システム）
        this.speedCurveSvg = document.getElementById('speedCurveSvg');
        this.speedCurvePath = document.getElementById('speedCurvePath');
        this.controlPoints = [
            document.getElementById('controlPoint0'), // 左端（開始点）
            document.getElementById('controlPoint1'), // 中間制御1
            document.getElementById('controlPoint2'), // 中間制御2
            document.getElementById('controlPoint3'), // 中間制御3
            document.getElementById('controlPoint4')  // 右端（終了点）
        ];
        
        // 重要な要素の存在確認
        if (!this.speedCurveSvg) {
            console.error('❌ speedCurveSvg element not found! Speed curve editor cannot initialize.');
            return;
        }
        if (!this.speedCurvePath) {
            console.error('❌ speedCurvePath element not found!');
            return;
        }
        
        let missingControlPoints = 0;
        this.controlPoints.forEach((point, index) => {
            if (!point) {
                console.error(`❌ controlPoint${index + 1} not found!`);
                missingControlPoints++;
            }
        });
        
        if (missingControlPoints > 0) {
            console.error(`❌ ${missingControlPoints}/5 control points missing! Cannot initialize curve editor.`);
            return;
        }
        
        // 精密制御入力フィールド（5点対応）
        this.precisionInputs = [
            document.getElementById('p0Speed'), // 左端
            document.getElementById('p1Speed'), // 中間1
            document.getElementById('p2Speed'), // 中間2
            document.getElementById('p3Speed'), // 中間3
            document.getElementById('p4Speed')  // 右端
        ];
        
        // リアルタイム情報パネル
        this.realtimeInfo = document.getElementById('realtimeInfo');
        this.realtimeSpeed = document.getElementById('realtimeSpeed');
        this.realtimeTime = document.getElementById('realtimeTime');
        
        // 速度曲線データの初期化（5点制御）
        this.speedCurvePoints = [
            { x: 0, y: 140, speed: 1.0 },    // 左端（開始点）
            { x: 70, y: 140, speed: 1.0 },   // 中間制御1
            { x: 140, y: 140, speed: 1.0 },  // 中間制御2
            { x: 210, y: 140, speed: 1.0 },  // 中間制御3
            { x: 280, y: 140, speed: 1.0 }   // 右端（終了点）
        ];
        
        this.initializeCurveInteractions();
        this.initializePrecisionControls();
        this.initializeCurveButtons();
        this.updateSpeedCurve();
        
        console.log('✅ Rich speed curve editor successfully initialized!');
    }
    
    // ワイド版速度曲線エディタの初期化
    setupSpeedCurveEditorWide() {
        console.log('🎨 Setting up Canvas-based speed curve editor...');
        
        // Canvas要素を取得
        this.speedCurveCanvas = document.getElementById('speedCurveCanvas');
        if (!this.speedCurveCanvas) {
            console.error('❌ Speed curve canvas not found!');
            return;
        }
        
        this.speedCurveCtx = this.speedCurveCanvas.getContext('2d');
        
        // 高DPI対応設定
        this.setupHighDPICanvas();
        
        // 速度曲線データの初期化
        this.speedCurvePoints = [
            { x: 60, y: 120 },      // 開始点 (速度1.0x)
            { x: 740, y: 120 }     // 終了点 (速度1.0x) - 800-60のマージン
        ];
        
        this.selectedPoint = null;
        this.hoveredPoint = null;
        this.isDragging = false;
        this.canvasWidth = 800;
        this.canvasHeight = 200;
        
        // イベントリスナー設定
        this.setupCanvasEventListeners();
        
        // ボタンイベント設定
        this.initializeCurveButtonsWide();
        
        // 初期描画
        this.drawSpeedCurve();
        
        console.log('✅ Canvas-based speed curve editor initialized!');
    }
    
    setupHighDPICanvas() {
        const canvas = this.speedCurveCanvas;
        const ctx = this.speedCurveCtx;
        const dpr = window.devicePixelRatio || 1;
        
        // CSS表示サイズ
        const displayWidth = 800;
        const displayHeight = 200;
        
        // 実際のキャンバスサイズ（高解像度）
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // CSS表示サイズを設定
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // 座標系をスケール
        ctx.scale(dpr, dpr);
        
        // アンチエイリアシング有効化
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 内部座標系も更新
        this.canvasWidth = displayWidth;
        this.canvasHeight = displayHeight;
        
        console.log(`High DPI Canvas setup: ${canvas.width}x${canvas.height} (DPR: ${dpr})`);
    }
    
    setupCanvasEventListeners() {
        // マウスイベント
        this.speedCurveCanvas.addEventListener('mousedown', (e) => this.onSpeedCurveMouseDown(e));
        this.speedCurveCanvas.addEventListener('mousemove', (e) => this.onSpeedCurveMouseMove(e));
        this.speedCurveCanvas.addEventListener('mouseup', (e) => this.onSpeedCurveMouseUp(e));
        this.speedCurveCanvas.addEventListener('mouseleave', (e) => this.onSpeedCurveMouseLeave(e));
        this.speedCurveCanvas.addEventListener('contextmenu', (e) => this.onSpeedCurveRightClick(e));
        
        console.log('✅ Canvas event listeners set up');
    }
    
    // Canvas描画メイン関数（参考実装から移植）
    drawSpeedCurve() {
        const ctx = this.speedCurveCtx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;
        const margin = { top: 30, right: 60, bottom: 40, left: 60 };
        const graphWidth = width - margin.left - margin.right;
        const graphHeight = height - margin.top - margin.bottom;

        // 背景をクリア
        ctx.clearRect(0, 0, width, height);

        // 背景色（テーマ対応）
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary') || '#0f0f0f';
        ctx.fillRect(0, 0, width, height);

        // グリッド描画
        ctx.save();
        ctx.translate(margin.left, margin.top);
        
        // 速度レベルのグリッド（0.1x, 0.5x, 1.0x, 1.5x, 2.0x, 2.5x, 3.0x）
        const speedLevels = [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
        speedLevels.forEach(speed => {
            const y = graphHeight - ((speed - 0.1) / 2.9) * graphHeight;
            
            // グリッド線
            const gridColor = getComputedStyle(document.body).getPropertyValue('--border-primary') || '#333';
            ctx.strokeStyle = speed === 1.0 ? '#666' : gridColor;
            ctx.lineWidth = speed === 1.0 ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(graphWidth, y);
            ctx.stroke();
            
            // 速度ラベル
            ctx.font = '10px monospace';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#ccc';
            ctx.textAlign = 'right';
            ctx.fillText(`${speed.toFixed(1)}x`, -5, y + 3);
        });
        
        ctx.restore();

        // 速度曲線を描画
        if (this.speedCurvePoints.length > 1) {
            const curveColor = getComputedStyle(document.body).getPropertyValue('--accent-color') || '#6a8fdb';
            ctx.strokeStyle = curveColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // グロー効果
            ctx.shadowColor = curveColor;
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            ctx.moveTo(this.speedCurvePoints[0].x, this.speedCurvePoints[0].y);
            
            // ベジェ曲線で滑らかに描画
            for (let i = 1; i < this.speedCurvePoints.length; i++) {
                const prev = this.speedCurvePoints[i - 1];
                const curr = this.speedCurvePoints[i];
                
                // 制御点を計算
                const cp1x = prev.x + (curr.x - prev.x) * 0.3;
                const cp1y = prev.y;
                const cp2x = curr.x - (curr.x - prev.x) * 0.3;
                const cp2y = curr.y;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
            }
            ctx.stroke();
            
            // シャドウをリセット
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        // 制御点を描画
        for (let i = 0; i < this.speedCurvePoints.length; i++) {
            const point = this.speedCurvePoints[i];
            
            // 点の状態による色分け
            let fillColor = '#666';
            let strokeColor = '#999';
            let radius = 6;
            
            if (i === this.selectedPoint) {
                fillColor = '#ef4444'; // 選択中
                strokeColor = '#dc2626';
                radius = 8;
            } else if (i === this.hoveredPoint) {
                fillColor = '#888';
                strokeColor = '#aaa';
                radius = 7;
            }
            
            // 外側のリング
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            
            // 内側の塗りつぶし
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius - 1, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    // マウス座標取得（参考実装から移植）
    getSpeedCurveMousePos(e) {
        const rect = this.speedCurveCanvas.getBoundingClientRect();
        
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        
        const x = (displayX / rect.width) * this.canvasWidth;
        const y = (displayY / rect.height) * this.canvasHeight;
        
        return { x, y };
    }
    
    // 最も近い制御点を見つける
    findNearestPoint(mousePos, threshold = 20) {
        let nearestIndex = -1;
        let nearestDistance = threshold;
        
        for (let i = 0; i < this.speedCurvePoints.length; i++) {
            const point = this.speedCurvePoints[i];
            const distance = Math.sqrt(
                Math.pow(mousePos.x - point.x, 2) + Math.pow(mousePos.y - point.y, 2)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    }
    
    // マウスダウンイベント
    onSpeedCurveMouseDown(e) {
        e.preventDefault();
        const mousePos = this.getSpeedCurveMousePos(e);
        const pointIndex = this.findNearestPoint(mousePos);

        if (pointIndex !== -1) {
            // 既存の点を選択
            this.selectedPoint = pointIndex;
            this.isDragging = true;
        } else {
            // 新しい点を追加
            const newPoint = { x: mousePos.x, y: mousePos.y };
            
            // 挿入位置を決定
            let insertIndex = this.speedCurvePoints.length;
            for (let i = 0; i < this.speedCurvePoints.length; i++) {
                if (mousePos.x < this.speedCurvePoints[i].x) {
                    insertIndex = i;
                    break;
                }
            }
            
            this.speedCurvePoints.splice(insertIndex, 0, newPoint);
            this.selectedPoint = insertIndex;
            this.isDragging = true;
            this.drawSpeedCurve();
            
            // 新しい点が追加されたらLoopEngineに反映
            this.applySpeedCurveToEngine();
        }
    }
    
    // マウス移動イベント
    onSpeedCurveMouseMove(e) {
        const mousePos = this.getSpeedCurveMousePos(e);
        
        if (this.isDragging && this.selectedPoint !== null) {
            // ドラッグ中の処理
            const margin = { left: 60, right: 60, top: 30, bottom: 40 };
            mousePos.x = Math.max(margin.left, Math.min(this.canvasWidth - margin.right, mousePos.x));
            mousePos.y = Math.max(margin.top, Math.min(this.canvasHeight - margin.bottom, mousePos.y));

            // 最初と最後の点のx座標は固定
            if (this.selectedPoint === 0) {
                this.speedCurvePoints[this.selectedPoint].y = mousePos.y;
            } else if (this.selectedPoint === this.speedCurvePoints.length - 1) {
                this.speedCurvePoints[this.selectedPoint].y = mousePos.y;
            } else {
                // 中間の点は自由に移動可能
                this.speedCurvePoints[this.selectedPoint] = { x: mousePos.x, y: mousePos.y };
                
                // x座標でソート
                this.speedCurvePoints.sort((a, b) => a.x - b.x);
                
                // 選択中の点のインデックスを更新
                for (let i = 0; i < this.speedCurvePoints.length; i++) {
                    if (Math.abs(this.speedCurvePoints[i].x - mousePos.x) < 1 && 
                        Math.abs(this.speedCurvePoints[i].y - mousePos.y) < 1) {
                        this.selectedPoint = i;
                        break;
                    }
                }
            }

            this.drawSpeedCurve();
            
            // ドラッグ中に速度曲線をリアルタイム適用
            this.applySpeedCurveToEngine();
        } else {
            // ホバー効果の処理
            const hoveredPoint = this.findNearestPoint(mousePos);
            
            if (hoveredPoint !== this.hoveredPoint) {
                this.hoveredPoint = hoveredPoint;
                this.drawSpeedCurve();
            }
            
            // カーソルの変更
            this.speedCurveCanvas.style.cursor = hoveredPoint !== -1 ? 'pointer' : 'crosshair';
        }
    }
    
    // マウスアップイベント
    onSpeedCurveMouseUp(e) {
        this.isDragging = false;
        this.selectedPoint = null;
        this.speedCurveCanvas.style.cursor = 'crosshair';
    }
    
    // マウスリーブイベント
    onSpeedCurveMouseLeave(e) {
        this.hoveredPoint = null;
        this.isDragging = false;
        this.selectedPoint = null;
        this.speedCurveCanvas.style.cursor = 'crosshair';
        this.drawSpeedCurve();
    }
    
    // 右クリックイベント（点削除）
    onSpeedCurveRightClick(e) {
        e.preventDefault();
        
        const mousePos = this.getSpeedCurveMousePos(e);
        const pointIndex = this.findNearestPoint(mousePos);

        if (pointIndex !== -1 && pointIndex !== 0 && pointIndex !== this.speedCurvePoints.length - 1) {
            // 最初と最後以外の点を削除
            this.speedCurvePoints.splice(pointIndex, 1);
            this.hoveredPoint = null;
            this.selectedPoint = null;
            this.drawSpeedCurve();
            
            // 速度曲線が変更されたらLoopEngineに反映
            this.applySpeedCurveToEngine();
            
            console.log('Point deleted successfully');
        }
        
        return false;
    }
    
    updateSpeedCurve() {
        if (!this.speedCurvePath || !this.controlPoints || !this.speedCurvePoints) return;
        
        // 5点制御での正確なベジエ曲線パスを生成
        const p0 = this.speedCurvePoints[0]; // 左端
        const p1 = this.speedCurvePoints[1]; // 中間1
        const p2 = this.speedCurvePoints[2]; // 中間2
        const p3 = this.speedCurvePoints[3]; // 中間3
        const p4 = this.speedCurvePoints[4]; // 右端
        
        // 滑らかなベジエ曲線パス（端点制御可能）
        const pathData = `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} C${p3.x},${p3.y} ${p4.x},${p4.y} ${p4.x},${p4.y}`;
        this.speedCurvePath.setAttribute('d', pathData);
        
        // コントロールポイント位置更新
        this.controlPoints.forEach((point, index) => {
            if (point && this.speedCurvePoints[index]) {
                point.setAttribute('cx', this.speedCurvePoints[index].x);
                point.setAttribute('cy', this.speedCurvePoints[index].y);
            }
        });
        
        // 制御ハンドル線を更新
        this.updateControlHandles();
        
        // 精密入力フィールド更新
        this.updatePrecisionInputs();
        
        // 速度データを生成
        this.generateSpeedDataFromBezier();
        
        console.log('⚡ Accurate speed curve updated - SVG/calculation synchronized');
    }
    
    updateControlHandles() {
        // 制御ハンドル線を更新（視覚的フィードバック向上）
        const handleLines = [
            document.getElementById('handle1Line'),
            document.getElementById('handle2Line'), 
            document.getElementById('handle3Line')
        ];
        
        handleLines.forEach((line, index) => {
            if (line && this.speedCurvePoints[index]) {
                const point = this.speedCurvePoints[index];
                line.setAttribute('x1', point.x);
                line.setAttribute('y1', 140);
                line.setAttribute('x2', point.x);
                line.setAttribute('y2', point.y);
            }
        });
    }
    
    generateSpeedDataFromBezier() {
        const steps = 100;
        this.speedCurveData = [];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = this.calculateBezierY(t);
            
            // Y座標を速度倍率に変換 (20=3.0x, 140=1.0x, 220=0.1x)
            const speed = this.yToSpeed(y);
            this.speedCurveData.push(speed);
        }
        
        console.log(`🎯 Generated ${this.speedCurveData.length} bezier curve points`);
    }
    
    resetSpeedCurve() {
        this.speedCurvePoints = [
            { x: 0, y: 140, speed: 1.0 },    // 左端リセット
            { x: 70, y: 140, speed: 1.0 },   // 中間1
            { x: 140, y: 140, speed: 1.0 },  // 中間2
            { x: 210, y: 140, speed: 1.0 },  // 中間3
            { x: 280, y: 140, speed: 1.0 }   // 右端リセット
        ];
        this.updateSpeedCurve();
        console.log('🔄 Speed curve reset to default (5-point system)');
    }
    
    // 新しい速度曲線エディタの補助関数
    initializeCurveInteractions() {
        let isDragging = false;
        let activePointIndex = -1;
        
        // コントロールポイントのドラッグ処理
        this.controlPoints.forEach((point, index) => {
            if (!point) return;
            
            point.addEventListener('mousedown', (e) => {
                isDragging = true;
                activePointIndex = index;
                point.classList.add('active');
                this.showRealtimeInfo(true);
                e.preventDefault();
            });
            
            point.addEventListener('mouseenter', () => {
                if (!isDragging) point.style.r = '10';
            });
            
            point.addEventListener('mouseleave', () => {
                if (!isDragging) point.style.r = '8';
            });
        });
        
        // グローバルマウス移動（SVG範囲外でも追従）
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || activePointIndex === -1 || !this.speedCurveSvg) return;
            
            const rect = this.speedCurveSvg.getBoundingClientRect();
            const y = Math.max(20, Math.min(220, e.clientY - rect.top));
            
            this.speedCurvePoints[activePointIndex].y = y;
            this.speedCurvePoints[activePointIndex].speed = this.yToSpeed(y);
            
            this.updateSpeedCurve();
            this.updateRealtimeInfo(activePointIndex, y);
        });
        
        // ドラッグ終了
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.controlPoints[activePointIndex]?.classList.remove('active');
                this.showRealtimeInfo(false);
                activePointIndex = -1;
            }
        });
    }
    
    initializePrecisionControls() {
        this.precisionInputs.forEach((input, index) => {
            if (!input) return;
            
            input.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                if (isNaN(speed)) return;
                
                this.speedCurvePoints[index].speed = speed;
                this.speedCurvePoints[index].y = this.speedToY(speed);
                this.updateSpeedCurve();
            });
        });
    }
    
    initializeCurveButtons() {
        const resetButton = document.getElementById('resetSpeedCurve');
        const applyButton = document.getElementById('applySpeedCurve');
        
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetSpeedCurve();
            });
        }
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                console.log('🎯 Speed curve applied to playback system');
            });
        }
    }
    
    updatePrecisionInputs() {
        this.precisionInputs.forEach((input, index) => {
            if (input && this.speedCurvePoints[index]) {
                input.value = this.speedCurvePoints[index].speed.toFixed(2);
            }
        });
    }
    
    showRealtimeInfo(show) {
        if (this.realtimeInfo) {
            this.realtimeInfo.style.opacity = show ? '1' : '0';
        }
    }
    
    updateRealtimeInfo(pointIndex, y) {
        if (!this.realtimeSpeed || !this.realtimeTime) return;
        
        const speed = this.yToSpeed(y);
        const timePercent = ((pointIndex + 1) * 33.33).toFixed(0);
        
        this.realtimeSpeed.textContent = `${speed.toFixed(1)}x`;
        this.realtimeTime.textContent = `${timePercent}%`;
    }
    
    yToSpeed(y) {
        // Y座標を速度に変換 (20=3.0x, 140=1.0x, 220=0.1x)
        const normalizedY = (y - 20) / 200; // 0-1の範囲
        const speed = 3.0 - (normalizedY * 2.9); // 3.0から0.1への逆変換
        return Math.max(0.1, Math.min(3.0, speed));
    }
    
    speedToY(speed) {
        // 速度をY座標に変換
        const normalizedSpeed = (3.0 - speed) / 2.9; // 0-1の範囲
        return 20 + (normalizedSpeed * 200);
    }
    
    calculateBezierY(t) {
        // 正確なベジエ曲線計算 - SVGパスと一致
        const p0 = { x: 0, y: 140 };    // 開始点
        const p1 = this.speedCurvePoints[0];  // 制御点1
        const p2 = this.speedCurvePoints[1];  // 制御点2  
        const p3 = this.speedCurvePoints[2];  // 制御点3
        const p4 = { x: 280, y: 140 }; // 終了点
        
        // 二次ベジエ曲線の正確な計算（SVGのQ, T命令に対応）
        if (t <= 0.5) {
            // 前半: 二次ベジエ Q(p0, p1, p2)
            const localT = t * 2; // 0-1に正規化
            const oneMinusT = 1 - localT;
            return oneMinusT * oneMinusT * p0.y + 
                   2 * oneMinusT * localT * p1.y + 
                   localT * localT * p2.y;
        } else {
            // 後半: T命令による滑らかな接続 Q(p2, p3, p4)
            const localT = (t - 0.5) * 2; // 0-1に正規化
            const oneMinusT = 1 - localT;
            return oneMinusT * oneMinusT * p2.y + 
                   2 * oneMinusT * localT * p3.y + 
                   localT * localT * p4.y;
        }
    }
    
    // 5. ループ再生 - フレームベース実装
    playLoop() {
        // 厳密な準備確認
        if (!this.isSet) {
            alert('まず動画をセットしてください');
            return;
        }
        
        if (!this.frames || !this.frames.length) {
            console.error('❌ No frames available for playback');
            return;
        }
        
        if (!this.hiddenVideo || this.hiddenVideo.readyState < 3) {
            console.error('❌ Video not ready for playback');
            return;
        }
        
        // LoopEngineを使用した再生
        if (this.loopEngine && this.loopEngine.frames && this.loopEngine.frames.length > 0) {
            // LoopEngineにデータを設定
            this.loopEngine.setLoopCount(this.loopCount);
            
            // LoopEngineで再生開始
            this.loopEngine.play();
            this.isPlaying = true;
            
            console.log('▶️ Loop playback started via LoopEngine');
        } else if (this.frames && this.frames.length > 0) {
            // フォールバック: 従来のアニメーション（従来のフレームシステム使用）
            this.isPlaying = true;
            this.lastFrameTime = performance.now();
            this.animate();
            
            console.log('▶️ Loop playback started via fallback animation');
        } else {
            console.error('❌ No frames available for playback in either LoopEngine or fallback system');
            alert('動画データがありません。再度セットしてください。');
            return;
        }
        
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
    }
    
    pauseLoop() {
        this.isPlaying = false;
        
        // LoopEngine使用時
        if (this.loopEngine) {
            this.loopEngine.pause();
            console.log('⏸️ Loop playback paused via LoopEngine');
        } else {
            // フォールバック
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            console.log('⏸️ Loop playback paused via fallback');
        }
        
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }
    
    stopLoop() {
        this.pauseLoop();
        
        // LoopEngine使用時
        if (this.loopEngine) {
            this.loopEngine.stop();
            console.log('⏹️ Loop playback stopped via LoopEngine');
        } else {
            // フォールバック
            this.currentFrame = 0;
            this.drawCurrentFrame();
            this.updateFrameInfo();
            console.log('⏹️ Loop playback stopped via fallback');
        }
    }
    
    // 6. アニメーションループ - 速度曲線を実際に適用
    animate() {
        if (!this.isPlaying) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        // 現在の速度を曲線から取得
        const progress = this.currentFrame / this.totalFrames;
        const speedIndex = Math.floor(progress * (this.speedCurveData.length - 1));
        this.currentSpeed = this.speedCurveData[speedIndex] || 1.0;
        
        // 速度を反映したフレーム進行
        const frameDuration = 1000 / 30 / this.currentSpeed; // 30fps基準
        
        if (deltaTime >= frameDuration) {
            this.currentFrame++;
            
            if (this.currentFrame >= this.totalFrames) {
                this.currentFrame = 0; // ループ
            }
            
            // 非同期処理をブロッキングしないよう、Promiseで実行
            this.drawCurrentFrame().catch(error => {
                console.warn('⚠️ Draw error in animation:', error);
            });
            this.updateFrameInfo();
            
            // タイムラインインジケーターも更新
            const currentProgress = this.currentFrame / (this.totalFrames - 1);
            this.updateSpeedCurveTimelineIndicator(currentProgress);
            
            this.lastFrameTime = now;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    async drawCurrentFrame() {
        // 厳密な存在チェック
        if (!this.frames || !this.frames.length) {
            console.warn('⚠️ No frames available');
            return;
        }
        
        if (!this.canvas || !this.ctx || !this.hiddenVideo) {
            console.warn('⚠️ Canvas elements not ready');
            return;
        }
        
        if (this.hiddenVideo.readyState < 2) {
            console.warn('⚠️ Hidden video not loaded');
            return;
        }
        
        // 🎬 複数動画結合: 現在のフレームがどの動画クリップに属するか判定
        const clipInfo = this.getClipInfoForFrame(this.currentFrame);
        if (!clipInfo) {
            console.warn('⚠️ No clip found for frame:', this.currentFrame);
            return;
        }
        
        const { clip, localFrame, isReverse } = clipInfo;
        
        // 動画を切り替える必要があるかチェック
        if (this.currentClipId !== clip.id) {
            console.log(`🔄 Switching to clip: ${clip.name} (ID: ${clip.id})`);
            this.hiddenVideo.src = clip.filePath;
            this.currentClipId = clip.id;
            
            // 動画切り替え待機
            await new Promise((resolve, reject) => {
                this.hiddenVideo.oncanplaythrough = resolve;
                this.hiddenVideo.onerror = reject;
            });
        }
        
        // ローカルフレームから時間を算出
        const sourceFrameIndex = isReverse ? 
            (clip.frames.length - 1 - (localFrame % clip.frames.length)) : 
            (localFrame % clip.frames.length);
            
        if (sourceFrameIndex >= clip.frames.length) return;
        
        const targetTime = clip.frames[sourceFrameIndex].time;
        
        try {
            // ビデオをシーク（確実な完了待機）
            if (Math.abs(this.hiddenVideo.currentTime - targetTime) > 0.03) {
                this.hiddenVideo.currentTime = targetTime;
                
                // シーク完了を確実に待機
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.warn('⚠️ Seek timeout');
                        resolve();
                    }, 100);
                    
                    this.hiddenVideo.onseeked = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                });
            }
            
            // Canvas描画エラーハンドリング追加
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 動画サイズチェック
            if (this.hiddenVideo.videoWidth === 0 || this.hiddenVideo.videoHeight === 0) {
                console.warn('⚠️ Video dimensions not ready');
                return;
            }
            
            // アスペクト比維持して描画
            const videoAspect = this.hiddenVideo.videoWidth / this.hiddenVideo.videoHeight;
            const canvasAspect = this.canvas.width / this.canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (videoAspect > canvasAspect) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / videoAspect;
                drawX = 0;
                drawY = (this.canvas.height - drawHeight) / 2;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * videoAspect;
                drawX = (this.canvas.width - drawWidth) / 2;
                drawY = 0;
            }
            
            this.ctx.drawImage(this.hiddenVideo, drawX, drawY, drawWidth, drawHeight);
            console.log(`🎨 Frame drawn: Clip(${clip.name}) Frame(${sourceFrameIndex}/${clip.frames.length}) Global(${this.currentFrame}/${this.totalFrames})`);
            
        } catch (error) {
            console.error('❌ Draw error:', error);
        }
    }
    
    getSegmentInfoForFrame(frameNum) {
        const forwardFrames = this.frames.length;
        const reverseFrames = this.frames.length - 1;
        const segmentPairFrames = forwardFrames + reverseFrames;
        
        const loopIndex = Math.floor(frameNum / segmentPairFrames);
        const frameInLoop = frameNum % segmentPairFrames;
        
        let sourceFrame;
        let isReverse;
        
        if (frameInLoop < forwardFrames) {
            // 正再生
            sourceFrame = frameInLoop;
            isReverse = false;
        } else {
            // 逆再生
            const reverseIndex = frameInLoop - forwardFrames;
            sourceFrame = forwardFrames - 1 - reverseIndex;
            isReverse = true;
        }
        
        return { sourceFrame, isReverse, loopIndex };
    }
    
    // 🎬 複数動画結合: 現在のフレームがどの動画クリップに属するかを判定
    getClipInfoForFrame(globalFrame) {
        if (!this.timelineClips || this.timelineClips.length === 0) {
            console.warn('⚠️ No timeline clips available');
            return null;
        }
        
        let currentFrame = 0;
        
        for (const clip of this.timelineClips) {
            // このクリップの総フレーム数（ループ考慮）
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            const clipTotalFrames = framesPerLoop * clip.loopCount;
            
            // グローバルフレームがこのクリップの範囲内か？
            if (globalFrame >= currentFrame && globalFrame < currentFrame + clipTotalFrames) {
                const localFrame = globalFrame - currentFrame;
                const loopIndex = Math.floor(localFrame / framesPerLoop);
                const frameInLoop = localFrame % framesPerLoop;
                
                const isReverse = frameInLoop >= forwardFrames;
                
                return {
                    clip,
                    localFrame: frameInLoop,
                    isReverse,
                    loopIndex
                };
            }
            
            currentFrame += clipTotalFrames;
        }
        
        console.warn(`⚠️ Frame ${globalFrame} not found in any clip`);
        return null;
    }
    
    updateFrameInfo() {
        const segmentInfo = this.getSegmentInfoForFrame(this.currentFrame);
        
        const currentFrameEl = document.getElementById('currentFrame');
        const currentLoopEl = document.getElementById('currentLoop');
        
        if (currentFrameEl) currentFrameEl.textContent = this.currentFrame;
        
        if (currentLoopEl && segmentInfo) {
            currentLoopEl.textContent = segmentInfo.loopIndex + 1;
        } else if (currentLoopEl) {
            currentLoopEl.textContent = '0';
        }
        
        // シークバー更新
        const progress = this.currentFrame / this.totalFrames;
        const seekbarProgress = document.getElementById('seekbarProgress');
        const seekbarThumb = document.getElementById('seekbarThumb');
        
        if (seekbarProgress) seekbarProgress.style.width = `${progress * 100}%`;
        if (seekbarThumb) seekbarThumb.style.left = `${progress * 100}%`;
        
        // タイムラインシークバー更新
        const timelineSeekbar = document.getElementById('timelineSeekbar');
        if (timelineSeekbar && this.totalFrames > 0) {
            timelineSeekbar.value = (this.currentFrame / (this.totalFrames - 1)) * 100;
        }
        
        // プレイヘッドとタイム表示を更新
        this.updatePlayhead();
        this.updateTimeDisplay();
        
        // 時間表示 + 現在の速度表示
        const currentSeconds = (this.currentFrame / 30);
        const totalSeconds = (this.totalFrames / 30);
        
        const currentTimeEl = document.getElementById('currentTimeDisplay');
        const totalTimeEl = document.getElementById('totalTimeDisplay');
        
        if (currentTimeEl) currentTimeEl.textContent = this.formatTime(currentSeconds);
        if (totalTimeEl) totalTimeEl.textContent = this.formatTime(totalSeconds);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // シークバー機能
    setupSeekbar() {
        const seekbarTrack = document.getElementById('seekbarTrack');
        const seekbarThumb = document.getElementById('seekbarThumb');
        
        let isDragging = false;
        
        // クリック・ドラッグでシーク
        seekbarTrack.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.handleSeek(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.handleSeek(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    handleSeek(e) {
        if (!this.isSet || this.timelineClips.length === 0) return;
        
        const seekbarTrack = document.getElementById('seekbarTrack');
        const rect = seekbarTrack.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        // 総フレーム数を取得
        const totalFrames = this.calculateTotalFrames();
        this.currentFrame = Math.floor(percent * totalFrames);
        
        // プレビュー更新
        this.drawCurrentFrame();
        this.updateFrameInfo();
        
        console.log(`🎯 Seeked to frame: ${this.currentFrame}/${totalFrames}`);
    }
    
    setupTimelineSeekbar() {
        const timelineSeekbar = document.getElementById('timelineSeekbar');
        if (!timelineSeekbar) return;
        
        timelineSeekbar.addEventListener('input', (e) => {
            if (this.totalFrames <= 0) return;
            
            const progress = e.target.value / 100;
            this.currentFrame = Math.floor(progress * (this.totalFrames - 1));
            this.drawCurrentFrame();
            this.updateFrameInfo();
            this.updatePlayhead();
            this.updateTimeDisplay();
            this.updateSpeedCurveTimelineIndicator(progress);
            
            console.log(`🎯 Timeline seeked to frame: ${this.currentFrame}/${this.totalFrames}`);
        });
        
        timelineSeekbar.addEventListener('change', (e) => {
            if (this.totalFrames <= 0) return;
            
            const progress = e.target.value / 100;
            this.currentFrame = Math.floor(progress * (this.totalFrames - 1));
            this.drawCurrentFrame();
            this.updateFrameInfo();
            this.updatePlayhead();
            this.updateTimeDisplay();
            this.updateSpeedCurveTimelineIndicator(progress);
        });
    }
    
    // 速度曲線エディタのタイムラインインジケーター更新
    updateSpeedCurveTimelineIndicator(progress) {
        const speedCurveSvgWide = document.getElementById('speedCurveSvgWide');
        if (!speedCurveSvgWide) return;
        
        // 既存のインジケーターを削除
        const existingIndicator = speedCurveSvgWide.querySelector('#timelineIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 新しいインジケーターを作成
        const svgRect = speedCurveSvgWide.getBoundingClientRect();
        const indicatorX = progress * this.speedCurveWidth; // SVG幅に対応
        
        const indicatorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        indicatorLine.setAttribute('id', 'timelineIndicator');
        indicatorLine.setAttribute('x1', indicatorX);
        indicatorLine.setAttribute('y1', '0');
        indicatorLine.setAttribute('x2', indicatorX);
        indicatorLine.setAttribute('y2', '160');
        indicatorLine.setAttribute('stroke', '#ffff00');
        indicatorLine.setAttribute('stroke-width', '2');
        indicatorLine.setAttribute('stroke-dasharray', '4,2');
        indicatorLine.setAttribute('opacity', '0.8');
        
        speedCurveSvgWide.appendChild(indicatorLine);
        
        // 現在の速度値を表示
        const currentSpeed = this.getSpeedAtProgress(progress);
        const speedLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        speedLabel.setAttribute('id', 'currentSpeedLabel');
        speedLabel.setAttribute('x', Math.min(indicatorX + 5, 240));
        speedLabel.setAttribute('y', '15');
        speedLabel.setAttribute('fill', '#ffff00');
        speedLabel.setAttribute('font-size', '11');
        speedLabel.setAttribute('font-family', 'Consolas');
        speedLabel.setAttribute('font-weight', 'bold');
        speedLabel.textContent = `${currentSpeed.toFixed(1)}x`;
        
        speedCurveSvgWide.appendChild(speedLabel);
    }
    
    // 進行位置での速度値を取得
    getSpeedAtProgress(progress) {
        if (!this.speedCurvePointsWide || this.speedCurvePointsWide.length < 5) {
            return 1.0;
        }
        
        const x = progress * 280; // SVG幅に対応
        
        // 5点の制御点から補間
        for (let i = 0; i < this.speedCurvePointsWide.length - 1; i++) {
            const p1 = this.speedCurvePointsWide[i];
            const p2 = this.speedCurvePointsWide[i + 1];
            
            if (x >= p1.x && x <= p2.x) {
                const ratio = (x - p1.x) / (p2.x - p1.x);
                return p1.speed + (p2.speed - p1.speed) * ratio;
            }
        }
        
        return 1.0;
    }
    
    updatePlayhead() {
        const playhead = document.getElementById('playhead');
        const timelineTrack = document.getElementById('timelineTrack');
        
        if (!playhead || !timelineTrack || this.totalFrames <= 0) return;
        
        const progress = this.currentFrame / (this.totalFrames - 1);
        const trackWidth = timelineTrack.offsetWidth - 30; // padding考慮
        const position = progress * trackWidth;
        
        playhead.style.left = `${position + 15}px`;
    }
    
    updateTimeDisplay() {
        const currentTime = this.totalFrames > 0 ? (this.currentFrame / 30).toFixed(1) : '0.0';
        const totalTime = this.totalFrames > 0 ? ((this.totalFrames - 1) / 30).toFixed(1) : '0.0';
        
        const currentDisplay = document.getElementById('currentTimeDisplay');
        const totalDisplay = document.getElementById('totalTimeDisplay');
        
        if (currentDisplay) currentDisplay.textContent = `${currentTime}s`;
        if (totalDisplay) totalDisplay.textContent = `${totalTime}s`;
    }
    
    calculateTotalFrames() {
        return this.timelineClips.reduce((total, clip) => {
            const forwardFrames = clip.frames.length;
            const reverseFrames = clip.frames.length - 1;
            const framesPerLoop = forwardFrames + reverseFrames;
            return total + (framesPerLoop * clip.loopCount);
        }, 0);
    }
    
    // キーボードショートカット
    handleKeyboardShortcut(e) {
        // Ctrl+キーの組み合わせ
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'i':
                    e.preventDefault();
                    this.importVideos();
                    break;
                case 's':
                    e.preventDefault();
                    this.setToTimeline();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetSpeedCurve();
                    break;
                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    this.deleteSelectedTimelineClip();
                    break;
            }
        } 
        // 単独キー
        else {
            switch (e.key) {
                case ' ': // スペースキー
                    e.preventDefault();
                    if (this.isPlaying) {
                        this.pauseLoop();
                    } else {
                        this.playLoop();
                    }
                    break;
                case 'Escape':
                    this.stopLoop();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekFrames(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekFrames(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustLoopCount(1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustLoopCount(-1);
                    break;
            }
        }
    }
    
    seekFrames(delta) {
        if (!this.isSet) return;
        
        const totalFrames = this.calculateTotalFrames();
        this.currentFrame = Math.max(0, Math.min(totalFrames - 1, this.currentFrame + delta));
        
        this.drawCurrentFrame();
        this.updateFrameInfo();
    }
    
    adjustLoopCount(delta) {
        const newCount = Math.max(1, Math.min(99, this.loopCount + delta));
        if (newCount !== this.loopCount) {
            this.loopCount = newCount;
            document.getElementById('loopCount').value = this.loopCount;
            
            if (this.isSet) {
                this.updateLoopSettings();
            }
        }
    }
    
    deleteSelectedTimelineClip() {
        const selectedIndex = this.timelineClips.findIndex(clip => clip.selected);
        if (selectedIndex !== -1) {
            this.timelineClips.splice(selectedIndex, 1);
            this.renderTimeline();
            
            if (this.timelineClips.length === 0) {
                this.isSet = false;
                document.getElementById('previewOverlay').style.display = 'flex';
            }
            
            console.log('🗑️ Deleted selected timeline clip');
        }
    }
    
    // 🚀 新しい速度パターンシステム
    setupNewSpeedEditor() {
        const speedPreset = document.getElementById('speedPreset');
        const customControls = document.getElementById('customSpeedControls');
        const applyButton = document.getElementById('applySpeedCurve');
        
        if (!speedPreset) return;
        
        // プリセット選択イベント
        speedPreset.addEventListener('change', (e) => {
            const preset = e.target.value;
            
            if (preset === 'custom') {
                customControls.style.display = 'block';
            } else {
                customControls.style.display = 'none';
                this.applySpeedPreset(preset);
            }
        });
        
        // カスタムスライダーイベント
        ['startSpeedSlider', 'midSpeedSlider', 'endSpeedSlider'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id.replace('Slider', 'Value'));
            
            if (slider && valueSpan) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    valueSpan.textContent = `${value.toFixed(1)}x`;
                    this.updateSpeedPreview();
                });
            }
        });
        
        // 適用ボタン
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyCustomSpeedCurve();
            });
        }
        
        // 初期プレビュー
        this.updateSpeedPreview();
    }
    
    initializeNewSpeedSystem() {
        // スピードデータを初期化
        this.currentSpeedPreset = 'linear';
        this.speedCurveData = this.generateLinearSpeedCurve();
        
        console.log('🎯 New speed system initialized');
    }
    
    applySpeedPreset(preset) {
        switch (preset) {
            case 'linear':
                this.speedCurveData = this.generateLinearSpeedCurve();
                break;
            case 'easeIn':
                this.speedCurveData = this.generateEaseInCurve();
                break;
            case 'easeOut':
                this.speedCurveData = this.generateEaseOutCurve();
                break;
            case 'easeInOut':
                this.speedCurveData = this.generateEaseInOutCurve();
                break;
            case 'bounce':
                this.speedCurveData = this.generateBounceCurve();
                break;
        }
        
        this.updateSpeedPreview();
        console.log(`⚡ Applied speed preset: ${preset}`);
    }
    
    generateLinearSpeedCurve() {
        return Array(101).fill(1.0);
    }
    
    generateEaseInCurve() {
        const curve = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            curve.push(0.3 + (t * t) * 2.7); // 0.3x から 3.0x へ
        }
        return curve;
    }
    
    generateEaseOutCurve() {
        const curve = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            curve.push(3.0 - (t * t) * 2.7); // 3.0x から 0.3x へ
        }
        return curve;
    }
    
    generateEaseInOutCurve() {
        const curve = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            if (t < 0.5) {
                curve.push(0.5 + (2 * t * t) * 2.0); // スロースタート
            } else {
                const t2 = 1 - t;
                curve.push(0.5 + (2 * t2 * t2) * 2.0); // スローフィニッシュ
            }
        }
        return curve;
    }
    
    generateBounceCurve() {
        const curve = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 1.5 + 0.5;
            curve.push(Math.min(3.0, bounce));
        }
        return curve;
    }
    
    applyCustomSpeedCurve() {
        const startSpeed = parseFloat(document.getElementById('startSpeedSlider').value);
        const midSpeed = parseFloat(document.getElementById('midSpeedSlider').value);
        const endSpeed = parseFloat(document.getElementById('endSpeedSlider').value);
        
        this.speedCurveData = [];
        
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            let speed;
            
            if (t <= 0.5) {
                // 開始から中間
                speed = startSpeed + (midSpeed - startSpeed) * (t * 2);
            } else {
                // 中間から終了
                speed = midSpeed + (endSpeed - midSpeed) * ((t - 0.5) * 2);
            }
            
            this.speedCurveData.push(Math.max(0.1, Math.min(3.0, speed)));
        }
        
        this.updateSpeedPreview();
        console.log('⚡ Applied custom speed curve');
    }
    
    updateSpeedPreview() {
        const canvas = document.getElementById('speedPreviewCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 背景をクリア
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // グリッド
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // 速度曲線を描画
        if (this.speedCurveData && this.speedCurveData.length > 0) {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < this.speedCurveData.length; i++) {
                const x = (i / (this.speedCurveData.length - 1)) * width;
                const speed = this.speedCurveData[i];
                const y = height - ((speed - 0.1) / 2.9) * height; // 0.1-3.0の範囲をcanvas高さにマッピング
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
        
        // 速度値ラベル
        ctx.fillStyle = '#ccc';
        ctx.font = '10px Arial';
        ctx.fillText('3.0x', 5, 12);
        ctx.fillText('2.0x', 5, height/2);
        ctx.fillText('1.0x', 5, height - 5);
    }
    
    // ワイド版専用関数群
    updateSpeedCurveWide() {
        if (!this.speedCurvePathWide || !this.controlPointsWide || !this.speedCurvePointsWide) return;
        
        // ワイド版ベジエ曲線パスを生成
        const p0 = this.speedCurvePointsWide[0];
        const p1 = this.speedCurvePointsWide[1];
        const p2 = this.speedCurvePointsWide[2];
        const p3 = this.speedCurvePointsWide[3];
        const p4 = this.speedCurvePointsWide[4];
        
        const pathData = `M${p0.x},${p0.y} Q${p1.x},${p1.y} ${p2.x},${p2.y} T${p3.x},${p3.y} L${p4.x},${p4.y}`;
        this.speedCurvePathWide.setAttribute('d', pathData);
        
        // コントロールポイント位置更新
        this.controlPointsWide.forEach((point, index) => {
            if (point && this.speedCurvePointsWide[index]) {
                point.setAttribute('cx', this.speedCurvePointsWide[index].x);
                point.setAttribute('cy', this.speedCurvePointsWide[index].y);
            }
        });
        
        this.updateControlHandlesWide();
        this.updatePrecisionInputsWide();
        
        // メイン速度曲線データに同期（動画編集との連動）
        this.syncMainSpeedCurve();
        
        // タイムラインと同期
        this.syncSpeedWithTimeline();
        
        // 実際の再生時間をリアルタイム更新
        this.updateActualDurationDisplay();
        
        console.log('⚡ Wide speed curve updated and synced to main playback');
    }
    
    updateControlHandlesWide() {
        const handleLines = [
            document.getElementById('handle0LineWide'),
            document.getElementById('handle1LineWide'), 
            document.getElementById('handle2LineWide'),
            document.getElementById('handle3LineWide'),
            document.getElementById('handle4LineWide')
        ];
        
        handleLines.forEach((line, index) => {
            if (line && this.speedCurvePointsWide[index]) {
                const point = this.speedCurvePointsWide[index];
                line.setAttribute('x1', point.x);
                line.setAttribute('y1', 80);
                line.setAttribute('x2', point.x);
                line.setAttribute('y2', point.y);
            }
        });
    }
    
    updatePrecisionInputsWide() {
        this.precisionInputsWide.forEach((input, index) => {
            if (input && this.speedCurvePointsWide[index]) {
                input.value = this.speedCurvePointsWide[index].speed.toFixed(2);
            }
        });
    }
    
    yToSpeedWide(y) {
        // ワイド版Y座標を速度に変換（160px高さスケール）
        const normalizedY = (y - 10) / 140; // 0-1の範囲
        const speed = 4.0 - (normalizedY * 3.9);
        return Math.max(0.1, Math.min(4.0, speed));
    }
    
    speedToYWide(speed) {
        // ワイド版速度をY座標に変換
        const normalizedSpeed = (4.0 - speed) / 3.9;
        return 10 + (normalizedSpeed * 140);
    }
    
    syncMainSpeedCurve() {
        // ワイド版の変更をメイン速度曲線に同期
        if (!this.speedCurvePointsWide) return;
        
        // ワイド版から速度データを生成
        const steps = 100;
        this.speedCurveData = [];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = this.calculateBezierYWide(t);
            const speed = this.yToSpeedWide(y);
            this.speedCurveData.push(speed);
        }
        
        console.log('🔄 Main speed curve synced from wide editor');
    }
    
    calculateBezierYWide(t) {
        // ワイド版用ベジエ計算
        const p0 = this.speedCurvePointsWide[0];
        const p1 = this.speedCurvePointsWide[1];
        const p2 = this.speedCurvePointsWide[2];
        const p3 = this.speedCurvePointsWide[3];
        const p4 = this.speedCurvePointsWide[4];
        
        if (t <= 0.5) {
            const localT = t * 2;
            const oneMinusT = 1 - localT;
            return oneMinusT * oneMinusT * p0.y + 
                   2 * oneMinusT * localT * p1.y + 
                   localT * localT * p2.y;
        } else {
            const localT = (t - 0.5) * 2;
            const oneMinusT = 1 - localT;
            return oneMinusT * oneMinusT * p2.y + 
                   2 * oneMinusT * localT * p3.y + 
                   localT * localT * p4.y;
        }
    }
    
    initializeCurveInteractionsWide() {
        let isDragging = false;
        let activePointIndex = -1;
        
        // SVG曲線エリアのクリック処理（支点追加・削除）
        if (this.speedCurveSvgWide) {
            this.speedCurveSvgWide.addEventListener('click', (e) => {
                if (isDragging) return; // ドラッグ中は無視
                
                const rect = this.speedCurveSvgWide.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = Math.max(10, Math.min(150, e.clientY - rect.top));
                
                // 左クリック: 支点追加
                if (e.button === 0) {
                    this.addSpeedPoint(x, y);
                }
                
                e.preventDefault();
            });
            
            // 右クリックコンテキストメニュー無効化
            this.speedCurveSvgWide.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
        
        // 制御点のイベント処理
        this.controlPointsWide.forEach((point, index) => {
            if (!point) return;
            
            // 左クリック: ドラッグ開始
            point.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // 左クリック
                    isDragging = true;
                    activePointIndex = index;
                    point.classList.add('active');
                    document.body.style.cursor = 'grabbing';
                    e.preventDefault();
                    e.stopPropagation(); // 親要素のクリックイベント防止
                }
            });
            
            // 右クリック: 支点削除
            point.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.removeSpeedPoint(index);
                e.stopPropagation();
            });
            
            point.addEventListener('mouseenter', () => {
                if (!isDragging) {
                    point.setAttribute('r', '8');
                    document.body.style.cursor = 'grab';
                }
            });
            
            point.addEventListener('mouseleave', () => {
                if (!isDragging) {
                    point.setAttribute('r', '6');
                    document.body.style.cursor = 'default';
                }
            });
        });
        
        // ドラッグ処理
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || activePointIndex === -1 || !this.speedCurveSvgWide) return;
            
            const rect = this.speedCurveSvgWide.getBoundingClientRect();
            const x = Math.max(0, Math.min(this.speedCurveWidth, e.clientX - rect.left));
            const y = Math.max(10, Math.min(150, e.clientY - rect.top));
            
            // X座標の制約（隣接点との重複回避）
            const constrainedX = this.constrainPointPosition(activePointIndex, x);
            
            this.speedCurvePointsWide[activePointIndex].x = constrainedX;
            this.speedCurvePointsWide[activePointIndex].y = y;
            this.speedCurvePointsWide[activePointIndex].speed = this.yToSpeedWide(y);
            
            this.updateSpeedCurveWide();
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (this.controlPointsWide[activePointIndex]) {
                    this.controlPointsWide[activePointIndex].classList.remove('active');
                    this.controlPointsWide[activePointIndex].setAttribute('r', '6');
                }
                document.body.style.cursor = 'default';
                activePointIndex = -1;
            }
        });
    }
    
    // 支点追加
    addSpeedPoint(x, y) {
        const speed = this.yToSpeedWide(y);
        const newPoint = { x, y, speed };
        
        // 挿入位置を決定（X座標でソート）
        let insertIndex = this.speedCurvePointsWide.length;
        for (let i = 0; i < this.speedCurvePointsWide.length; i++) {
            if (x < this.speedCurvePointsWide[i].x) {
                insertIndex = i;
                break;
            }
        }
        
        this.speedCurvePointsWide.splice(insertIndex, 0, newPoint);
        this.regenerateSpeedCurveElements();
        this.updateSpeedCurveWide();
        
        console.log(`✨ Speed point added at x:${x.toFixed(1)}, speed:${speed.toFixed(2)}x`);
    }
    
    // 支点削除
    removeSpeedPoint(index) {
        // 最低3点は保持
        if (this.speedCurvePointsWide.length <= 3) {
            console.warn('⚠️ Cannot remove point: minimum 3 points required');
            return;
        }
        
        this.speedCurvePointsWide.splice(index, 1);
        this.regenerateSpeedCurveElements();
        this.updateSpeedCurveWide();
        
        console.log(`🗑️ Speed point removed from index ${index}`);
    }
    
    // 点の位置制約（隣接点との重複回避）
    constrainPointPosition(index, x) {
        const margin = 10; // 最小間隔
        let constrainedX = x;
        
        // 左隣の制約
        if (index > 0) {
            const leftX = this.speedCurvePointsWide[index - 1].x;
            constrainedX = Math.max(constrainedX, leftX + margin);
        }
        
        // 右隣の制約
        if (index < this.speedCurvePointsWide.length - 1) {
            const rightX = this.speedCurvePointsWide[index + 1].x;
            constrainedX = Math.min(constrainedX, rightX - margin);
        }
        
        return constrainedX;
    }
    
    // 速度曲線要素の再生成
    regenerateSpeedCurveElements() {
        // 既存の制御点を削除
        const existingPoints = this.speedCurveSvgWide.querySelectorAll('.control-point-wide');
        existingPoints.forEach(point => point.remove());
        
        // 制御ハンドル線も削除
        const existingHandles = this.speedCurveSvgWide.querySelectorAll('#controlHandlesWide line');
        existingHandles.forEach(handle => handle.remove());
        
        // 新しい制御点を生成
        this.controlPointsWide = [];
        const controlPointsGroup = this.speedCurveSvgWide.querySelector('#controlPointsWide') || 
                                   this.speedCurveSvgWide.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
        controlPointsGroup.setAttribute('id', 'controlPointsWide');
        
        this.speedCurvePointsWide.forEach((point, index) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('id', `controlPoint${index}Wide`);
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#4CAF50');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('cursor', 'move');
            circle.classList.add('control-point-wide');
            circle.setAttribute('data-speed', point.speed.toFixed(2));
            
            // 端点は赤色
            if (index === 0 || index === this.speedCurvePointsWide.length - 1) {
                circle.setAttribute('fill', '#ff6b6b');
                circle.setAttribute('stroke', '#ffffff');
                circle.classList.add('endpoint');
            }
            
            controlPointsGroup.appendChild(circle);
            this.controlPointsWide.push(circle);
        });
        
        // 精密制御入力フィールドも再生成
        this.regeneratePrecisionInputs();
        
        // イベントリスナーを再設定（重複回避）
        this.cleanupCurveInteractions();
        this.initializeCurveInteractionsWide();
        this.initializePrecisionControlsWide();
    }
    
    // イベントリスナーの重複回避
    cleanupCurveInteractions() {
        // 既存のイベントリスナーを削除
        if (this.curveInteractionHandler) {
            document.removeEventListener('mousemove', this.curveInteractionHandler);
            document.removeEventListener('mouseup', this.curveInteractionHandler);
        }
    }
    
    // 精密制御入力フィールドの再生成
    regeneratePrecisionInputs() {
        const precisionPanel = document.querySelector('.precision-values-wide');
        if (!precisionPanel) return;
        
        // 既存の入力フィールドをクリア
        precisionPanel.innerHTML = '';
        this.precisionInputsWide = [];
        
        // 新しい入力フィールドを生成
        this.speedCurvePointsWide.forEach((point, index) => {
            const valueItem = document.createElement('div');
            valueItem.className = 'value-item-wide';
            
            const label = document.createElement('label');
            label.textContent = `P${index}:`;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `p${index}SpeedWide`;
            input.min = '0.1';
            input.max = '4.0';
            input.step = '0.05';
            input.value = point.speed.toFixed(2);
            
            const span = document.createElement('span');
            span.textContent = 'x';
            
            valueItem.appendChild(label);
            valueItem.appendChild(input);
            valueItem.appendChild(span);
            precisionPanel.appendChild(valueItem);
            
            this.precisionInputsWide.push(input);
        });
    }
    
    initializePrecisionControlsWide() {
        this.precisionInputsWide.forEach((input, index) => {
            if (!input) return;
            
            input.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                if (isNaN(speed)) return;
                
                this.speedCurvePointsWide[index].speed = speed;
                this.speedCurvePointsWide[index].y = this.speedToYWide(speed);
                this.updateSpeedCurveWide();
            });
        });
    }
    
    initializeCurveButtonsWide() {
        const resetButton = document.getElementById('resetSpeedCurveWide');
        
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetSpeedCurveWide();
                this.updateActualDurationDisplay(); // リセット後の時間を再計算
                console.log('🔄 Speed curve reset - automatically applied to playback');
            });
        }
    }
    
    resetSpeedCurveWide() {
        this.speedCurvePoints = [
            { x: 60, y: 120 },      // 開始点 (速度1.0x)
            { x: 740, y: 120 }     // 終了点 (速度1.0x)
        ];
        this.drawSpeedCurve();
        
        // リセット後にLoopEngineに反映
        this.applySpeedCurveToEngine();
        
        console.log('🔄 Canvas speed curve reset to default');
    }
    
    // Canvas速度曲線データをLoopEngineに適用
    applySpeedCurveToEngine() {
        if (!this.loopEngine || !this.speedCurvePoints || this.speedCurvePoints.length < 2) {
            console.log('⚠️ LoopEngine not available or insufficient speed curve data');
            return;
        }
        
        // Canvasの座標系から速度値に変換して配列データを生成
        const speedData = this.generateSpeedDataFromCanvas();
        
        // LoopEngineに速度曲線データを設定
        this.loopEngine.setSpeedCurve(speedData);
        
        console.log('🎯 Speed curve applied to LoopEngine:', speedData.length, 'data points');
    }
    
    // Canvas座標から速度データ配列を生成
    generateSpeedDataFromCanvas() {
        const dataPoints = 100; // 100ポイントの配列データを生成
        const speedData = [];
        
        const margin = { left: 60, right: 60, top: 30, bottom: 40 };
        const graphWidth = this.canvasWidth - margin.left - margin.right;
        const graphHeight = this.canvasHeight - margin.top - margin.bottom;
        
        // x軸に沿って等間隔で速度値をサンプリング
        for (let i = 0; i < dataPoints; i++) {
            const progress = i / (dataPoints - 1); // 0.0 ～ 1.0
            const x = margin.left + progress * graphWidth;
            
            // ベジエ曲線上の対応する速度値を計算
            const speed = this.getSpeedAtX(x);
            speedData.push(speed);
        }
        
        return speedData;
    }
    
    // 指定されたx座標での速度値を計算（ベジエ補間）
    getSpeedAtX(targetX) {
        if (!this.speedCurvePoints || this.speedCurvePoints.length < 2) {
            return 1.0;
        }
        
        // 制御点をx座標でソート
        const sortedPoints = [...this.speedCurvePoints].sort((a, b) => a.x - b.x);
        
        // targetXが範囲外の場合は端の値を返す
        if (targetX <= sortedPoints[0].x) {
            return this.yToSpeed(sortedPoints[0].y);
        }
        if (targetX >= sortedPoints[sortedPoints.length - 1].x) {
            return this.yToSpeed(sortedPoints[sortedPoints.length - 1].y);
        }
        
        // 線形補間で近似値を計算
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const p1 = sortedPoints[i];
            const p2 = sortedPoints[i + 1];
            
            if (targetX >= p1.x && targetX <= p2.x) {
                const t = (targetX - p1.x) / (p2.x - p1.x);
                const y = p1.y + (p2.y - p1.y) * t;
                return this.yToSpeed(y);
            }
        }
        
        return 1.0;
    }
    
    // y座標から速度値に変換
    yToSpeed(y) {
        const margin = { top: 30, bottom: 40 };
        const graphHeight = this.canvasHeight - margin.top - margin.bottom;
        
        // y座標を速度値に変換（上が速い、下が遅い）
        const normalizedY = (this.canvasHeight - margin.bottom - y) / graphHeight;
        const speed = 0.1 + normalizedY * 2.9; // 0.1x ～ 3.0x
        
        return Math.max(0.1, Math.min(3.0, speed));
    }
    
    // === タイムライン・速度曲線同期システム ===
    setupTimelineSpeedSync() {
        console.log('🔗 Setting up timeline-speed curve synchronization...');
        
        // タイムライン内の速度曲線要素を初期化
        this.speedCurveTimeline = document.getElementById('speedCurveTimeline');
        this.speedPathTimeline = document.getElementById('speedPathTimeline');
        this.speedAreaTimeline = document.getElementById('speedAreaTimeline');
        
        if (!this.speedCurveTimeline || !this.speedPathTimeline) {
            console.error('❌ Timeline speed curve elements not found!');
            return;
        }
        
        // 初期同期実行
        this.syncSpeedWithTimeline();
        
        console.log('✅ Timeline-speed curve sync initialized');
    }
    
    syncSpeedWithTimeline() {
        if (!this.speedPathTimeline || !this.speedAreaTimeline) return;
        
        // 現在の速度曲線データを取得（ワイド版から）
        const speedData = this.getTimelineSpeedData();
        
        // タイムライン内の速度曲線パスを更新
        const pathData = this.generateTimelineSpeedPath(speedData);
        this.speedPathTimeline.setAttribute('d', pathData);
        
        // 速度エリアも更新
        const areaData = this.generateTimelineSpeedArea(speedData);
        this.speedAreaTimeline.setAttribute('d', areaData);
        
        // タイムラインの実際の長さを計算して更新
        this.updateTimelineDuration(speedData);
        
        console.log('🔄 Timeline synchronized with speed curve');
    }
    
    getTimelineSpeedData() {
        // ワイド版速度曲線から100点のデータを生成
        const points = [];
        const steps = 100;
        
        if (!this.speedCurvePointsWide) {
            // デフォルト値（1.0倍速）
            for (let i = 0; i <= steps; i++) {
                points.push(1.0);
            }
            return points;
        }
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = this.calculateBezierYWide(t);
            const speed = this.yToSpeedWide(y);
            points.push(speed);
        }
        
        return points;
    }
    
    generateTimelineSpeedPath(speedData) {
        const height = 60; // タイムライン速度レーンの高さ
        const width = 100; // パーセンテージ幅
        const baseY = height / 2; // 1.0x速度の基準線
        
        let pathData = `M0,${baseY}`;
        
        speedData.forEach((speed, index) => {
            const x = (index / (speedData.length - 1)) * width;
            // 速度を視覚的な高さに変換（1.0x = 中央、4.0x = 上端、0.1x = 下端）
            const speedY = baseY - ((speed - 1.0) / 3.0) * (baseY - 5);
            const clampedY = Math.max(5, Math.min(height - 5, speedY));
            
            if (index === 0) {
                pathData += ` L${x},${clampedY}`;
            } else {
                pathData += ` L${x},${clampedY}`;
            }
        });
        
        return pathData;
    }
    
    generateTimelineSpeedArea(speedData) {
        const height = 60;
        const width = 100;
        const baseY = height / 2;
        
        let areaData = `M0,${baseY}`;
        
        // 上部パス
        speedData.forEach((speed, index) => {
            const x = (index / (speedData.length - 1)) * width;
            const speedY = baseY - ((speed - 1.0) / 3.0) * (baseY - 5);
            const clampedY = Math.max(5, Math.min(height - 5, speedY));
            areaData += ` L${x},${clampedY}`;
        });
        
        // 底部パス（塗りつぶし用）
        areaData += ` L${width},${height} L0,${height} Z`;
        
        return areaData;
    }
    
    updateTimelineDuration(speedData) {
        if (!this.selectedClip || !this.totalFrames) return;
        
        // 速度曲線を適用した実際の再生時間を計算
        let totalAdjustedFrames = 0;
        const frameRate = 30; // 30fps想定
        
        speedData.forEach(speed => {
            // 各セグメントでのフレーム時間を速度で調整
            totalAdjustedFrames += 1.0 / speed;
        });
        
        const originalDuration = this.totalFrames / frameRate;
        const adjustedDuration = (totalAdjustedFrames * this.totalFrames / speedData.length) / frameRate;
        
        // タイムライン表示を更新
        const totalTimeDisplay = document.getElementById('totalTimeDisplay');
        if (totalTimeDisplay) {
            const minutes = Math.floor(adjustedDuration / 60);
            const seconds = Math.floor(adjustedDuration % 60);
            totalTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // 平均速度を計算・表示
        const averageSpeed = speedData.reduce((sum, speed) => sum + speed, 0) / speedData.length;
        const averageSpeedDisplay = document.getElementById('averageSpeedDisplay');
        if (averageSpeedDisplay) {
            averageSpeedDisplay.textContent = `${averageSpeed.toFixed(1)}x`;
        }
        
        console.log(`⏱️ Timeline duration updated: ${originalDuration.toFixed(1)}s → ${adjustedDuration.toFixed(1)}s (avg: ${averageSpeed.toFixed(1)}x)`);
    }
    
    // === 動画時間軸同期システム ===
    setupVideoTimelineSync() {
        console.log('⏰ Setting up video-timeline synchronization...');
        // 動画ロード時に自動実行される
    }
    
    syncSpeedCurveToVideoTime() {
        if (!this.selectedClip || !this.videoDuration) {
            console.warn('⚠️ No video loaded for timeline sync');
            return;
        }
        
        // ピクセル/秒の計算 - タイムライン全体の幅を使用
        const timelineWidth = document.getElementById('timeline')?.offsetWidth || 800;
        this.pixelsPerSecond = timelineWidth / this.videoDuration;
        this.speedCurveWidth = timelineWidth;
        
        // 速度曲線SVGの幅を更新（まず基本機能を優先）
        // this.updateSpeedCurveSvgWidth(); // 一時的に無効化して基本機能を復旧
        
        // タイムラインルーラーの更新
        this.updateTimelineRuler();
        
        // 速度曲線の制御点を動画時間に基づいて再配置
        this.redistributeSpeedPoints();
        
        // 時間軸ラベル更新
        this.updateTimeAxisLabels();
        
        // シークバーの最大値も動画尺に合わせる
        this.updateTimelineSeekbar();
        
        console.log(`⏰ Timeline synced to video: ${this.videoDuration.toFixed(2)}s = ${timelineWidth}px (${this.pixelsPerSecond.toFixed(2)}px/s)`);
    }
    
    updateSpeedCurveSvgWidth() {
        const speedCurveSvgWide = document.getElementById('speedCurveSvgWide');
        if (!speedCurveSvgWide) return;
        
        // SVG要素の幅を動画尺に合わせて更新
        speedCurveSvgWide.setAttribute('width', this.speedCurveWidth);
        speedCurveSvgWide.setAttribute('viewBox', `0 0 ${this.speedCurveWidth} 160`);
        
        // 背景要素も幅を更新
        const bgRect = speedCurveSvgWide.querySelector('rect');
        if (bgRect) {
            bgRect.setAttribute('width', this.speedCurveWidth);
        }
        
        // グリッドパターンのpattern要素の幅を更新
        const fineGrid = speedCurveSvgWide.querySelector('#fineGridWide');
        const majorGrid = speedCurveSvgWide.querySelector('#majorGridWide');
        
        // すべての線要素の幅を更新
        const lines = speedCurveSvgWide.querySelectorAll('line');
        lines.forEach(line => {
            if (line.getAttribute('x2') === '100%' || line.getAttribute('x2') === '280') {
                line.setAttribute('x2', this.speedCurveWidth);
            }
        });
        
        // 速度曲線パス自体を更新
        const speedPath = speedCurveSvgWide.querySelector('#speedCurvePathWide');
        if (speedPath && this.speedCurvePointsWide) {
            this.updateSpeedCurveWide();
        }
        
        console.log(`📐 Speed curve SVG width updated: ${this.speedCurveWidth}px`);
    }
    
    updateTimelineRuler() {
        const rulerMarkers = document.getElementById('rulerMarkers');
        if (!rulerMarkers || !this.videoDuration) return;
        
        rulerMarkers.innerHTML = '';
        
        // 動画尺に基づいて時間マーカーを生成
        const markerInterval = Math.max(1, Math.floor(this.videoDuration / 10)); // 最大10個程度のマーカー
        const timelineWidth = this.speedCurveWidth || 800;
        
        for (let time = 0; time <= this.videoDuration; time += markerInterval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.position = 'absolute';
            marker.style.left = `${(time / this.videoDuration) * 100}%`;
            marker.style.height = '100%';
            marker.style.borderLeft = '1px solid var(--border-secondary)';
            marker.style.fontSize = '10px';
            marker.style.color = 'var(--text-tertiary)';
            marker.textContent = `${time.toFixed(1)}s`;
            rulerMarkers.appendChild(marker);
        }
        
        console.log(`📏 Timeline ruler updated: ${this.videoDuration.toFixed(2)}s with ${Math.ceil(this.videoDuration / markerInterval)} markers`);
    }
    
    updateTimelineSeekbar() {
        const seekbar = document.getElementById('timelineSeekbar');
        if (!seekbar || !this.videoDuration) return;
        
        // シークバーの最大値を動画時間（秒）×100に設定（0.01秒精度）
        seekbar.max = Math.floor(this.videoDuration * 100);
        seekbar.step = 1; // 0.01秒単位
        
        // 時間表示の更新
        document.getElementById('totalTimeDisplay').textContent = this.formatTime(this.videoDuration);
        
        console.log(`⏰ Timeline seekbar updated: max=${seekbar.max} (${this.videoDuration.toFixed(2)}s)`);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    
    redistributeSpeedPoints() {
        if (!this.speedCurvePointsWide) return;
        
        const pointCount = this.speedCurvePointsWide.length;
        
        // 制御点を動画時間に等間隔で配置（speedCurveWidthに基づく）
        for (let i = 0; i < pointCount; i++) {
            const xPosition = (i / (pointCount - 1)) * this.speedCurveWidth;
            this.speedCurvePointsWide[i].x = xPosition;
            
            // DOM要素も更新
            const pointElement = document.getElementById(`controlPoint${i}Wide`);
            if (pointElement) {
                pointElement.setAttribute('cx', xPosition);
            }
        }
        
        // ベジエ曲線パスも更新
        this.updateSpeedCurveWide();
        
        console.log(`🔄 Speed points redistributed across ${this.speedCurveWidth}px width`);
    }
    
    updateTimeAxisLabels() {
        // SVG内の時間軸ラベルを動画時間で更新
        const speedCurveSvg = document.getElementById('speedCurveSvgWide');
        if (!speedCurveSvg) return;
        
        // 既存の時間ラベル削除
        const existingLabels = speedCurveSvg.querySelectorAll('.time-label');
        existingLabels.forEach(label => label.remove());
        
        // 新しい時間ラベル生成（5つの時点）
        for (let i = 0; i <= 4; i++) {
            const timePosition = (i / 4) * this.videoDuration;
            const pixelPosition = timePosition * this.pixelsPerSecond;
            
            const timeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            timeLabel.setAttribute('x', pixelPosition);
            timeLabel.setAttribute('y', '155');
            timeLabel.setAttribute('fill', '#b0b0b0');
            timeLabel.setAttribute('font-size', '9');
            timeLabel.setAttribute('font-family', 'Consolas');
            timeLabel.setAttribute('text-anchor', 'middle');
            timeLabel.classList.add('time-label');
            timeLabel.textContent = `${timePosition.toFixed(1)}s`;
            
            speedCurveSvg.appendChild(timeLabel);
        }
    }
    
    pixelToTime(pixelX) {
        if (this.pixelsPerSecond === 0) return 0;
        return pixelX / this.pixelsPerSecond;
    }
    
    timeToPixel(timeSeconds) {
        return timeSeconds * this.pixelsPerSecond;
    }
    
    // === タイムラインクリップ選択・削除システム ===
    setupTimelineClipSelection() {
        console.log('🎯 Setting up timeline clip selection system...');
        // 動的に追加されるクリップの選択処理は setToTimeline() で実装
    }
    
    setupTimelineDeleteButtons() {
        const deleteBtn = document.getElementById('deleteSelectedClip');
        const clearBtn = document.getElementById('clearTimeline');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteSelectedClip();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearTimeline();
            });
        }
        
        console.log('🗑️ Timeline delete buttons initialized');
    }
    
    selectClip(clipIndex) {
        // 既存選択を解除
        this.deselectAllClips();
        
        // 新しいクリップを選択
        this.selectedClipIndex = clipIndex;
        
        if (clipIndex >= 0 && clipIndex < this.timelineClips.length) {
            const clipElement = document.querySelector(`[data-clip-index="${clipIndex}"]`);
            if (clipElement) {
                clipElement.classList.add('selected');
            }
            
            // 削除ボタンを有効化
            const deleteBtn = document.getElementById('deleteSelectedClip');
            if (deleteBtn) {
                deleteBtn.disabled = false;
            }
            
            console.log(`📍 Clip ${clipIndex} selected: ${this.timelineClips[clipIndex]?.name || 'Unknown'}`);
        }
    }
    
    deselectAllClips() {
        const selectedClips = document.querySelectorAll('.timeline-clip.selected');
        selectedClips.forEach(clip => clip.classList.remove('selected'));
        
        this.selectedClipIndex = -1;
        
        // 削除ボタンを無効化
        const deleteBtn = document.getElementById('deleteSelectedClip');
        if (deleteBtn) {
            deleteBtn.disabled = true;
        }
    }
    
    deleteSelectedClip() {
        if (this.selectedClipIndex === -1 || this.selectedClipIndex >= this.timelineClips.length) {
            console.warn('⚠️ No clip selected for deletion');
            return;
        }
        
        const clipToDelete = this.timelineClips[this.selectedClipIndex];
        
        // クリップをタイムラインから削除
        this.timelineClips.splice(this.selectedClipIndex, 1);
        
        // DOM要素も削除
        const clipElement = document.querySelector(`[data-clip-index="${this.selectedClipIndex}"]`);
        if (clipElement) {
            clipElement.remove();
        }
        
        // インデックスを再調整
        this.reindexTimelineClips();
        
        // 選択状態をリセット
        this.deselectAllClips();
        
        // タイムライン表示を更新
        this.updateTimelineInfo();
        
        // 削除されたクリップが現在再生中の場合は停止
        if (this.selectedClip === clipToDelete.videoElement) {
            this.stopLoop();
            this.selectedClip = null;
            this.isSet = false;
        }
        
        console.log(`🗑️ Clip deleted: ${clipToDelete.name}`);
        
        // タイムラインが空になった場合
        if (this.timelineClips.length === 0) {
            this.showTimelinePlaceholder();
        }
    }
    
    clearTimeline() {
        if (this.timelineClips.length === 0) {
            console.warn('⚠️ Timeline is already empty');
            return;
        }
        
        // 確認ダイアログ
        if (!confirm(`タイムライン上の全クリップ（${this.timelineClips.length}個）を削除しますか？`)) {
            return;
        }
        
        // 全クリップをクリア
        this.timelineClips = [];
        
        // DOM要素をクリア
        const timelineTrack = document.getElementById('timelineTrack');
        if (timelineTrack) {
            // プレイヘッドとプレースホルダー以外を削除
            const clipsToRemove = timelineTrack.querySelectorAll('.timeline-clip');
            clipsToRemove.forEach(clip => clip.remove());
        }
        
        // 選択状態をリセット
        this.deselectAllClips();
        
        // 再生停止
        this.stopLoop();
        this.selectedClip = null;
        this.isSet = false;
        
        // プレースホルダー表示
        this.showTimelinePlaceholder();
        
        // タイムライン情報更新
        this.updateTimelineInfo();
        
        console.log('🔄 Timeline cleared - all clips removed');
    }
    
    reindexTimelineClips() {
        const clipElements = document.querySelectorAll('.timeline-clip');
        clipElements.forEach((clipElement, newIndex) => {
            clipElement.setAttribute('data-clip-index', newIndex.toString());
        });
    }
    
    showTimelinePlaceholder() {
        const placeholder = document.querySelector('.timeline-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
    
    hideTimelinePlaceholder() {
        const placeholder = document.querySelector('.timeline-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }
    
    updateTimelineInfo() {
        const timelineInfo = document.getElementById('timelineInfo');
        if (timelineInfo) {
            if (this.timelineClips.length === 0) {
                timelineInfo.textContent = 'セット待機中...';
            } else {
                timelineInfo.textContent = `${this.timelineClips.length}クリップ セット済み`;
            }
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    window.loooopApp = new LOOOOPApp();
    console.log('🚀 LOOOOP App started - Real-time implementation ready!');
});