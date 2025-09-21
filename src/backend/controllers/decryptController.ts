import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { CryptoService } from '../services/cryptoService';
import { DownloadService } from '../services/downloadService';
import { cleanupFiles } from '../middleware/upload';
import { CleanupService } from '../services/cleanupService';

export class DecryptController {
  /**
   * 解密资源包
   */
  static async decryptPack(req: Request, res: Response): Promise<void> {
    const uploadedFiles: string[] = [];
    let outputFile: string | undefined;

    try {
      // 检查上传的文件
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || !files.encryptedFile || !files.keyFile) {
        res.status(400).json({ 
          success: false, 
          message: 'Please upload both encrypted file (.zip) and key file (.key)' 
        });
        return;
      }

      const encryptedFile = files.encryptedFile[0];
      const keyFile = files.keyFile[0];
      
      uploadedFiles.push(encryptedFile.path, keyFile.path);
      
      console.log('Processing encrypted file:', encryptedFile.originalname, 'at:', encryptedFile.path);
      console.log('Processing key file:', keyFile.originalname, 'at:', keyFile.path);
      
      // 获取preserveContentsJson参数
    const preserveContentsJson = req.body.preserveContentsJson === 'true' || req.query.preserveContentsJson === 'true';
    console.log('Received preserveContentsJson parameter:', preserveContentsJson);
    console.log('req.body.preserveContentsJson:', req.body.preserveContentsJson);
    console.log('req.query.preserveContentsJson:', req.query.preserveContentsJson);
      console.log('Preserve contents.json:', preserveContentsJson);

      // 读取密钥
      const keyContent = fs.readFileSync(keyFile.path, 'utf8').trim();
      console.log('Read encryption key from file');
      console.log('Raw key content:', JSON.stringify(keyContent));
      console.log('Key length after trim:', keyContent.length);

      // 验证密钥格式并转换
      let encryptionKey: string;
      if (keyContent.length === 32) {
        // 32字符字母数字密钥格式
        console.log('Detected 32-character alphanumeric key format');
        encryptionKey = keyContent;
        console.log('Key validation passed, length:', encryptionKey.length, 'characters');
      } else {
        console.log('Key length validation failed, expected 32 characters, actual:', keyContent.length);
        res.status(400).json({
          success: false,
          message: `Invalid key file, key length must be 32 characters, current length: ${keyContent.length}`
        });
        return;
      }

      // 生成输出文件路径
      const timestamp = Date.now();
      const outputDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      outputFile = path.join(outputDir, `decrypted_${timestamp}.zip`);

      // 执行解密
      console.log('Starting decryption...');
      console.log('Input file:', encryptedFile.path);
      console.log('Output file:', outputFile);
      console.log('Key length:', encryptionKey.length, 'characters');
      
      // 检查输入文件是否存在
      if (!fs.existsSync(encryptedFile.path)) {
        throw new Error(`输入文件不存在: ${encryptedFile.path}`);
      }
      
      console.log('Input file exists, size:', fs.statSync(encryptedFile.path).size, 'bytes');
      
      const cryptoService = CryptoService.getInstance();
      console.log('CryptoService instance created, calling decryptPack...');
      
      try {
        await cryptoService.decryptPack(encryptedFile.path, outputFile, encryptionKey, preserveContentsJson);
        console.log('Decryption completed successfully');
      } catch (decryptError) {
        console.error('Decryption failed with error:', decryptError);
        throw decryptError;
      }

      // 创建下载链接
      const downloadId = await DownloadService.createDownloadLink({
        'output.zip': outputFile
      });

      // 清理上传的文件
      cleanupFiles(uploadedFiles);
      
      // 立即删除中间文件（解密后的文件）
      // 因为它已经被打包到下载文件中
      CleanupService.safeDeleteFile(outputFile, 'decrypted output file');
      
      console.log('🔓 Decryption completed and intermediate files cleaned up');

      res.json({
        success: true,
        message: 'Resource pack decrypted successfully',
        data: {
          downloadId,
          downloadUrl: `/api/download/${downloadId}`,
          expiresIn: '5min',
          files: {
            decrypted: 'output.zip'
          }
        }
      });

    } catch (error) {
      console.error('Decryption error:', error);

      // 清理文件
      cleanupFiles(uploadedFiles);
      if (outputFile) {
        CleanupService.safeDeleteFile(outputFile, 'decrypted output file');
      }

      let errorMessage = 'Error occurred during decryption';
      if (error instanceof Error) {
        if (error.message.includes('Cannot find contents.json')) {
          errorMessage = 'File is not a valid encrypted resource pack';
        } else if (error.message.includes('Invalid key')) {
          errorMessage = 'Invalid key or corrupted file';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取解密状态
   */
  static getDecryptStatus(req: Request, res: Response): void {
    const stats = DownloadService.getStats();
    const cryptoService = CryptoService.getInstance();
    const progress = cryptoService.getProgress();
    
    res.json({
      success: true,
      data: {
        service: 'MCBEPackCrypt - Decryption Service',
        status: 'running',
        downloadLinks: stats,
        progress: progress,
        requiredFiles: {
          encryptedFile: '.zip (encrypted resource pack)',
          keyFile: '.key (32-character key file)'
        },
        maxFileSize: '100MB'
      }
    });
  }

  /**
   * 获取解密进度
   */
  static getDecryptProgress(req: Request, res: Response): void {
    const cryptoService = CryptoService.getInstance();
    const progress = cryptoService.getProgress();
    res.json(progress);
  }
}