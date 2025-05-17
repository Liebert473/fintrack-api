import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    id: String,
    type: String,
    amount: Number,
    account: String,
    date: String,
    category: {
        id: String,
        name: String,
    },
});

export default mongoose.model('Transaction', TransactionSchema, 'transactions');