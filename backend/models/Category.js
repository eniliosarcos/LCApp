const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  imageUrl: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } },
});

module.exports = mongoose.model('Category', categorySchema);
