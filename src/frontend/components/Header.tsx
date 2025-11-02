import React from 'react';
import { Layout, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import Settings from './Settings';

const { Title } = Typography;
const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  
  return (
    <AntHeader
      style={{
        backgroundColor: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: `0 2px 8px ${token.colorBgElevated}`
      }}
    >
      {/* 左侧应用标题 */}
      <div style={{ flex: 1 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 'bold', color: token.colorText }}>
          {t('header.title')}
        </Title>
      </div>
      
      {/* 右侧放置语言选择器 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Settings />
      </div>
    </AntHeader>
  );
};

export default Header;