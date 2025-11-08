// EULA存储工具函数

// 获取存储的EULA哈希
const getStoredEULAHash = (language: string): string | null => {
  return localStorage.getItem(`eula_hash_${language}`);
};

// 存储EULA哈希
const storeEULAHash = (language: string, hash: string): void => {
  localStorage.setItem(`eula_hash_${language}`, hash);
};

// 设置EULA同意状态
const setEULAAgreement = (agreed: boolean): void => {
  localStorage.setItem('eula_agreed', agreed.toString());
};

// 检查EULA同意状态
const checkEULAAgreement = (language?: string): boolean => {
  const agreed = localStorage.getItem('eula_agreed');
  
  // 如果没有指定语言，只检查全局同意状态
  if (!language) {
    return agreed === 'true';
  }
  
  // 如果指定了语言，需要检查该语言的EULA是否已同意
  const languageHash = localStorage.getItem(`eula_hash_${language}`);
  return agreed === 'true' && languageHash !== null;
};

// 检查是否需要EULA更新
const needsEULARenewal = async (language: string, currentContent: string): Promise<boolean> => {
  const storedHash = getStoredEULAHash(language);
  if (!storedHash) return true;
  
  const currentHash = md5(currentContent);
  return storedHash !== currentHash;
};

// MD5哈希计算函数
const md5 = (str: string): string => {
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;

  const msgLength = str.length;
  const words: number[] = [];
  
  for (let i = 0; i < str.length; i++) {
    words.push(str.charCodeAt(i));
  }

  words.push(0x80);
  while ((words.length % 64) !== 56) {
    words.push(0x00);
  }

  const lengthBits = msgLength * 8;
  for (let i = 0; i < 8; i++) {
    words.push((lengthBits >>> (i * 8)) & 0xff);
  }

  for (let i = 0; i < words.length; i += 64) {
    const block = words.slice(i, i + 64);
    const w: number[] = [];

    for (let j = 0; j < 16; j++) {
      w[j] = (block[j * 4] | (block[j * 4 + 1] << 8) | (block[j * 4 + 2] << 16) | (block[j * 4 + 3] << 24));
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;

    for (let j = 0; j < 64; j++) {
      let f, g;
      
      if (j < 16) {
        f = (b & c) | ((~b) & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | ((~d) & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | (~d));
        g = (7 * j) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b = b + ((a + f + 0x67452301 + w[g]) << 7 | (a + f + 0x67452301 + w[g]) >>> 25);
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  const toHex = (value: number): string => {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((value >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return hex;
  };

  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3);
};

export { checkEULAAgreement, setEULAAgreement, storeEULAHash, getStoredEULAHash, needsEULARenewal, md5 };