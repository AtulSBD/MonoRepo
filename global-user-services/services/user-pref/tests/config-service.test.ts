import mongoose from "mongoose";
import { ConfigService } from "../src/config/config-service";
import { encrypt, decrypt } from "./../src/config/aes-encryption";

// Mocks
jest.mock("./../src/config/aes-encryption", () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

const mockUpdateOne = jest.fn();
const mockFind = jest.fn();
const mockToArray = jest.fn();

const mockCollection = {
  updateOne: mockUpdateOne,
  find: mockFind,
};

beforeAll(() => {
  // @ts-ignore
  mongoose.connection.collection = jest.fn().mockImplementation(() => mockCollection);
  mockFind.mockReturnValue({ toArray: mockToArray });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ConfigService", () => {
  const service = new ConfigService();

  describe("createOrUpdateConfig", () => {
    it("encrypts settings and upserts configs", async () => {
      (encrypt as jest.Mock).mockImplementation(async (v) => `enc-${v}`);
      mockUpdateOne.mockResolvedValue({});

      const configs = [
        {
          configId: "cfg1",
          desc: "desc",
          appId: "app",
          brandId: "brand",
          regionId: "region",
          marketId: "market",
          locale: "en",
          businessUnitedId: "bu",
          env: "prod",
          group: "group",
          settings: [
            { k: "key1", v: "val1" },
            { k: "key2", v: "" }, // Should not encrypt
          ],
        },
      ];

      const result = await service.createOrUpdateConfig(configs);

      expect(encrypt).toHaveBeenCalledWith("val1");
      expect(result).toBe("Configs processed successfully");
    });

    it("handles single config object", async () => {
      (encrypt as jest.Mock).mockResolvedValue("enc-val");
      mockUpdateOne.mockResolvedValue({});
      const config:any = {
        configId: "cfg2",
        desc: "desc2",
        appId: "app2",
        brandId: "brand2",
        regionId: "region2",
        marketId: "market2",
        locale: "fr",
        businessUnitedId: "bu2",
        env: "dev",
        group: "group2",
        settings: [{ k: "key", v: "val" }],
      };
      const result = await service.createOrUpdateConfig(config);
      expect(result).toBe("Configs processed successfully");
      expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    });

    it("throws and logs on error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("DB error"));
      const config:any = {
        configId: "cfg3",
        desc: "desc3",
        appId: "app3",
        brandId: "brand3",
        regionId: "region3",
        marketId: "market3",
        locale: "es",
        businessUnitedId: "bu3",
        env: "test",
        group: "group3",
        settings: [{ k: "key", v: "val" }],
      };
      const logSpy = jest.spyOn(console, "error").mockImplementation();
      await expect(service.createOrUpdateConfig(config)).rejects.toThrow("Error creating/updating configs");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Error creating/updating configs:"), expect.any(Error));
      logSpy.mockRestore();
    });
  });

  describe("getConfig", () => {
    it("builds query and decrypts settings", async () => {
      (decrypt as jest.Mock).mockImplementation(async (v) => `dec-${v}`);
      mockToArray.mockResolvedValue([
        {
          configId: "cfg1",
          settings: [
            { k: "key1", v: "enc-val1" },
            { k: "key2", v: "" }, // Should not decrypt
          ],
        },
      ]);
      const result = await service.getConfig({ configId: "cfg1" });
      expect(decrypt).toHaveBeenCalledWith("enc-val1");
      expect(result[0].settings[0].v).toBe("dec-enc-val1");
      expect(result[0].settings[1].v).toBe("");
    });

    it("returns config as-is if no settings", async () => {
      mockToArray.mockResolvedValue([{ configId: "cfg2" }]);
      const result = await service.getConfig({ configId: "cfg2" });
      expect(result[0].configId).toBe("cfg2");
    });

    it("handles decryption error gracefully", async () => {
      (decrypt as jest.Mock).mockRejectedValue(new Error("decryption error"));
      mockToArray.mockResolvedValue([
        {
          configId: "cfg3",
          settings: [{ k: "key", v: "enc-val" }],
        },
      ]);
      const logSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await service.getConfig({ configId: "cfg3" });
      expect(result[0].error).toBe("Decryption failed");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Error decrypting config cfg3:"), expect.any(Error));
      logSpy.mockRestore();
    });

    it("throws and logs on fetch error", async () => {
      mockToArray.mockRejectedValue(new Error("DB error"));
      const logSpy = jest.spyOn(console, "error").mockImplementation();
      await expect(service.getConfig({ configId: "cfg4" })).rejects.toThrow("Error fetching data");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Error fetching data:"), expect.any(Error));
      logSpy.mockRestore();
    });
  });
});