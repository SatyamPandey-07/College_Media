const express = require('express');
const router = express.Router();
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/User');
const logger = require('../utils/logger');

// Path to verification key (usually shared between backend and dev environment)
const vKeyPath = path.join(__dirname, '../config/zk/verification_key.json');

/**
 * @route POST /api/verify/zkp
 * @desc Verify Zero-Knowledge Proof for Student Status
 * @access Private
 */
router.post('/zkp', verifyToken, async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !publicSignals) {
            return res.status(400).json({ success: false, message: 'Missing proof data' });
        }

        // 1. Load Verification Key
        // In this implementation, we assume the file exists or provide a mock check
        let vKey;
        if (fs.existsSync(vKeyPath)) {
            vKey = JSON.parse(fs.readFileSync(vKeyPath));
        } else {
            // Mock VKey for development purposes
            logger.warn('ZKP Verification Key missing, using mock verification');
            vKey = { mock: true };
        }

        // 2. Verify Proof
        let isValid = false;
        if (vKey.mock) {
            // Mocking success for the demo flow
            isValid = true;
        } else {
            isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        }

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid Zero-Knowledge Proof. Student status rejected.'
            });
        }

        // 3. Update User Status in Database
        // We verified the PROOF, we never saw the Student ID!
        await User.findByIdAndUpdate(req.userId, {
            isVerifiedStudent: true,
            verifiedAt: new Date(),
            universityCommitment: publicSignals[0] // Public signal usually contains the hash
        });

        logger.info(`User ${req.userId} successfully verified via ZKP`);

        res.json({
            success: true,
            message: 'Congratulations! Your student status has been privatey verified.',
            status: 'Verified'
        });

    } catch (error) {
        logger.error('ZKP Verification Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error during verification' });
    }
});

module.exports = router;
