import express from 'express';
const app = express();
import cors from 'cors';
import TransactionRoute from './routes/TransactionRoute.js';
import AccountRoute from './routes/AccountRoute.js';
import CategoryRoute from './routes/CategoryRoute.js';
import StatisticRoute from './routes/StatisticRoute.js'

import RegisterRoute from './routes/auth/RegisterRoute.js';
import LoginRoute from './routes/auth/LoginRoute.js';
import connectDB from './db.js';
import dotenv from 'dotenv'
dotenv.config();

await connectDB()

const PORT = process.env.PORT || 5500

app.use(cors());
app.use(express.json());

app.use(RegisterRoute)
app.use(LoginRoute)

app.use(TransactionRoute)
app.use(AccountRoute)
app.use(CategoryRoute)
app.use(StatisticRoute)

//Listen to the server
app.listen(PORT, () => {
    console.log(`Server is running on : http://localhost:${PORT}`);
});