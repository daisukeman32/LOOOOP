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
        
        // Canvas/Video要素
        this.canvas = null;
        this.ctx = null;
        this.hiddenVideo = null;
        this.frames = [];
        
        // 速度制御
        this.speedCurveData = [];
        this.currentSpeed = 1.0;
        
        // アニメーション
        this.animationId = null;
        this.lastFrameTime = 0;
        
        this.init();
    }
    
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeedCurveEditor();
        this.initializeNewSpeedSystem();
        console.log('🚀 LOOOOP App initialized with speed curve editor');
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
        this.setupSeekbar();
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
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
        
        files.forEach(file => {
            const clipElement = this.createMediaClipElement(file);
            mediaPool.insertBefore(clipElement, importArea);
        });
        
        console.log(`✅ Added ${files.length} videos with thumbnails to media pool`);
    }
    
    createMediaClipElement(file) {
        const clip = document.createElement('div');
        clip.className = 'media-clip';
        clip.dataset.filePath = file.path || URL.createObjectURL(file);
        
        // サムネ生成
        const video = document.createElement('video');
        video.src = clip.dataset.filePath;
        video.muted = true;
        video.preload = 'metadata';
        
        video.addEventListener('loadedmetadata', () => {
            video.currentTime = Math.min(1, video.duration / 2); // 中間地点をサムネに
        });
        
        video.addEventListener('seeked', () => {
            const thumbnailCanvas = document.createElement('canvas');
            const aspectRatio = video.videoWidth / video.videoHeight;
            
            // 適切なサムネイルサイズを計算
            if (aspectRatio > 1.6) { // 横長動画
                thumbnailCanvas.width = 200;
                thumbnailCanvas.height = Math.round(200 / aspectRatio);
            } else { // 正方形や縦長動画
                thumbnailCanvas.height = 90;
                thumbnailCanvas.width = Math.round(90 * aspectRatio);
            }
            
            const thumbCtx = thumbnailCanvas.getContext('2d');
            thumbCtx.drawImage(video, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            clip.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${thumbnailCanvas.toDataURL()}" alt="thumbnail">
                </div>
                <div class="clip-name">${file.name}</div>
            `;
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
                
                const frames = Array.from({length: frameCount}, (_, i) => ({
                    index: i,
                    time: i / fps
                }));
                
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
        document.getElementById('totalFrames').textContent = this.totalFrames;
        document.getElementById('totalLoops').textContent = this.timelineClips.length;
        
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
        
        // 現在再生中なら効果を即座に反映
        if (this.isPlaying) {
            if (this.currentFrame >= this.totalFrames) {
                this.currentFrame = 0;
            }
            this.updateFrameInfo();
        }
        
        console.log('⚡ Loop settings updated in real-time');
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
        
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        
        this.animate();
        console.log('▶️ Loop playback started');
    }
    
    pauseLoop() {
        this.isPlaying = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
        
        console.log('⏸️ Loop playback paused');
    }
    
    stopLoop() {
        this.pauseLoop();
        this.currentFrame = 0;
        this.drawCurrentFrame();
        this.updateFrameInfo();
        
        console.log('⏹️ Loop playback stopped');
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
        
        document.getElementById('currentFrame').textContent = this.currentFrame;
        document.getElementById('currentLoop').textContent = segmentInfo.loopIndex + 1;
        
        // シークバー更新
        const progress = this.currentFrame / this.totalFrames;
        document.getElementById('seekbarProgress').style.width = `${progress * 100}%`;
        document.getElementById('seekbarThumb').style.left = `${progress * 100}%`;
        
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
        document.getElementById('timeDisplay').textContent = 
            `${this.formatTime(currentSeconds)} / ${this.formatTime(totalSeconds)} (${this.currentSpeed.toFixed(1)}x)`;
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
        });
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
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    window.loooopApp = new LOOOOPApp();
    console.log('🚀 LOOOOP App started - Real-time implementation ready!');
});