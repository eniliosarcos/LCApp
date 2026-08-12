const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  alt: String,
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  price: { type: Number, required: true },
  discountPrice: Number,
  stock: { type: Number, default: 0 },
  sku: { type: String, unique: true },
  tags: [String],
  images: [productImageSchema],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } },
});

module.exports = mongoose.model('Product', productSchema);
