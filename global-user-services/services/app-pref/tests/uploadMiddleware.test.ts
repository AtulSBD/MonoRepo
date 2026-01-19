import request from 'supertest';
import express from 'express';
import upload from '../src/middleware/upload'; // adjust path as needed

const app = express();
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(200).json({ message: 'File uploaded successfully' });
});

describe('Multer Upload Middleware', () => {
  it('should upload a valid .json file under 2MB', async () => {
    const fileBuffer = Buffer.from(JSON.stringify({ key: 'value' }));
    const res = await request(app)
      .post('/upload')
      .attach('file', fileBuffer, 'test.json');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
  });

  it('should reject non-.json file types', async () => {
    const fileBuffer = Buffer.from('This is a text file');
    const res = await request(app)
      .post('/upload')
      .attach('file', fileBuffer, 'test.txt');
    expect(res.status).toBe(500); // Multer throws error, Express catches it
    expect(res.text).toContain('Only .json files are allowed!');
  });

  it('should reject files larger than 2MB', async () => {
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1); // 2MB + 1 byte
    const res = await request(app)
      .post('/upload')
      .attach('file', largeBuffer, 'large.json');
    expect(res.status).toBe(500);
    expect(res.text).toContain('File too large');
  });
});
