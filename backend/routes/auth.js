const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const UserMongo = require("../models/User");
const UserMock = require("../mockdb/userDB");
const Session = require("../models/Session");

const { validateRegister, validateLogin, checkValidation } = require("../middleware/validationMiddleware");
const { sendPasswordResetOTP } = require("../services/emailService");
const {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
} = require("../middleware/authRateLimiter");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "college_media_secret_key";

// ⚠️ In-memory OTP store
const otpStore = new Map();

/* ---------------- REGISTER ---------------- */
router.post("/register", validateRegister, checkValidation, async (req, res, next) => {
  try {
    console.log('\ud83d\udce5 Registration request received:', { 
      ...req.body, 
      password: req.body.password ? '***' : undefined 
    });
    
    const { username, email, password, firstName, lastName } = req.body;
    const dbConnection = req.app.get("dbConnection");

    const existingUser = dbConnection?.useMongoDB
      ? await UserMongo.findOne({ $or: [{ email }, { username }] })
      : await UserMock.findByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = dbConnection?.useMongoDB
      ? await UserMongo.create({ username, email, password: hashedPassword, firstName, lastName })
      : await UserMock.create({ username, email, password: hashedPassword, firstName, lastName });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------- LOGIN (MULTI-SESSION ENABLED) ---------------- */
router.post(
  "/login",
  loginLimiter,
  validateLogin,
  checkValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const dbConnection = req.app.get("dbConnection");

      const user = dbConnection?.useMongoDB
        ? await UserMongo.findOne({ email })
        : await UserMock.findByEmail(email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Return a special response indicating 2FA is required
        return res.json({
          success: true,
          requiresTwoFactor: true,
          userId: user._id,
          message: "Two-factor authentication required",
        });
      }

      // 🔐 CREATE NEW SESSION (only if 2FA not required or already verified)
      const sessionId = crypto.randomUUID();

      await Session.create({
        userId: user._id,
        sessionId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        isActive: true,
      });

      // 🔑 JWT BOUND TO SESSION
      const token = jwt.sign(
        {
          userId: user._id,
          sessionId,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        data: { token },
        message: "Login successful",
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ---------------- FORGOT PASSWORD ---------------- */
router.post("/forgot-password", otpRequestLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    const dbConnection = req.app.get("dbConnection");
    const user = dbConnection?.useMongoDB
      ? await UserMongo.findOne({ email })
      : await UserMock.findByEmail(email);

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      otpStore.set(email, {
        otp,
        userId: user._id || user.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      await sendPasswordResetOTP(email, otp).catch(() => {});
    }

    res.json({
      success: true,
      message: "If an account exists, an OTP has been sent.",
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------- VERIFY OTP ---------------- */
router.post("/verify-otp", otpVerifyLimiter, async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const data = otpStore.get(email);

    if (!data || data.otp !== otp || Date.now() > data.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const resetToken = jwt.sign(
      { userId: data.userId },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      data: { resetToken },
      message: "OTP verified successfully",
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post("/reset-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const { resetToken, newPassword, email } = req.body;
    const decoded = jwt.verify(resetToken, JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const dbConnection = req.app.get("dbConnection");

    if (dbConnection?.useMongoDB) {
      await UserMongo.findByIdAndUpdate(decoded.userId, { password: hashedPassword });
    } else {
      await UserMock.updatePassword(decoded.userId, hashedPassword);
    }

    otpStore.delete(email);

    // 🔥 LOGOUT ALL SESSIONS AFTER PASSWORD CHANGE
    await Session.updateMany(
      { userId: decoded.userId },
      { isActive: false }
    );

    res.json({
      success: true,
      message: "Password reset successful. All sessions revoked.",
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------- TWO-FACTOR AUTHENTICATION ---------------- */

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

/**
 * POST /api/auth/2fa/enable
 * Generate TOTP secret and QR code for 2FA setup
 */
router.post('/2fa/enable', verifyToken, async (req, res, next) => {
  try {
    const dbConnection = req.app.get('dbConnection');
    
    // Find user
    let user;
    if (dbConnection && dbConnection.useMongoDB) {
      user = await UserMongo.findById(req.userId);
    } else {
      user = UserMock.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `College Media (${user.email})`,
      issuer: 'College Media',
      length: 32
    });

    // Generate QR code as base64 data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Return secret and QR code to frontend (don't save yet, wait for verification)
    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      },
      message: '2FA setup initialized. Scan QR code with your authenticator app.'
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code and enable 2FA for user
 */
router.post('/2fa/verify', verifyToken, async (req, res, next) => {
  try {
    const { secret, token } = req.body;

    // Validate input
    if (!secret || !token) {
      return res.status(400).json({
        success: false,
        message: 'Secret and token are required'
      });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow ±2 time steps (60 seconds tolerance)
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Save secret and enable 2FA
    const dbConnection = req.app.get('dbConnection');
    
    if (dbConnection && dbConnection.useMongoDB) {
      await UserMongo.findByIdAndUpdate(req.userId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret
      });
    } else {
      const user = UserMock.findById(req.userId);
      if (user) {
        UserMock.update(req.userId, {
          twoFactorEnabled: true,
          twoFactorSecret: secret
        });
      }
    }

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for user account
 */
router.post('/2fa/disable', verifyToken, async (req, res, next) => {
  try {
    const { password } = req.body;

    // Validate input
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    const dbConnection = req.app.get('dbConnection');
    
    // Find user with password field
    let user;
    if (dbConnection && dbConnection.useMongoDB) {
      user = await UserMongo.findById(req.userId).select('+password');
    } else {
      user = UserMock.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled'
      });
    }

    // Disable 2FA and remove secret
    if (dbConnection && dbConnection.useMongoDB) {
      await UserMongo.findByIdAndUpdate(req.userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });
    } else {
      UserMock.update(req.userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });
    }

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    next(error);
  }
});

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status for the user
 */
router.get('/2fa/status', verifyToken, async (req, res, next) => {
  try {
    const dbConnection = req.app.get('dbConnection');
    
    // Find user
    let user;
    if (dbConnection && dbConnection.useMongoDB) {
      user = await UserMongo.findById(req.userId).select('twoFactorEnabled');
    } else {
      user = UserMock.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false
      },
      message: '2FA status retrieved successfully'
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/2fa/verify-login
 * Verify 2FA code during login
 */
router.post('/2fa/verify-login', async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    // Validate input
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'User ID and token are required'
      });
    }

    const dbConnection = req.app.get('dbConnection');
    
    // Find user
    let user;
    if (dbConnection && dbConnection.useMongoDB) {
      user = await UserMongo.findById(userId);
    } else {
      user = UserMock.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // 🔐 CREATE NEW SESSION
    const sessionId = crypto.randomUUID();

    await Session.create({
      userId: user._id,
      sessionId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      isActive: true,
    });

    // 🔑 JWT BOUND TO SESSION
    const jwtToken = jwt.sign(
      { userId: user._id, sessionId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: '2FA verification successful'
    });
  } catch (error) {
    console.error('Verify login 2FA error:', error);
    next(error);
  }
});

module.exports = router;
