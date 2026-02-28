import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: String,
  description: String,
  image: String,
  inStock: { type: Boolean, default: true },
  sold: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const StarterKitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  icon: String, // emoji
  contents: [String],
  individualPrice: { type: Number, required: true },
  kitPrice: { type: Number, required: true },
  brand: String,
  description: String,
  image: String,
  inStock: { type: Boolean, default: true },
  sold: { type: Number, default: 0 },
}, { timestamps: true });

StarterKitSchema.virtual('savings').get(function () {
  return this.individualPrice - this.kitPrice;
});

StarterKitSchema.virtual('savingsPercent').get(function () {
  return Math.round(((this.individualPrice - this.kitPrice) / this.individualPrice) * 100);
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    type: { type: String, enum: ['product', 'starter-kit'] },
    productId: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 },
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  deliveryNote: String,
  deliveredAt: Date,
}, { timestamps: true });

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const StarterKit = mongoose.models.StarterKit || mongoose.model('StarterKit', StarterKitSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
