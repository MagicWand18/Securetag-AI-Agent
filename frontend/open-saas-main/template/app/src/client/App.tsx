import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import NavBar from "./components/NavBar/NavBar";
import { ProductSwitcher } from "./components/ProductSwitcher";
import { Sidebar } from "./components/Sidebar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import CookieConsentBanner from "./components/cookie-consent/Banner";
import FloatingLines from "./components/react-bits/FloatingLines";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export default function App() {
  const location = useLocation();
  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === "/" || location.pathname.startsWith("/pricing")
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    if (isMarketingPage) {
      return true;
    }

    const validAppPrefixes = [
      "/dashboard",
      "/sast",
      // "/waf", // WAF is coming soon, hide nav
      // "/osint", // OSINT is coming soon, hide nav
      "/settings",
      "/account",
      "/demo-app",
      "/file-upload",
    ];

    // Coming soon pages should not have the app navbar
    if (location.pathname.startsWith("/waf") || location.pathname.startsWith("/osint")) {
      return false;
    }

    return validAppPrefixes.some((prefix) =>
      location.pathname.startsWith(prefix)
    );
  }, [location, isMarketingPage]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith("/admin");
  }, [location]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  const isComingSoonPage = useMemo(() => {
    return location.pathname.startsWith("/waf") || 
           location.pathname.startsWith("/osint") ||
           location.pathname === "/error";
  }, [location]);

  const isAuthPage = useMemo(() => {
    return [
      '/login',
      '/signup',
      '/request-password-reset',
      '/password-reset',
      '/email-verification',
    ].some(path => location.pathname.startsWith(path));
  }, [location]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <div className={`text-foreground min-h-screen flex flex-col relative ${isMarketingPage ? "bg-background" : "bg-black"} ${isComingSoonPage ? "bg-black" : ""}`}>
        
        {/* Dashboard Background - FloatingLines */}
        {!isMarketingPage && !isComingSoonPage && !isAuthPage && (
          <div className="fixed inset-0 z-0">
              <FloatingLines 
                enabledWaves={['top', 'middle', 'bottom']}
                lineCount={isMobile ? [3, 5, 5] : [10, 15, 20]}
                lineDistance={isMobile ? [12, 10, 8] : [8, 6, 4]}
                bendRadius={5.0}
                bendStrength={-0.5}
                interactive={true}
                parallax={true}
              />
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1">
          {isAdminDashboard ? (
            <Outlet />
          ) : (
            <>
              {shouldDisplayAppNavBar && (
                <NavBar 
                  navigationItems={navigationItems} 
                  centerContent={!isMarketingPage ? <ProductSwitcher /> : undefined}
                />
              )}
              <div className={`w-full flex flex-1`}>
                {shouldDisplayAppNavBar && !isMarketingPage && <Sidebar />}
                <main className="flex-1 w-full">
                  <Outlet />
                </main>
              </div>
            </>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" />
      <CookieConsentBanner />
    </>
  );
}
