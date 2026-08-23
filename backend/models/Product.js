const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  alt: String,
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  variants: [{
    width: Number,
    url: String,
    _id: false,
  }],
}, { _id: false });

const productSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  price: { type: Number, required: true },
  discountPrice: Number,
  stock: { type: Number, default: 0 },
  sku: { type: String, unique: true, sparse: true },
  tags: [String],
  images: [productImageSchema],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      ret.images = (ret.images || []).map((img, index) => ({
        ...img,
        id: `${ret.id}-img-${index + 1}`,
      }));
    },
  },
});

module.exports = mongoose.model('Product', productSchema);
