import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Checkbox, Typography, Alert, Space, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { FileTextOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getStoredEULAHash, storeEULAHash, setEULAAgreement, checkEULAAgreement, needsEULARenewal } from '../utils/eulaStorage';

const { Title, Paragraph, Text } = Typography;

interface EULAModalProps {
  visible: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

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

const EULAModal: React.FC<EULAModalProps> = ({ visible, onAgree, onDisagree }) => {
  const { t, i18n } = useTranslation();
  const [eulaContent, setEulaContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [agreed, setAgreed] = useState<boolean>(false);
  const [showConfirmDisagree, setShowConfirmDisagree] = useState<boolean>(false);
  const [showConfirmAgree, setShowConfirmAgree] = useState<boolean>(false);
  const [showServiceDisabled, setShowServiceDisabled] = useState<boolean>(false);
  const [showAgreementAccepted, setShowAgreementAccepted] = useState<boolean>(false);

  // 加载EULA内容
  const loadEULAContent = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const language = i18n.language;
      const fileName = language.startsWith('zh') ? 'zh.md' : 'en.md';
      
      const response = await fetch(`/lang/eula/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load EULA: ${response.status}`);
      }
      
      const content = await response.text();
      setEulaContent(content);
      
      // 检查是否需要重新同意（基于当前语言的EULA）
      const needsRenewal = await needsEULARenewal(language, content);
      if (needsRenewal) {
        // 如果切换语言后EULA内容有变化，需要重新同意
        setEULAAgreement(false);
      } else {
        // 检查用户是否已经同意过当前语言的EULA
        const currentLanguageAgreed = getStoredEULAHash(language) !== null;
        if (!currentLanguageAgreed) {
          // 如果用户从未同意过当前语言的EULA，需要重新同意
          setEULAAgreement(false);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load EULA content');
      console.error('Error loading EULA:', err);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    if (visible) {
      loadEULAContent();
    }
  }, [visible, loadEULAContent]);

  const handleAgree = () => {
    setShowConfirmAgree(true);
  };

  const handleConfirmAgree = () => {
    const language = i18n.language;
    const hash = md5(eulaContent);
    
    storeEULAHash(language, hash);
    setEULAAgreement(true);
    setShowConfirmAgree(false);
    onAgree();
    setShowAgreementAccepted(true);
  };

  const handleDisagree = () => {
    setShowConfirmDisagree(true);
  };

  const handleConfirmDisagree = () => {
    setEULAAgreement(false);
    setShowConfirmDisagree(false);
    onDisagree();
    setShowServiceDisabled(true);
  };

  const handleCloseConfirm = () => {
    setShowConfirmDisagree(false);
    setShowConfirmAgree(false);
    setShowServiceDisabled(false);
    setShowAgreementAccepted(false);
  };

  // 确认拒绝对话框
  const renderConfirmDisagree = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>{t('eula.confirmTitle')}</span>
        </div>
      }
      open={showConfirmDisagree}
      onCancel={handleCloseConfirm}
      footer={[
        <Button key="cancel" onClick={handleCloseConfirm}>
          {t('common.cancel')}
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          danger 
          onClick={handleConfirmDisagree}
        >
          {t('common.confirm')}
        </Button>
      ]}
      width={500}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={t('eula.confirmMessage')}
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );

  // 确认同意对话框
  const renderConfirmAgree = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{t('eula.confirmTitle')}</span>
        </div>
      }
      open={showConfirmAgree}
      onCancel={handleCloseConfirm}
      footer={[
        <Button key="cancel" onClick={handleCloseConfirm}>
          {t('common.cancel')}
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirmAgree}
        >
          {t('common.confirm')}
        </Button>
      ]}
      width={500}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={t('eula.confirmAgreeMessage')}
          type="info"
          showIcon
        />
      </div>
    </Modal>
  );

  // 服务禁用提示框
  const renderServiceDisabled = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>{t('eula.serviceDisabled')}</span>
        </div>
      }
      open={showServiceDisabled}
      onCancel={handleCloseConfirm}
      footer={[
        <Button key="confirm" type="primary" onClick={handleCloseConfirm}>
          {t('common.confirm')}
        </Button>
      ]}
      width={500}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={t('eula.serviceDisabledMessage')}
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );

  // 协议接受成功提示框
  const renderAgreementAccepted = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{t('eula.agreementAccepted')}</span>
        </div>
      }
      open={showAgreementAccepted}
      onCancel={handleCloseConfirm}
      footer={[
        <Button key="confirm" type="primary" onClick={handleCloseConfirm}>
          {t('common.confirm')}
        </Button>
      ]}
      width={500}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={t('eula.agreementAcceptedMessage')}
          type="success"
          showIcon
        />
      </div>
    </Modal>
  );

  return (
    <>
      {/* 主EULA模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>{t('eula.title')}</span>
          </div>
        }
        open={visible}
        onCancel={handleDisagree}
        footer={[
          <Button 
            key="disagree" 
            onClick={handleDisagree}
            disabled={loading}
          >
            {t('eula.disagree')}
          </Button>,
          <Button 
            key="agree" 
            type="primary" 
            onClick={handleAgree}
            disabled={loading || !agreed}
          >
            {t('eula.agree')}
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}
        styles={{
          body: {
            padding: 0,
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        centered
      >
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 200 
            }}>
              <Spin size="large" />
            </div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <Alert
                message={t('common.error')}
                description={error}
                type="error"
                showIcon
              />
            </div>
          ) : (
            <>
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: 24
              }}>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  margin: 0
                }}>
                  <ReactMarkdown>{eulaContent}</ReactMarkdown>
                </div>
              </div>
              
              <div style={{ padding: 16 }}>
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                >
                  {t('eula.readAndAgree')}
                </Checkbox>
                
                {!agreed && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('eula.scrollToRead')}
                    </Text>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 其他对话框 */}
      {renderConfirmDisagree()}
      {renderConfirmAgree()}
      {renderServiceDisabled()}
      {renderAgreementAccepted()}
    </>
  );
};

export default EULAModal;