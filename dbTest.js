import mongoose from 'mongoose';
import Transaction from './models/Transaction.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const transactions = await Transaction.find({});
        console.log('Transactions:', transactions);
        mongoose.disconnect();
    })
    .catch(console.error);
