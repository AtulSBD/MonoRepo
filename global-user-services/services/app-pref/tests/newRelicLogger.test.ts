
import { sendLogToNewRelic } from '../src/utils/newRelicLogger';
import axios from 'axios';

jest.mock('axios');
jest.mock('../src/env', () => ({
  newRelicLogApiUrl: 'https://mock.newrelic.com/logs',
  newRelicLogApiKey: 'mock-api-key'
}));

describe('sendLogToNewRelic', () => {
  const mockLogs = { message: 'Test log message' };

  it('should send logs successfully to New Relic', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

    await sendLogToNewRelic(mockLogs);

    expect(axios.post).toHaveBeenCalledWith(
      'https://mock.newrelic.com/logs',
      mockLogs,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': 'mock-api-key'
        }
      }
    );
  });

  it('should handle error when sending logs fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    await sendLogToNewRelic(mockLogs);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error sending log to New Relic:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
