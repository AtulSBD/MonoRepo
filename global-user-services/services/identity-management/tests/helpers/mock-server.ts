import { mock } from 'pactum';
let mockServer: any;
export function startMockServer(port: number = 3002) {
  mockServer = mock.start(port);
  return mockServer;
}
export function stopMockServer() {
  if (mockServer) {
    mockServer.stop();
  }
}
export function getMockServer() {
  return mockServer;
}