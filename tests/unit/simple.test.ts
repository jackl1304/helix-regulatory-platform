describe('Basic functionality', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const str = 'Hello World';
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.includes('World')).toBe(true);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.filter(n => n > 3)).toEqual([4, 5]);
  });

  it('should handle promises', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});