import * as tdService from '../src/utils/td.service';
import { loadTDConfig, getTDConfig, sendDataToTD, formatDateToTD } from '../src/utils/td.service';
import axios from 'axios';
import { MongoClient } from 'mongodb';

jest.mock('axios');
jest.mock('../src/config/aes-encryption', () => ({
    decrypt: jest.fn((v) => `decrypted-${v}`),
}));
jest.mock('../src/env', () => ({
    mongoUri: 'mongodb://localhost:27017',
    dbName: 'testDB',
    configCollection: 'config',
}));

const mockFind = jest.fn();
const mockToArray = jest.fn();
const mockFindOne = jest.fn();

jest.mock('mongodb', () => {
    const original = jest.requireActual('mongodb');
    return {
        ...original,
        MongoClient: jest.fn().mockImplementation(() => ({
            db: () => ({
                collection: () => ({
                    find: mockFind.mockReturnValue({ toArray: mockToArray }),
                    findOne: mockFindOne,
                }),
            }),
            connect: jest.fn(),
        })),
    };
});

describe('TD Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('formatDateToTD', () => {
        it('should format date to YYYY-MM-DD HH:mm:ss', () => {
            const date = new Date(Date.UTC(2023, 6, 31, 14, 5, 9));
            const formatted = formatDateToTD(date);
            expect(formatted).toBe('2023-07-31 14:05:09');
        });
    });

    describe('loadTDConfig', () => {
        it('should throw error and log message if DB call fails', async () => {
            mockToArray.mockRejectedValue(new Error('DB error'));
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await expect(loadTDConfig()).rejects.toThrow('Error while fetching TD configuration from database');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error while fetching TD configuration from database',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('loadTDConfig & getTDConfig', () => {
        it('should load and decrypt TD config', async () => {
            mockToArray.mockResolvedValue([
                {
                    appId: 'TD',
                    brandId: 'all_user_register',
                    regionId: 'US',
                    settings: [
                        { k: 'dbName', v: 'db' },
                        { k: 'tableName', v: 'table' },
                        { k: 'baseUri', v: 'https://td.example.com/' },
                        { k: 'writeKey', v: 'key' },
                    ],
                },
            ]);

            await loadTDConfig();
            const config = getTDConfig('TD_all_user_register_US');

            expect(config.dbName).toBe('decrypted-db');
            expect(config.tableName).toBe('decrypted-table');
            expect(config.baseUri).toBe('decrypted-https://td.example.com/');
            expect(config.writeKey).toBe('decrypted-key');
        });

        it('should return empty object if config is not loaded', async () => {
            mockToArray.mockResolvedValue([]);
            await loadTDConfig();
            const config = getTDConfig('TD_all_user_register_US');
            expect(config).toEqual({});
        });
    });

    describe('sendDataToTD', () => {
        const payload = {
            userId: 'user@example.com',
            uuid: 'uuid-123',
            brandId: 'BR1',
            region: 'US',
            market: 'US',
            professionalUser: true,
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send data to TD and return response', async () => {
            mockToArray.mockResolvedValue([
                {
                    appId: 'TD',
                    brandId: 'all_user_register',
                    regionId: 'US',
                    settings: [
                        { k: 'dbName', v: 'db' },
                        { k: 'tableName', v: 'table' },
                        { k: 'baseUri', v: 'https://td.example.com/' },
                        { k: 'writeKey', v: 'key' },
                    ],
                },
            ]);

            await loadTDConfig();
            jest.spyOn(tdService, 'getAuthTokenForTD').mockResolvedValue('token123');
            (axios.post as jest.Mock).mockResolvedValue({ data: 'success' });

            const result = await sendDataToTD(payload);
            expect(result).toBe('success');
            expect(axios.post).toHaveBeenCalled();
        });

        it('should return Error if axios.post fails', async () => {
            mockToArray.mockResolvedValue([
                {
                    appId: 'TD',
                    brandId: 'all_user_register',
                    regionId: 'US',
                    settings: [
                        { k: 'dbName', v: 'db' },
                        { k: 'tableName', v: 'table' },
                        { k: 'baseUri', v: 'https://td.example.com/' },
                        { k: 'writeKey', v: 'key' },
                    ],
                },
            ]);

            await loadTDConfig();
            jest.spyOn(tdService, 'getAuthTokenForTD').mockResolvedValue('token123');
            (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await sendDataToTD(payload);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('Error fetching token for TD');
        });

        // ✅ New Cases for Full Coverage
        // it('should return undefined and log error if config is missing', async () => {
        //     const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        //     const result = await sendDataToTD({ ...payload, region: 'XX' });
        //     expect(result).toBeUndefined();
        //     expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TD Congiguration missing'));
        //     consoleSpy.mockRestore();
        // });

        it('should throw error if baseUri/dbName/tableName missing', async () => {
            jest.spyOn(tdService, 'getTDConfig').mockReturnValue({
                baseUri: '',
                dbName: '',
                tableName: '',
            });
            await expect(sendDataToTD(payload)).rejects.toThrow('Missing baseUri, dbName, or tableName');
        });

        it('should return Error if token fetch fails', async () => {
            jest.spyOn(tdService, 'getTDConfig').mockReturnValue({
                baseUri: 'https://td.example.com',
                dbName: 'db',
                tableName: 'table',
                writeKey: 'key',
            });
            jest.spyOn(tdService, 'getAuthTokenForTD').mockRejectedValue(new Error('Token error'));
            const result = await sendDataToTD(payload);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('Error fetching token for TD');
        });
    });
});