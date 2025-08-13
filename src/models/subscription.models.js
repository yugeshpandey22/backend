const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({

  subscriber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Automatically update updatedAt on document update
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Subscription = mongoose.model('subscriptions', subscriptionSchema);

module.exports = Subscription;
