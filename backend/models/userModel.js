import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    
    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationTokenExpires: {
      type: Date,
      default: null,
    },
    resetCodeHash: {
      type: String,
      default: null,
    },
    resetCodeExpiresAt: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    // Legacy field retained for backward compatibility with existing records.
    address: {
      type: String,
      default: "",
    },
}, {
    timestamps: true
});

const userModel = mongoose.models.user || mongoose.model('User', userSchema);
export default userModel;