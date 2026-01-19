import CacheService from '../src/services/cache.service'; // Adjust the path as needed

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    cache.clear(); // Ensure a clean state before each test
  });

  it('should set and get a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent key', () => {
    expect(cache.get('nonExistentKey')).toBeUndefined();
  });

  it('should confirm existence of a key', () => {
    cache.set('key2', 'value2');
    expect(cache.has('key2')).toBe(true);
  });

  it('should delete a key', () => {
    cache.set('key3', 'value3');
    cache.delete('key3');
    expect(cache.has('key3')).toBe(false);
    expect(cache.get('key3')).toBeUndefined();
  });

  it('should clear all keys', () => {
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');
    cache.clear();
    expect(cache.has('key4')).toBe(false);
    expect(cache.has('key5')).toBe(false);
  });

  it('should maintain singleton instance', () => {
    const anotherInstance = CacheService.getInstance();
    expect(anotherInstance).toBe(cache);

    anotherInstance.set('sharedKey', 'sharedValue');
    expect(cache.get('sharedKey')).toBe('sharedValue');
  });
});
