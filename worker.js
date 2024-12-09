import Bull from 'bull';
import { promises as fs } from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.collection('files').findOne({ _id: new ObjectId(fileId), userId });
  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];

  await Promise.all(sizes.map(async (size) => {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    const thumbnailPath = `${file.localPath}_${size}`;
    await fs.writeFile(thumbnailPath, thumbnail, 'base64');
  }));
});
