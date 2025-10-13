// services/auth.service.js
const crypto = require("crypto");
const User = require("../models/User");
const VerificationToken = require("../models/VerificationToken");

function generateToken() {
  return crypto.randomBytes(24).toString("hex"); // 48 hex chars
}

async function createEmailVerification(userId) {
  const token = generateToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await VerificationToken.create({ userId, token, expiresAt: expires });
  return token;
}

async function verifyEmailToken(token) {
  const doc = await VerificationToken.findOne({ token });
  if (!doc) throw { status: 400, message: "Invalid verification link" };
  if (doc.usedAt) throw { status: 400, message: "Link already used" };
  if (doc.expiresAt < new Date()) throw { status: 400, message: "Verification link expired" };

  const user = await User.findById(doc.userId);
  if (!user) throw { status: 404, message: "User not found" };

  user.status = "active"; // kích hoạt tài khoản
  await user.save();

  doc.usedAt = new Date();
  await doc.save();

  return user;
}

module.exports = { createEmailVerification, verifyEmailToken };
