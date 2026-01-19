import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import pactum from 'pactum';
import app from '../src/app';
import { User } from '../src/models/user';
import http from 'http';

let mongoServer: MongoMemoryServer;
let server: http.Server;
let port: number;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Start Express app on a random port
  server = app.listen(0, () => {
    const address = server.address();
    if (address && typeof address === 'object') {
      port = address.port;
    }
  });
  // Wait for server to start
  await new Promise(resolve => server.once('listening', resolve));
});

afterAll(async () => {
  await mongoose.disconnect();
//   await mongoServer.stop();
  server.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

test('GET /api/users returns seeded users', async () => {
  await User.create([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ]);

  await pactum.spec()
    .get(`http://localhost:${port}/api/users`)
    .expectStatus(200)
    .expectJsonLike([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' }
    ]);
});