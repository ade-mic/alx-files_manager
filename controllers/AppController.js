import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(req, res) {
  try {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).json({
      users,
      files,
    });
  } catch (error) {
    res.status(500).json({
      error: 'An error occured while retrieving stats'
    })
  }
  }
}

export default AppController;
