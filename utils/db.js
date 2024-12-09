import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const url = process.env.DB_URL || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'files_manager';

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(dbName);
      console.log('Database connected successfully');
    }).catch((err) => {
      console.error('Failed to connect to the database', err);
    });
  }

  isAlive() {
    return this.client && this.client.isConnected();
  }

  async collection(name) {
    if (!this.db) throw new Error('Database not connected yet');
    return this.db.collection(name);
  }
}

const dbClient = new DBClient();
export default dbClient;
