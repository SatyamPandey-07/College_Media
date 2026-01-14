const otplib = require('otplib');
const qrcode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User'); // We'll update User model to have mfaSecret
const logger = require('../utils/logger');

// Configure authenticator
otplib.authenticator.options = {
    step: 30,
    window: 1
};

class MFAService {
    /**
     * Generate MFA Secret and QR Code
     */
    static async generateSecret(userId, email) {
        try {
            const secret = otplib.authenticator.generateSecret();
            const otpauth = otplib.authenticator.keyuri(email, 'College Media', secret);
            const qrCodeUrl = await qrcode.toDataURL(otpauth);

            return {
                secret,
                qrCodeUrl,
                otpauth
            };
        } catch (error) {
            logger.error('MFA Secret generation error:', error);
            throw error;
        }
    }

    /**
     * Verify Token
     */
    static verifyToken(token, secret) {
        try {
            return otplib.authenticator.verify({ token, secret });
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate Backup Codes
     */
    static generateBackupCodes(count = 10) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase()); // 8-char codes
        }
        return codes;
    }

    /**
     * Enable MFA for user
     */
    static async enableMFA(userId, secret, token) {
        // Verify one last time
        const isValid = this.verifyToken(token, secret);
        if (!isValid) throw new Error('Invalid OTP token');

        const backupCodes = this.generateBackupCodes();

        // Update user
        await User.findByIdAndUpdate(userId, {
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            backupCodes: backupCodes
        });

        return { backupCodes };
    }

    /**
     * Authenticate with MFA (OTP or Backup Code)
     */
    static async authenticate(user, token) {
        if (!user.twoFactorEnabled || !user.twoFactorSecret) return true; // MFA not enabled

        // 1. Try TOTP
        const isValidOTP = this.verifyToken(token, user.twoFactorSecret);
        if (isValidOTP) return true;

        // 2. Try Backup Codes
        if (user.backupCodes && user.backupCodes.includes(token)) {
            // Remove used backup code
            await User.findByIdAndUpdate(user._id, {
                $pull: { backupCodes: token }
            });
            return true;
        }

        return false;
    }
}

module.exports = MFAService;
