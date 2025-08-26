const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.projectPath = null;
        this.defaultSettings = {
            version: '1.0.0',
            resolution: '1920x1080',
            bitrate: 10000000,
            fps: 30,
            autoSaveInterval: 300000, // 5分
            maxLoopCount: 99
        };
    }
    
    /**
     * 新しいプロジェクトを作成
     * @param {string} projectName - プロジェクト名
     * @returns {Object} 新しいプロジェクト
     */
    createNewProject(projectName = 'Untitled Project') {
        const now = new Date().toISOString();
        
        this.currentProject = {
            version: '1.0.0',
            projectName: projectName,
            createdAt: now,
            modifiedAt: now,
            timeline: [],
            mediaPool: [],
            outputSettings: {
                resolution: this.defaultSettings.resolution,
                bitrate: this.defaultSettings.bitrate,
                fps: this.defaultSettings.fps
            },
            preferences: {
                autoSave: true,
                previewQuality: 'medium',
                gpuAcceleration: true
            }
        };
        
        this.projectPath = null;
        return this.currentProject;
    }
    
    /**
     * プロジェクトファイルを保存（BOM付きUTF-8）
     * @param {string} filePath - 保存先パス
     * @returns {Promise<boolean>} 成功/失敗
     */
    async saveProject(filePath = null) {
        if (!this.currentProject) {
            throw new Error('No project to save');
        }
        
        const savePath = filePath || this.projectPath;
        if (!savePath) {
            throw new Error('No file path specified');
        }
        
        try {
            // プロジェクトの更新日時を設定
            this.currentProject.modifiedAt = new Date().toISOString();
            
            // BOM付きUTF-8でファイルを保存
            const BOM = '\uFEFF';
            const jsonString = JSON.stringify(this.currentProject, null, 2);
            fs.writeFileSync(savePath, BOM + jsonString, 'utf8');
            
            this.projectPath = savePath;
            console.log(`Project saved to: ${savePath}`);
            return true;
            
        } catch (error) {
            console.error('Failed to save project:', error);
            throw error;
        }
    }
    
    /**
     * プロジェクトファイルを読み込み（BOM対応）
     * @param {string} filePath - 読み込むファイルパス
     * @returns {Promise<Object>} プロジェクトデータ
     */
    async loadProject(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // BOMが存在する場合は除去
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            
            const projectData = JSON.parse(content);
            
            // プロジェクトデータの検証
            this.validateProjectData(projectData);
            
            this.currentProject = projectData;
            this.projectPath = filePath;
            
            console.log(`Project loaded from: ${filePath}`);
            return this.currentProject;
            
        } catch (error) {
            console.error('Failed to load project:', error);
            throw error;
        }
    }
    
    /**
     * プロジェクトデータの整合性を検証
     * @param {Object} projectData - 検証するプロジェクトデータ
     */
    validateProjectData(projectData) {
        const requiredFields = ['version', 'projectName', 'timeline', 'outputSettings'];
        
        for (const field of requiredFields) {
            if (!projectData.hasOwnProperty(field)) {
                throw new Error(`Invalid project file: missing field '${field}'`);
            }
        }
        
        // バージョン互換性チェック
        if (projectData.version !== this.defaultSettings.version) {
            console.warn(`Project version mismatch: ${projectData.version} vs ${this.defaultSettings.version}`);
            // 必要に応じてマイグレーション処理を実行
        }
        
        // タイムラインデータの検証
        if (!Array.isArray(projectData.timeline)) {
            throw new Error('Invalid project file: timeline must be an array');
        }
        
        return true;
    }
    
    /**
     * メディアクリップをプロジェクトに追加
     * @param {string} filePath - メディアファイルのパス
     * @param {Object} metadata - メディアのメタデータ
     * @returns {Object} 追加されたクリップ
     */
    addMediaClip(filePath, metadata = {}) {
        if (!this.currentProject) {
            throw new Error('No project loaded');
        }
        
        const clipId = uuidv4();
        const fileName = path.basename(filePath);
        
        const clip = {
            id: clipId,
            sourcePath: filePath,
            fileName: fileName,
            duration: metadata.duration || 0,
            width: metadata.width || 1920,
            height: metadata.height || 1080,
            fps: metadata.fps || 30,
            addedAt: new Date().toISOString(),
            thumbnailPath: metadata.thumbnailPath || null
        };
        
        if (!this.currentProject.mediaPool) {
            this.currentProject.mediaPool = [];
        }
        
        this.currentProject.mediaPool.push(clip);
        this.markProjectAsModified();
        
        return clip;
    }
    
    /**
     * タイムラインクリップを追加
     * @param {string} mediaClipId - メディアクリップのID
     * @param {Object} timelineOptions - タイムライン設定
     * @returns {Object} タイムラインクリップ
     */
    addTimelineClip(mediaClipId, timelineOptions = {}) {
        if (!this.currentProject) {
            throw new Error('No project loaded');
        }
        
        // メディアクリップの存在確認
        const mediaClip = this.currentProject.mediaPool?.find(clip => clip.id === mediaClipId);
        if (!mediaClip) {
            throw new Error(`Media clip not found: ${mediaClipId}`);
        }
        
        const timelineClipId = uuidv4();
        const {
            startTime = 0,
            loopCount = 3,
            speedCurve = [
                { time: 0.0, speed: 1.0 },
                { time: 1.0, speed: 1.0 }
            ]
        } = timelineOptions;
        
        const timelineClip = {
            id: timelineClipId,
            mediaClipId: mediaClipId,
            startTime: startTime,
            loopCount: Math.max(1, Math.min(this.defaultSettings.maxLoopCount, loopCount)),
            speedCurve: {
                points: speedCurve,
                interpolation: 'linear' // 将来的に 'cubic' も対応
            },
            addedAt: new Date().toISOString()
        };
        
        this.currentProject.timeline.push(timelineClip);
        this.markProjectAsModified();
        
        return timelineClip;
    }
    
    /**
     * タイムラインクリップを更新
     * @param {string} timelineClipId - タイムラインクリップのID
     * @param {Object} updates - 更新内容
     * @returns {Object} 更新されたクリップ
     */
    updateTimelineClip(timelineClipId, updates) {
        if (!this.currentProject) {
            throw new Error('No project loaded');
        }
        
        const clipIndex = this.currentProject.timeline.findIndex(
            clip => clip.id === timelineClipId
        );
        
        if (clipIndex === -1) {
            throw new Error(`Timeline clip not found: ${timelineClipId}`);
        }
        
        // 安全な更新（許可されたフィールドのみ）
        const allowedUpdates = ['loopCount', 'speedCurve', 'startTime'];
        const safeUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates.hasOwnProperty(key)) {
                safeUpdates[key] = updates[key];
            }
        }
        
        // ループ回数の範囲チェック
        if (safeUpdates.loopCount) {
            safeUpdates.loopCount = Math.max(1, Math.min(this.defaultSettings.maxLoopCount, safeUpdates.loopCount));
        }
        
        Object.assign(this.currentProject.timeline[clipIndex], safeUpdates);
        this.markProjectAsModified();
        
        return this.currentProject.timeline[clipIndex];
    }
    
    /**
     * タイムラインクリップを削除
     * @param {string} timelineClipId - 削除するクリップのID
     * @returns {boolean} 削除成功/失敗
     */
    removeTimelineClip(timelineClipId) {
        if (!this.currentProject) {
            throw new Error('No project loaded');
        }
        
        const initialLength = this.currentProject.timeline.length;
        this.currentProject.timeline = this.currentProject.timeline.filter(
            clip => clip.id !== timelineClipId
        );
        
        const removed = this.currentProject.timeline.length < initialLength;
        if (removed) {
            this.markProjectAsModified();
        }
        
        return removed;
    }
    
    /**
     * プロジェクトの合計再生時間を計算
     * @returns {number} 合計時間（秒）
     */
    calculateTotalDuration() {
        if (!this.currentProject || !this.currentProject.timeline.length) {
            return 0;
        }
        
        let totalDuration = 0;
        
        for (const timelineClip of this.currentProject.timeline) {
            const mediaClip = this.currentProject.mediaPool?.find(
                clip => clip.id === timelineClip.mediaClipId
            );
            
            if (mediaClip) {
                // 正再生＋逆再生 × ループ回数
                const loopDuration = mediaClip.duration * 2 * timelineClip.loopCount;
                totalDuration += loopDuration;
            }
        }
        
        return totalDuration;
    }
    
    /**
     * プロジェクトを変更済みとしてマーク
     */
    markProjectAsModified() {
        if (this.currentProject) {
            this.currentProject.modifiedAt = new Date().toISOString();
        }
    }
    
    /**
     * 出力設定を更新
     * @param {Object} settings - 新しい出力設定
     */
    updateOutputSettings(settings) {
        if (!this.currentProject) {
            throw new Error('No project loaded');
        }
        
        const allowedSettings = ['resolution', 'bitrate', 'fps'];
        const safeSettings = {};
        
        for (const key of allowedSettings) {
            if (settings.hasOwnProperty(key)) {
                safeSettings[key] = settings[key];
            }
        }
        
        Object.assign(this.currentProject.outputSettings, safeSettings);
        this.markProjectAsModified();
    }
    
    /**
     * プロジェクト情報を取得
     * @returns {Object} プロジェクト情報
     */
    getProjectInfo() {
        if (!this.currentProject) {
            return null;
        }
        
        return {
            name: this.currentProject.projectName,
            filePath: this.projectPath,
            createdAt: this.currentProject.createdAt,
            modifiedAt: this.currentProject.modifiedAt,
            mediaCount: this.currentProject.mediaPool?.length || 0,
            timelineCount: this.currentProject.timeline.length,
            totalDuration: this.calculateTotalDuration(),
            outputSettings: this.currentProject.outputSettings
        };
    }
    
    /**
     * オートセーブの実行
     * @returns {Promise<boolean>} 成功/失敗
     */
    async autoSave() {
        if (!this.currentProject || !this.projectPath) {
            return false;
        }
        
        try {
            // バックアップファイルとして保存
            const backupPath = this.projectPath.replace(/\.loooop$/, '.loooop.backup');
            await this.saveProject(backupPath);
            
            console.log('Auto-save completed');
            return true;
            
        } catch (error) {
            console.error('Auto-save failed:', error);
            return false;
        }
    }
}

module.exports = ProjectManager;