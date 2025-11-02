import React, { useState } from 'react';
import { Modal, Button, Collapse, Typography, message } from 'antd';
import { CopyOutlined, ExclamationCircleOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Panel } = Collapse;
const { Paragraph, Text } = Typography;

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  error: {
    message: string;
    stack?: string;
  };
}

const ErrorModal: React.FC<ErrorModalProps> = ({ visible, onClose, error }) => {
  const { t } = useTranslation();
  const [copyLoading, setCopyLoading] = useState(false);

  const handleCopy = async () => {
    setCopyLoading(true);
    try {
      await navigator.clipboard.writeText(error.stack || error.message);
      message.success(t('errorModal.stackTrace.copied'));
    } catch (err) {
      message.error('Copy failed');
    } finally {
      setCopyLoading(false);
    }
  };

  return (
    <Modal
      className="error-modal"
      title={
        <div className="error-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
          <span>{t('errorModal.title')}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('errorModal.close')}
        </Button>,
        <Button 
          key="copy"
          type="primary"
          icon={<CopyOutlined />}
          loading={copyLoading}
          onClick={handleCopy}
        >
          {t('errorModal.stackTrace.copy')}
        </Button>
      ]}
    >
      <div className="error-modal-content" style={{ marginBottom: '16px' }}>
        <div style={{ textAlign: 'left', fontSize: '48px', marginBottom: '16px', color: '#ff4d4f' }}>
          :(
        </div>
        <Paragraph className="error-description" style={{ fontSize: '16px', marginBottom: '16px' }}>
          {t('errorModal.message')}
        </Paragraph>
        
        <Paragraph className="error-instructions" style={{ marginBottom: '16px' }}>
          {t('errorModal.suggestions.title')}
        </Paragraph>
        
        <div className="error-solutions" style={{ paddingLeft: '16px', marginBottom: '16px' }}>
          <p>1. {t('errorModal.suggestions.copyStack')}</p>
          <p>2. {t('errorModal.suggestions.submitIssue')}</p>
        </div>
        
        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <a href="https://cnb.cool/EnderRealm/public/MCBEPackCrypt/-/issues" target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', textDecoration: 'underline' }}>
            → {t('errorModal.issuePage')}
          </a>
        </div>
        
        <Text className="error-note" type="secondary" style={{ fontSize: '12px' }}>
          {t('errorModal.note')}
        </Text>
      </div>

      <Collapse 
        className="error-stack-collapse"
        size="small"
        expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
        ghost
      >
        <Panel 
          className="error-stack-panel"
          header={t('errorModal.stackTrace.title')} 
          key="1"
          style={{ 
            borderRadius: '6px',
            marginBottom: 0
          }}
        >
          <div 
            className="stack-trace-container"
            style={{ 
              padding: '12px',
              borderRadius: '4px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '12px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)'
            }}
          >
            {error.stack || error.message}
          </div>
        </Panel>
      </Collapse>
    </Modal>
  );
};

export default ErrorModal;