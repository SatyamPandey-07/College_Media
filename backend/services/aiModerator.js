const Filter = require('bad-words');
const Queue = require('bull');
const logger = require('../utils/logger');
const ModerationService = require('./moderationService');
const Post = require('../models/Post');

// Initialize Queue
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const moderationQueue = new Queue('ai-moderation', REDIS_URL);

// Text Filter
const filter = new Filter();

class AIModerator {
    /**
     * Queue content for AI analysis
     * @param {string} contentId - ID of Post/Comment
     * @param {string} type - 'Post' or 'Comment'
     * @param {string} text - Text content
     * @param {string} [imageUrl] - Optional image URL
     */
    static async scan(contentId, type, text, imageUrl) {
        try {
            await moderationQueue.add({
                contentId,
                type,
                text,
                imageUrl
            });
            logger.info(`Queued ${type} ${contentId} for AI moderation`);
        } catch (error) {
            logger.error('Failed to queue for AI moderation:', error);
        }
    }

    /**
     * Analyze Text
     * Returns { flagged: boolean, score: number, reasons: [] }
     */
    static analyzeText(text) {
        if (!text) return { flagged: false, score: 0, reasons: [] };

        const flagged = filter.isProfane(text);
        const score = flagged ? 0.9 : 0.05; // Confidence score

        return {
            flagged,
            score,
            reasons: flagged ? ['profanity'] : []
        };
    }

    /**
     * Analyze Image (Mock Implementation of Cloud Vision/NSFWJS)
     * In production, call actual API here.
     */
    static async analyzeImage(imageUrl) {
        if (!imageUrl) return { flagged: false, score: 0 };

        // Simulation: Flag images with 'nsfw' in filename for testing
        const isSuspicious = imageUrl.toLowerCase().includes('nsfw');

        // Simulate async API call
        await new Promise(r => setTimeout(r, 500));

        return {
            flagged: isSuspicious,
            score: isSuspicious ? 0.95 : 0.01,
            reasons: isSuspicious ? ['explicit_content'] : []
        };
    }
}

// Process Queue
moderationQueue.process(async (job) => {
    const { contentId, type, text, imageUrl } = job.data;

    try {
        logger.info(`AI scanning ${type} ${contentId}...`);

        const textResult = AIModerator.analyzeText(text);
        const imageResult = await AIModerator.analyzeImage(imageUrl);

        const isFlagged = textResult.flagged || imageResult.flagged;
        const confidence = Math.max(textResult.score, imageResult.score);
        const reasons = [...textResult.reasons, ...imageResult.reasons];

        if (isFlagged) {
            logger.warn(`AI Flagged ${type} ${contentId} (Confidence: ${confidence})`);

            // Auto-Flag via ModerationService
            await ModerationService.createReport({
                reporterId: null, // System report
                targetType: type,
                targetId: contentId,
                reason: 'AI_DETECTED_VIOLATION',
                description: `AI Detected: ${reasons.join(', ')} (Confidence: ${confidence})`,
                status: confidence > 0.9 ? 'resolved' : 'pending' // Auto-resolve (remove) if very confident
            });

            // If extremely confident, auto-hide content immediately
            if (confidence > 0.9) {
                if (type === 'Post') {
                    await Post.findByIdAndUpdate(contentId, {
                        visibility: 'removed',
                        moderationStatus: 'rejected'
                    });
                    logger.info(`AI Auto-Removed ${type} ${contentId}`);
                }
            }
        }
    } catch (error) {
        logger.error(`AI Analysis failed for ${job.id}:`, error);
    }
});

module.exports = AIModerator;
