const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: 50,
    minlength: 2
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  downloadHistory: [{
    url: String,
    title: String,
    platform: String,
    format: String,
    quality: String,
    downloadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  favorites: [{
    url: String,
    title: String,
    platform: String,
    thumbnail: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiry: Date,
  dailyDownloads: {
    type: Number,
    default: 0
  },
  lastDownloadReset: {
    type: Date,
    default: Date.now
  },
  avatar: {
    public_id: String,
    url: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Reset daily downloads count
userSchema.methods.resetDailyDownloads = function() {
  const now = new Date();
  const lastReset = new Date(this.lastDownloadReset);
  
  // Reset if it's a new day
  if (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.dailyDownloads = 0;
    this.lastDownloadReset = now;
  }
};

// Check download limit
userSchema.methods.canDownload = function() {
  this.resetDailyDownloads();
  
  const limits = {
    free: 10,
    premium: -1 // unlimited
  };
  
  const limit = limits[this.subscription] || limits.free;
  return limit === -1 || this.dailyDownloads < limit;
};

// Add to download history
userSchema.methods.addToHistory = function(downloadData) {
  this.downloadHistory.unshift(downloadData);
  
  // Keep only last 100 downloads
  if (this.downloadHistory.length > 100) {
    this.downloadHistory = this.downloadHistory.slice(0, 100);
  }
  
  this.dailyDownloads += 1;
};

// Add to favorites
userSchema.methods.addToFavorites = function(favoriteData) {
  // Check if already in favorites
  const exists = this.favorites.some(fav => fav.url === favoriteData.url);
  if (!exists) {
    this.favorites.unshift(favoriteData);
    
    // Keep only last 50 favorites
    if (this.favorites.length > 50) {
      this.favorites = this.favorites.slice(0, 50);
    }
  }
};

module.exports = mongoose.model('User', userSchema);
