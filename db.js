import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db;

export async function connectToDB() {
    if (!db) {
        try {
            await client.connect();
            db = client.db('FinTrackDB');
            console.log('✅ Connected to MongoDB');
        } catch (err) {
            console.error('❌ MongoDB connection error:', err);
            throw err;
        }
    }
    return db;
}