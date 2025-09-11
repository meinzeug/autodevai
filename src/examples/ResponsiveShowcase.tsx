import React from 'react';
import {
  useBreakpoint,
  useWindowSize,
  useDeviceInfo,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardContent,
  HeroText,
  TitleText,
  BodyText,
  CardGrid,
  FeatureGrid,
  ProductGrid,
  InteractiveCard,
  FeatureCard,
  ProductCard,
} from '../components/responsive';

/**
 * Comprehensive showcase of responsive components and breakpoint-specific behaviors
 */
export const ResponsiveShowcase: React.FC = () => {
  const breakpoint = useBreakpoint();
  const windowSize = useWindowSize();
  const deviceInfo = useDeviceInfo();

  return (
    <ResponsiveContainer
      maxWidth={{ xs: '100%', sm: '640px', md: '768px', lg: '1024px', xl: '1280px' }}
      padding={{ xs: '1rem', sm: '1.5rem', md: '2rem', lg: '3rem' }}
      centered
    >
      {/* Breakpoint Information Header */}
      <ResponsiveCard className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <ResponsiveCardHeader bordered>
          <HeroText
            size={{ xs: 'xl', sm: '2xl', md: '3xl', lg: '4xl' }}
            align="center"
            className="text-blue-800"
          >
            Responsive Design System
          </HeroText>
        </ResponsiveCardHeader>
        
        <ResponsiveCardContent>
          <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 4 }} gap={{ xs: '1rem', sm: '1.5rem' }}>
            <ResponsiveCard variant="ghost" className="text-center">
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="text-blue-600">
                Current Breakpoint
              </TitleText>
              <BodyText size={{ xs: 'base', sm: 'lg' }} className="font-mono font-bold">
                {breakpoint.current}
              </BodyText>
            </ResponsiveCard>
            
            <ResponsiveCard variant="ghost" className="text-center">
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="text-green-600">
                Window Size
              </TitleText>
              <BodyText size={{ xs: 'base', sm: 'lg' }} className="font-mono">
                {windowSize.width}×{windowSize.height}
              </BodyText>
            </ResponsiveCard>
            
            <ResponsiveCard variant="ghost" className="text-center">
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="text-purple-600">
                Device Type
              </TitleText>
              <BodyText size={{ xs: 'base', sm: 'lg' }}>
                {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
              </BodyText>
            </ResponsiveCard>
            
            <ResponsiveCard variant="ghost" className="text-center">
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="text-orange-600">
                Touch Device
              </TitleText>
              <BodyText size={{ xs: 'base', sm: 'lg' }}>
                {deviceInfo.isTouch ? '✅ Yes' : '❌ No'}
              </BodyText>
            </ResponsiveCard>
          </ResponsiveGrid>
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* Responsive Typography Showcase */}
      <ResponsiveCard className="mb-8">
        <ResponsiveCardHeader bordered>
          <TitleText size={{ xs: 'xl', sm: '2xl', md: '3xl' }} className="text-gray-800">
            Responsive Typography
          </TitleText>
        </ResponsiveCardHeader>
        
        <ResponsiveCardContent className="space-y-4">
          <div>
            <HeroText
              size={{ xs: '2xl', sm: '3xl', md: '4xl', lg: '5xl' }}
              weight={{ xs: 'bold', md: 'extrabold' }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
            >
              Hero Text Scales
            </HeroText>
          </div>
          
          <div>
            <TitleText
              size={{ xs: 'lg', sm: 'xl', md: '2xl', lg: '3xl' }}
              className="text-gray-700"
            >
              Title Text Adapts to Breakpoints
            </TitleText>
          </div>
          
          <div>
            <BodyText
              size={{ xs: 'sm', sm: 'base', md: 'lg' }}
              leading={{ xs: 'relaxed', md: 'normal' }}
              className="text-gray-600"
            >
              Body text becomes more readable across different screen sizes. On mobile, it uses smaller
              sizes with relaxed line height for better readability, while on larger screens it can
              accommodate larger text with normal spacing.
            </BodyText>
          </div>
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* Responsive Layout Examples */}
      <ResponsiveCard className="mb-8">
        <ResponsiveCardHeader bordered>
          <TitleText size={{ xs: 'xl', sm: '2xl', md: '3xl' }} className="text-gray-800">
            Responsive Layouts
          </TitleText>
        </ResponsiveCardHeader>
        
        <ResponsiveCardContent>
          <div className="space-y-8">
            {/* Feature Grid */}
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-4 text-gray-700">
                Feature Grid (1 → 2 → 3 columns)
              </TitleText>
              
              <FeatureGrid>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <FeatureCard key={item} className="bg-gradient-to-br from-blue-50 to-indigo-100">
                    <ResponsiveCardHeader>
                      <TitleText size={{ xs: 'base', sm: 'lg' }} className="text-blue-700">
                        Feature {item}
                      </TitleText>
                    </ResponsiveCardHeader>
                    <ResponsiveCardContent>
                      <BodyText size={{ xs: 'sm', sm: 'base' }} className="text-blue-600">
                        This feature card adapts its size and spacing based on the current breakpoint.
                      </BodyText>
                    </ResponsiveCardContent>
                  </FeatureCard>
                ))}
              </FeatureGrid>
            </div>

            {/* Product Grid */}
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-4 text-gray-700">
                Product Grid (2 → 3 → 4 → 5 columns)
              </TitleText>
              
              <ProductGrid>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((item) => (
                  <ProductCard 
                    key={item} 
                    className="bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-lg transition-shadow"
                  >
                    <ResponsiveCardContent className="text-center">
                      <div className="w-full h-24 bg-green-200 rounded-md mb-2 flex items-center justify-center">
                        <TitleText size={{ xs: 'sm', sm: 'base' }} className="text-green-700">
                          Item {item}
                        </TitleText>
                      </div>
                      <BodyText size={{ xs: 'xs', sm: 'sm' }} className="text-green-600">
                        Product description
                      </BodyText>
                    </ResponsiveCardContent>
                  </ProductCard>
                ))}
              </ProductGrid>
            </div>

            {/* Interactive Cards */}
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-4 text-gray-700">
                Interactive Cards (Touch Optimized)
              </TitleText>
              
              <CardGrid>
                {['Dashboard', 'Analytics', 'Settings', 'Profile'].map((title) => (
                  <InteractiveCard 
                    key={title}
                    className="bg-gradient-to-br from-purple-50 to-pink-100 hover:from-purple-100 hover:to-pink-200"
                    onClick={() => alert(`Clicked ${title}`)}
                  >
                    <ResponsiveCardHeader>
                      <TitleText size={{ xs: 'base', sm: 'lg' }} className="text-purple-700">
                        {title}
                      </TitleText>
                    </ResponsiveCardHeader>
                    <ResponsiveCardContent>
                      <BodyText size={{ xs: 'sm', sm: 'base' }} className="text-purple-600">
                        This card is optimized for {deviceInfo.isTouch ? 'touch' : 'mouse'} interaction.
                      </BodyText>
                    </ResponsiveCardContent>
                  </InteractiveCard>
                ))}
              </CardGrid>
            </div>
          </div>
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* Responsive Container Examples */}
      <ResponsiveCard className="mb-8">
        <ResponsiveCardHeader bordered>
          <TitleText size={{ xs: 'xl', sm: '2xl', md: '3xl' }} className="text-gray-800">
            Container Layouts
          </TitleText>
        </ResponsiveCardHeader>
        
        <ResponsiveCardContent>
          <div className="space-y-6">
            {/* Mobile: Stack, Tablet: 2 cols, Desktop: 3 cols */}
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-4 text-gray-700">
                Adaptive Container Layout
              </TitleText>
              
              <ResponsiveContainer
                layout={{ xs: 'block', md: 'flex' }}
                flexDirection={{ md: 'row' }}
                gap={{ xs: '1rem', md: '2rem' }}
                className="bg-gray-50 rounded-lg"
              >
                <ResponsiveCard 
                  className="flex-1 bg-white"
                  size={{ xs: 'sm', md: 'md' }}
                >
                  <ResponsiveCardHeader>
                    <TitleText size={{ xs: 'base', sm: 'lg' }} className="text-gray-700">
                      Main Content
                    </TitleText>
                  </ResponsiveCardHeader>
                  <ResponsiveCardContent>
                    <BodyText size={{ xs: 'sm', sm: 'base' }} className="text-gray-600">
                      This content area adapts its layout based on screen size.
                      On mobile, it stacks vertically. On larger screens, it flows horizontally.
                    </BodyText>
                  </ResponsiveCardContent>
                </ResponsiveCard>
                
                <ResponsiveCard 
                  className="bg-white"
                  size={{ xs: 'sm', md: 'md' }}
                  responsiveClasses={{
                    md: 'w-80',  // Fixed width on desktop
                    xs: 'w-full' // Full width on mobile
                  }}
                >
                  <ResponsiveCardHeader>
                    <TitleText size={{ xs: 'base', sm: 'lg' }} className="text-gray-700">
                      Sidebar
                    </TitleText>
                  </ResponsiveCardHeader>
                  <ResponsiveCardContent>
                    <BodyText size={{ xs: 'sm', sm: 'base' }} className="text-gray-600">
                      This sidebar becomes full width on mobile and fixed width on desktop.
                    </BodyText>
                  </ResponsiveCardContent>
                </ResponsiveCard>
              </ResponsiveContainer>
            </div>
          </div>
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* Current Breakpoint Details */}
      <ResponsiveCard>
        <ResponsiveCardHeader bordered>
          <TitleText size={{ xs: 'xl', sm: '2xl', md: '3xl' }} className="text-gray-800">
            Breakpoint Information
          </TitleText>
        </ResponsiveCardHeader>
        
        <ResponsiveCardContent>
          <ResponsiveGrid cols={{ xs: 1, sm: 2 }} gap={{ xs: '1rem', sm: '2rem' }}>
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-3 text-gray-700">
                Current State
              </TitleText>
              <div className="space-y-2 font-mono text-sm">
                <div>Breakpoint: <span className="font-bold text-blue-600">{breakpoint.current}</span></div>
                <div>Index: <span className="font-bold">{breakpoint.index}</span></div>
                <div>Is Mobile: <span className="font-bold">{breakpoint.isMobile ? '✅' : '❌'}</span></div>
                <div>Is Tablet: <span className="font-bold">{breakpoint.isTablet ? '✅' : '❌'}</span></div>
                <div>Is Desktop: <span className="font-bold">{breakpoint.isDesktop ? '✅' : '❌'}</span></div>
              </div>
            </div>
            
            <div>
              <TitleText size={{ xs: 'lg', sm: 'xl' }} className="mb-3 text-gray-700">
                Device Info
              </TitleText>
              <div className="space-y-2 font-mono text-sm">
                <div>Orientation: <span className="font-bold">{deviceInfo.orientation}</span></div>
                <div>Touch Support: <span className="font-bold">{deviceInfo.isTouch ? '✅' : '❌'}</span></div>
                <div>Pixel Ratio: <span className="font-bold">{deviceInfo.pixelRatio}</span></div>
                <div>Window: <span className="font-bold">{windowSize.width}×{windowSize.height}</span></div>
              </div>
            </div>
          </ResponsiveGrid>
        </ResponsiveCardContent>
      </ResponsiveCard>
    </ResponsiveContainer>
  );
};