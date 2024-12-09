import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileCollection = dbClient.collection('files');
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const parentFile = parentId !== 0 ? await fileCollection.findOne(
      { _id: new ObjectId(parentId) },
    ) : null;
    if (parentId !== 0 && !parentFile) {
      return res.status(400).json({ error: 'Parent not found' });
    }
    if (parentFile && parentFile.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileDocument = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await fileCollection.insertOne(fileDocument);
      return res.status(201).json({ id: result.insertedId.toString(), ...fileDocument });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    await fs.mkdir(folderPath, { recursive: true });

    const localPath = path.join(folderPath, uuidv4());
    await fs.writeFile(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;
    const result = await fileCollection.insertOne(fileDocument);

    if (type === 'image') {
      await fileQueue.add({ userId, fileId: result.insertedId.toString() });
    }

    return res.status(201).json({ id: result.insertedId.toString(), ...fileDocument });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const fileCollection = dbClient.collection('files');
    const file = await fileCollection.findOne({ _id: new ObjectId(fileId), userId });

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { parentId = 0, page = 0 } = req.query;
    const pageSize = 20;
    const skip = page * pageSize;

    const fileCollection = dbClient.collection('files');
    const files = await fileCollection
      .find({
        userId,
        parentId: parentId === '0' ? 0 : new ObjectId(parentId),
      })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    return this.updatePublishStatus(req, res, true);
  }

  static async putUnpublish(req, res) {
    return this.updatePublishStatus(req, res, false);
  }

  static async updatePublishStatus(req, res, isPublic) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const fileCollection = dbClient.collection('files');
    const file = await fileCollection.findOne({ _id: new ObjectId(fileId), userId });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await fileCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic } });
    const updatedFile = await fileCollection.findOne({ _id: new ObjectId(fileId) });

    return res.status(200).json(updatedFile);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const { size } = req.query;
    const fileId = req.params.id;

    const fileCollection = dbClient.collection('files');
    const file = await fileCollection.findOne({ _id: new ObjectId(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    if (!file.isPublic) {
      if (!token) return res.status(404).json({ error: 'Not found' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    try {
      let filePath = file.localPath;
      if (size && ['500', '250', '100'].includes(size)) {
        filePath = `${file.localPath}_${size}`;
      }

      const fileContent = await fs.readFile(filePath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
