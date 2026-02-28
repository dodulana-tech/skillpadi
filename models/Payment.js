import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reference: { type: String, required: true, unique: true, index: true },
  paystackRef: String, // Paystack's own reference

  amount: { type: Number, required: true }, // in Naira (not kobo)
  tax: { type: Number, default: 0 }, // VAT
  totalAmount: { type: Number, required: true }, // amount + tax

  type: {
    type: String,
    enum: ['membership', 'enrollment', 'starter-kit', 'product', 'insurance'],
    required: true,
  },

  description: String, // "Little Swimmers — 4 Sessions"

  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  },

  channel: String, // "card", "bank", "ussd", "bank_transfer"
  paidAt: Date,

  // Linked entities
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  // Paystack webhook data
  webhookData: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ type: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
