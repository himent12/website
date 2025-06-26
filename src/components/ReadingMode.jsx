import React from 'react';
import { useMobile } from '../contexts/MobileContext';
import MobileReadingMode from './MobileReadingMode';
import DesktopReadingMode from './DesktopReadingMode';

const ReadingMode = () => {
  const mobile = useMobile();
  
  // Conditionally render mobile or desktop version
  if (mobile.isMobile) {
    return <MobileReadingMode />;
  }
  
  return <DesktopReadingMode />;
};

export default ReadingMode;
