import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI
const client = new MongoClient(uri)
let db;

async function connectDB() {
    if (db) return db
    await client.connect()
    db = client.db('FinTrackDB')
    console.log('DataBase connected')
    return db
}

export default connectDB