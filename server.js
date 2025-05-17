import express from 'express';
const app = express();
import cors from 'cors';
import TransactionRoute from './routes/TransactionRoute.js';
import AccountRoute from './routes/AccountRoute.js';
import CategoryRoute from './routes/CategoryRoute.js';
import StatisticRoute from './routes/StatisticRoute.js'
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection failed:', err));

console.log(mongoose.connection.name)

const PORT = 5500

app.use(cors());
app.use(express.json());
app.use(TransactionRoute)
app.use(AccountRoute)
app.use(CategoryRoute)
app.use(StatisticRoute)

//Listen to the server
app.listen(PORT, () => {
    console.log(`Server is running on : http://localhost:${PORT}`);
});