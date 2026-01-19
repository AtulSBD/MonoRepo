class CacheService {
    private static instance: CacheService;
    private cache: Map<string, any>;
  
    private constructor() {
      this.cache = new Map<string, any>();
    }
  
    public static getInstance(): CacheService {
      if (!CacheService.instance) {
        CacheService.instance = new CacheService();
      }
      return CacheService.instance;
    }
  
    public set(key: string, value: any): void {
      this.cache.set(key, value);
    }
  
    public get(key: string): any | undefined {
      return this.cache.get(key);
    }
  
    public has(key: string): boolean {
      return this.cache.has(key);
    }
  
    public delete(key: string): void {
      this.cache.delete(key);
    }
  
    public clear(): void {
      this.cache.clear();
    }
  }
export default CacheService;