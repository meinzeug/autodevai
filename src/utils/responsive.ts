interface LayoutConfig {
  desktop?: any;
  tablet?: any;  
  mobile?: any;
}

export const getOptimalLayout = (config: LayoutConfig, screenSize: string) => {
  if (!config) return null;
  
  switch (screenSize) {
    case 'mobile':
      return config.mobile || config.tablet || config.desktop;
    case 'tablet':
      return config.tablet || config.desktop;
    case 'desktop':
    default:
      return config.desktop || config.tablet;
  }
};
