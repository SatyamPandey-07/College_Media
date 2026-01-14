const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'college_media_secret_key';

// Middleware (In real app, import from middleware folder)
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * @swagger
 * /api/geo/posts:
 *   get:
 *     summary: Find posts nearby (Geo-Discovery)
 *     tags: [Geo]
 */
router.get('/posts', verifyToken, async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // Default 5km

        if (!lat || !lng) return res.status(400).json({ success: false, message: 'Missing lat/lng' });

        const posts = await Post.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            },
            visibility: { $in: ['public', 'followers'] },
            isDeleted: false
        })
            .limit(50)
            .populate('user', 'username profilePicture firstName lastName');

        res.json({ success: true, count: posts.length, data: posts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/geo/users:
 *   get:
 *     summary: Find nearby users
 *     tags: [Geo]
 */
router.get('/users', verifyToken, async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query;

        if (!lat || !lng) return res.status(400).json({ success: false, message: 'Missing lat/lng' });

        const users = await User.find({
            lastLocation: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            },
            isActive: true,
            isDeleted: false,
            _id: { $ne: req.userId } // Exclude self
        })
            .limit(20)
            .select('username firstName lastName profilePicture lastLocation bio');

        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/geo/location:
 *   post:
 *     summary: Update my location
 *     tags: [Geo]
 */
router.post('/location', verifyToken, async (req, res) => {
    try {
        const { lat, lng } = req.body;

        if (!lat || !lng) return res.status(400).json({ success: false, message: 'Missing lat/lng' });

        await User.findByIdAndUpdate(req.userId, {
            lastLocation: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            }
        });

        res.json({ success: true, message: 'Location updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
