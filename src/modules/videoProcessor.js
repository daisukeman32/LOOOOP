const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class VideoProcessor {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ensureTempDir();
        
        // FFmpegのパスを設定（開発時はシステムのFFmpegを使用）
        const ffmpegPath = path.join(__dirname, '../../ffmpeg/ffmpeg.exe');
        if (fs.existsSync(ffmpegPath)) {
            ffmpeg.setFfmpegPath(ffmpegPath);
        }
    }
    
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    
    /**
     * 動画の基本情報を取得
     * @param {string} inputPath - 入力動画のパス
     * @returns {Promise<Object>} 動画情報
     */
    async getVideoInfo(inputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                if (!videoStream) {
                    reject(new Error('Video stream not found'));
                    return;
                }
                
                const info = {
                    duration: parseFloat(metadata.format.duration),
                    width: videoStream.width,
                    height: videoStream.height,
                    fps: this.parseFPS(videoStream.r_frame_rate),
                    bitrate: parseInt(metadata.format.bit_rate) || 0,
                    format: metadata.format.format_name,
                    codec: videoStream.codec_name
                };
                
                resolve(info);
            });
        });
    }
    
    parseFPS(frameRate) {
        if (typeof frameRate === 'string' && frameRate.includes('/')) {
            const [numerator, denominator] = frameRate.split('/').map(Number);
            return numerator / denominator;
        }
        return parseFloat(frameRate) || 30;
    }
    
    /**
     * サムネイル画像を生成
     * @param {string} inputPath - 入力動画のパス
     * @param {number} timeSeconds - 取得する時間（秒）
     * @returns {Promise<string>} サムネイル画像のパス
     */
    async generateThumbnail(inputPath, timeSeconds = 1) {
        const thumbnailPath = path.join(this.tempDir, `thumb_${uuidv4()}.jpg`);
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .seekInput(timeSeconds)
                .frames(1)
                .size('240x180')
                .output(thumbnailPath)
                .on('end', () => {
                    resolve(thumbnailPath);
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run();
        });
    }
    
    /**
     * 低解像度プロキシ動画を生成（リアルタイムプレビュー用）
     * @param {string} inputPath - 入力動画のパス
     * @param {Object} options - 変換オプション
     * @returns {Promise<string>} プロキシ動画のパス
     */
    async generateProxyVideo(inputPath, options = {}) {
        const proxyPath = path.join(this.tempDir, `proxy_${uuidv4()}.mp4`);
        
        const {
            width = 640,
            height = 360,
            bitrate = '1000k',
            fps = 30
        } = options;
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .size(`${width}x${height}`)
                .videoBitrate(bitrate)
                .fps(fps)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .output(proxyPath)
                .on('progress', (progress) => {
                    console.log(`Proxy generation progress: ${progress.percent}%`);
                })
                .on('end', () => {
                    resolve(proxyPath);
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run();
        });
    }
    
    /**
     * ループ動画を生成（正再生→逆再生のパターン）
     * @param {string} inputPath - 入力動画のパス
     * @param {Object} loopOptions - ループオプション
     * @returns {Promise<string>} ループ動画のパス
     */
    async generateLoopVideo(inputPath, loopOptions) {
        const {
            loopCount = 3,
            speedCurve = [{ time: 0, speed: 1 }, { time: 1, speed: 1 }],
            outputOptions = {}
        } = loopOptions;
        
        const loopPath = path.join(this.tempDir, `loop_${uuidv4()}.mp4`);
        
        try {
            // 1. 基本動画情報を取得
            const videoInfo = await this.getVideoInfo(inputPath);
            
            // 2. 速度曲線に基づいてセグメントを生成
            const segments = await this.createSpeedSegments(inputPath, speedCurve, videoInfo);
            
            // 3. 正再生と逆再生のセグメントを作成
            const forwardSegments = segments;
            const reverseSegments = await this.createReverseSegments(segments);
            
            // 4. ループパターンを組み立て
            const loopSegments = [];
            for (let i = 0; i < loopCount; i++) {
                loopSegments.push(...forwardSegments);
                loopSegments.push(...reverseSegments);
            }
            
            // 5. セグメントを結合してループ動画を生成
            await this.concatenateSegments(loopSegments, loopPath, outputOptions);
            
            // 6. 一時ファイルをクリーンアップ
            this.cleanupSegments(segments.concat(reverseSegments));
            
            return loopPath;
            
        } catch (error) {
            console.error('Error generating loop video:', error);
            throw error;
        }
    }
    
    /**
     * 速度曲線に基づいてセグメントを作成
     */
    async createSpeedSegments(inputPath, speedCurve, videoInfo) {
        const segments = [];
        const segmentCount = 10; // 曲線を10セグメントに分割
        
        for (let i = 0; i < segmentCount; i++) {
            const startTime = (i / segmentCount) * videoInfo.duration;
            const endTime = ((i + 1) / segmentCount) * videoInfo.duration;
            const progress = i / (segmentCount - 1);
            
            // 速度曲線から現在の速度を計算
            const speed = this.interpolateSpeedCurve(speedCurve, progress);
            
            const segmentPath = await this.createSegmentWithSpeed(
                inputPath, 
                startTime, 
                endTime, 
                speed
            );
            
            segments.push(segmentPath);
        }
        
        return segments;
    }
    
    /**
     * 速度曲線から指定位置の速度を補間
     */
    interpolateSpeedCurve(speedCurve, progress) {
        // 線形補間（将来的にベジェ曲線補間に拡張）
        for (let i = 0; i < speedCurve.length - 1; i++) {
            const current = speedCurve[i];
            const next = speedCurve[i + 1];
            
            if (progress >= current.time && progress <= next.time) {
                const t = (progress - current.time) / (next.time - current.time);
                return current.speed + (next.speed - current.speed) * t;
            }
        }
        
        return speedCurve[speedCurve.length - 1].speed;
    }
    
    /**
     * 指定された速度でセグメントを作成
     */
    async createSegmentWithSpeed(inputPath, startTime, endTime, speed) {
        const segmentPath = path.join(this.tempDir, `segment_${uuidv4()}.mp4`);
        const duration = endTime - startTime;
        
        return new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath)
                .seekInput(startTime)
                .duration(duration)
                .output(segmentPath);
            
            // 速度変更フィルターを適用
            if (speed !== 1.0) {
                const videoFilter = `setpts=${(1/speed).toFixed(3)}*PTS`;
                const audioFilter = `atempo=${speed.toFixed(3)}`;
                
                command = command
                    .videoFilters(videoFilter)
                    .audioFilters(audioFilter);
            }
            
            command
                .on('end', () => {
                    resolve(segmentPath);
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run();
        });
    }
    
    /**
     * 逆再生セグメントを作成
     */
    async createReverseSegments(forwardSegments) {
        const reverseSegments = [];
        
        // 順序を逆にして逆再生セグメントを作成
        for (let i = forwardSegments.length - 1; i >= 0; i--) {
            const reversePath = await this.reverseSegment(forwardSegments[i]);
            reverseSegments.push(reversePath);
        }
        
        return reverseSegments;
    }
    
    /**
     * セグメントを逆再生に変換
     */
    async reverseSegment(segmentPath) {
        const reversePath = path.join(this.tempDir, `reverse_${uuidv4()}.mp4`);
        
        return new Promise((resolve, reject) => {
            ffmpeg(segmentPath)
                .videoFilters('reverse')
                .audioFilters('areverse')
                .output(reversePath)
                .on('end', () => {
                    resolve(reversePath);
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run();
        });
    }
    
    /**
     * セグメントを結合
     */
    async concatenateSegments(segments, outputPath, options = {}) {
        const {
            resolution = '1920x1080',
            bitrate = '10000k',
            fps = 30
        } = options;
        
        // 結合リストファイルを作成
        const listPath = path.join(this.tempDir, `concat_${uuidv4()}.txt`);
        const listContent = segments.map(segment => `file '${segment}'`).join('\n');
        fs.writeFileSync(listPath, listContent);
        
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(listPath)
                .inputOptions('-f concat')
                .inputOptions('-safe 0')
                .size(resolution)
                .videoBitrate(bitrate)
                .fps(fps)
                .videoCodec('libx264')
                .audioCodec('aac')
                .output(outputPath)
                .on('progress', (progress) => {
                    console.log(`Concatenation progress: ${progress.percent}%`);
                })
                .on('end', () => {
                    // リストファイルを削除
                    fs.unlinkSync(listPath);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    // エラー時もリストファイルを削除
                    if (fs.existsSync(listPath)) {
                        fs.unlinkSync(listPath);
                    }
                    reject(err);
                })
                .run();
        });
    }
    
    /**
     * 一時セグメントファイルをクリーンアップ
     */
    cleanupSegments(segments) {
        segments.forEach(segmentPath => {
            if (fs.existsSync(segmentPath)) {
                try {
                    fs.unlinkSync(segmentPath);
                } catch (error) {
                    console.warn(`Failed to cleanup segment: ${segmentPath}`, error);
                }
            }
        });
    }
    
    /**
     * 一時ディレクトリをクリーンアップ
     */
    cleanupTempDir() {
        if (fs.existsSync(this.tempDir)) {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                const filePath = path.join(this.tempDir, file);
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    console.warn(`Failed to cleanup temp file: ${filePath}`, error);
                }
            });
        }
    }
}

module.exports = VideoProcessor;