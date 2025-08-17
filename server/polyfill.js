// Node.js compatibility polyfill for undici/File API issues
// This fixes the "File is not defined" error in certain Node.js environments

if (typeof global !== 'undefined' && !global.File) {
  // Create a minimal File API polyfill for Node.js environments
  global.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = 0;
      
      // Calculate size if fileBits is provided
      if (Array.isArray(fileBits)) {
        this.size = fileBits.reduce((total, bit) => {
          if (typeof bit === 'string') {
            return total + Buffer.byteLength(bit, 'utf8');
          }
          if (bit instanceof Buffer) {
            return total + bit.length;
          }
          return total;
        }, 0);
      }
    }
    
    stream() {
      // Minimal stream implementation
      return new ReadableStream();
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
    
    text() {
      return Promise.resolve('');
    }
  };
  
  console.log('✅ File API polyfill loaded for Node.js compatibility');
}

// Export for require usage
module.exports = {};
