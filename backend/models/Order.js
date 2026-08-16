const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: String,
  items: [orderItemSchema],
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  source: { type: String, enum: ['web', 'manual'], default: 'web' },
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  confirmedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } },
});

module.exports = mongoose.model('Order', orderSchema);
