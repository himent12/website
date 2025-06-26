import React from 'react';
import { useMobile } from '../contexts/MobileContext';
import MobileTabContainer from './MobileTabContainer';
import DesktopTabContainer from './DesktopTabContainer';

const TabContainer = () => {
  const mobile = useMobile();
  
  // Conditionally render mobile or desktop version
  if (mobile.isMobile) {
    return <MobileTabContainer />;
  }
  
  return <DesktopTabContainer />;
};

export default TabContainer;
