import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url);

    // Use a flag to check connection success
    this.isConnected = false;

    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(database);
        this.isConnected = true;
        console.log('Connected to MongoDB successfully');
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
        this.db = null; // Ensure the db is null if connection fails
      });
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    try {
      const count = await this.db.collection('users').countDocuments();
      return count;
    } catch (err) {
      console.error('Error fetching user count:', err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const count = await this.db.collection('files').countDocuments();
      return count;
    } catch (err) {
      console.error('Error fetching file count:', err);
      return 0;
    }
  }
}

const dbClient = new DBClient();

export default dbClient;
