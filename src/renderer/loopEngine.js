// LOOOOP ループ動画エンジン - フレームベース制御
class LoopEngine {
    constructor(canvas, hiddenVideo) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hiddenVideo = hiddenVideo;
        
        // フレーム管理
        this.frames = [];
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.fps = 30;
        
        // ループ設定
        this.loopCount = 3;
        this.isPlaying = false;
        this.animationId = null;
        this.lastFrameTime = 0;
        
        // 速度曲線
        this.speedCurveData = [];
        this.currentSpeed = 1.0;
        
        // コールバック
        this.onFrameUpdate = null;
        this.onPlaybackEnd = null;
    }
    
    // 動画を読み込んでフレーム抽出
    async loadVideo(videoPath) {
        return new Promise((resolve, reject) => {
            this.hiddenVideo.src = videoPath;
            
            this.hiddenVideo.onloadedmetadata = () => {
                const duration = this.hiddenVideo.duration;
                const frameCount = Math.floor(duration * this.fps);
                
                console.log(`Video loaded: ${frameCount} frames (${duration}s @ ${this.fps}fps)`);
                
                // フレーム配列を初期化（実際のフレームデータは遅延読み込み）
                this.frames = new Array(frameCount).fill(null).map((_, i) => ({
                    index: i,
                    time: i / this.fps,
                    loaded: false
                }));
                
                this.updateTotalFrames();
                resolve(frameCount);
            };
            
            this.hiddenVideo.onerror = (e) => {
                reject(new Error('Failed to load video: ' + e));
            };
        });
    }
    
    // 総フレーム数を計算（ループ適用後）
    updateTotalFrames() {
        if (!this.frames.length) {
            this.totalFrames = 0;
            return;
        }
        
        // 正再生 + 逆再生 = 1ループ
        const forwardFrames = this.frames.length;
        const reverseFrames = this.frames.length - 1; // 最後のフレームは共有
        const framesPerLoop = forwardFrames + reverseFrames;
        
        this.totalFrames = framesPerLoop * this.loopCount;
        
        console.log(`Total frames: ${this.totalFrames} (${this.loopCount} loops × ${framesPerLoop} frames/loop)`);
    }
    
    // 現在のフレームに対応するソース動画のフレームを取得
    getSegmentInfoForFrame(frameNum) {
        const forwardFrames = this.frames.length;
        const reverseFrames = this.frames.length - 1;
        const segmentPairFrames = forwardFrames + reverseFrames;
        
        // どのループの何フレーム目か
        const loopIndex = Math.floor(frameNum / segmentPairFrames);
        const frameInLoop = frameNum % segmentPairFrames;
        
        let sourceFrame;
        let isReverse;
        
        if (frameInLoop < forwardFrames) {
            // 正再生セグメント
            sourceFrame = frameInLoop;
            isReverse = false;
        } else {
            // 逆再生セグメント
            const reverseIndex = frameInLoop - forwardFrames;
            sourceFrame = forwardFrames - 1 - reverseIndex;
            isReverse = true;
        }
        
        return {
            sourceFrame,
            isReverse,
            loopIndex,
            progress: frameNum / this.totalFrames
        };
    }
    
    // 指定フレームを描画
    async drawFrame(frameNum) {
        if (!this.frames.length) return;
        
        const segmentInfo = this.getSegmentInfoForFrame(frameNum);
        const sourceFrame = this.frames[segmentInfo.sourceFrame];
        
        if (!sourceFrame) return;
        
        // ビデオのシーク
        const targetTime = sourceFrame.time;
        if (Math.abs(this.hiddenVideo.currentTime - targetTime) > 0.1) {
            this.hiddenVideo.currentTime = targetTime;
            await new Promise(resolve => {
                this.hiddenVideo.onseeked = resolve;
            });
        }
        
        // Canvasに描画
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // アスペクト比を保持して描画
        const videoAspect = this.hiddenVideo.videoWidth / this.hiddenVideo.videoHeight;
        const canvasAspect = this.canvas.width / this.canvas.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (videoAspect > canvasAspect) {
            // ビデオの方が横長
            drawWidth = this.canvas.width;
            drawHeight = drawWidth / videoAspect;
            drawX = 0;
            drawY = (this.canvas.height - drawHeight) / 2;
        } else {
            // ビデオの方が縦長
            drawHeight = this.canvas.height;
            drawWidth = drawHeight * videoAspect;
            drawX = (this.canvas.width - drawWidth) / 2;
            drawY = 0;
        }
        
        this.ctx.drawImage(this.hiddenVideo, drawX, drawY, drawWidth, drawHeight);
        
        // デバッグ情報
        if (this.showDebugInfo) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`Frame: ${frameNum}/${this.totalFrames}`, 10, 20);
            this.ctx.fillText(`Loop: ${segmentInfo.loopIndex + 1}/${this.loopCount}`, 10, 35);
            this.ctx.fillText(segmentInfo.isReverse ? 'Reverse' : 'Forward', 10, 50);
        }
    }
    
    // 再生制御
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }
    
    pause() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    stop() {
        this.pause();
        this.currentFrame = 0;
        this.drawFrame(0);
        
        if (this.onFrameUpdate) {
            this.onFrameUpdate(this.currentFrame, this.totalFrames);
        }
    }
    
    // アニメーションループ
    animate() {
        if (!this.isPlaying) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        // 速度を考慮したフレーム進行
        const frameDuration = 1000 / this.fps / this.getCurrentSpeed();
        
        if (deltaTime >= frameDuration) {
            this.currentFrame++;
            
            if (this.currentFrame >= this.totalFrames) {
                this.currentFrame = 0;
                
                if (this.onPlaybackEnd) {
                    this.onPlaybackEnd();
                }
            }
            
            this.drawFrame(this.currentFrame);
            
            if (this.onFrameUpdate) {
                this.onFrameUpdate(this.currentFrame, this.totalFrames);
            }
            
            this.lastFrameTime = now;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // 現在の速度を取得
    getCurrentSpeed() {
        if (!this.speedCurveData || !this.speedCurveData.length) {
            return 1.0;
        }
        
        const progress = this.currentFrame / this.totalFrames;
        const index = Math.floor(progress * (this.speedCurveData.length - 1));
        
        return this.speedCurveData[index] || 1.0;
    }
    
    // シーク
    seek(frameNum) {
        this.currentFrame = Math.max(0, Math.min(frameNum, this.totalFrames - 1));
        this.drawFrame(this.currentFrame);
        
        if (this.onFrameUpdate) {
            this.onFrameUpdate(this.currentFrame, this.totalFrames);
        }
    }
    
    // ループ回数設定
    setLoopCount(count) {
        this.loopCount = count;
        this.updateTotalFrames();
        
        // 現在のフレームが範囲外になったらリセット
        if (this.currentFrame >= this.totalFrames) {
            this.currentFrame = 0;
        }
    }
    
    // 速度曲線設定
    setSpeedCurve(curveData) {
        this.speedCurveData = curveData;
    }
    
    // デバッグモード
    setDebugMode(enabled) {
        this.showDebugInfo = enabled;
        if (!this.isPlaying) {
            this.drawFrame(this.currentFrame);
        }
    }
}

export default LoopEngine;