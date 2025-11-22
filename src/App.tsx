import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext"; // Import LocationProvider

// Pages
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLogin";
import ShopAll from "./pages/ShopAll";
import AllThemes from "./pages/AllThemes";
import ThemePage from "./pages/ThemePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SearchResults from "./pages/SearchResults";
import Cart from "./pages/Cart";
import CheckoutPage from "./pages/CheckoutPage";
import OrderPage from "./pages/OrderPage";
import ProfilePage from "./pages/ProfilePage"; 
import HelpPage from "./pages/HelpPage";
import ReturnPolicyPage from "./pages/ReturnPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import NotFound from "./pages/NotFound";

// Dashboards
import AdminDashboard from "./pages/AdminDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import WholesalerDashboard from "./pages/WholesalerDashboard";
import RetailerPaymentPage from "./pages/RetailerPaymentPage"; 

import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        {/* Wrap the application with LocationProvider so location is available globally */}
        <LocationProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/shop-all" element={<ShopAll />} />
              <Route path="/themes" element={<AllThemes />} />
              <Route path="/theme/:themeId" element={<ThemePage />} />
              <Route path="/product/:productId" element={<ProductDetailPage />} />
              <Route path="/search" element={<SearchResults />} />
              
              {/* Protected Dashboards */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/retailer/dashboard" element={
                <ProtectedRoute role="retailer"><RetailerDashboard /></ProtectedRoute>
              } />
              <Route path="/retailer/payment" element={
                <ProtectedRoute role="retailer"><RetailerPaymentPage /></ProtectedRoute>
              } />
               <Route path="/wholesaler/dashboard" element={
                <ProtectedRoute role="wholesaler"><WholesalerDashboard /></ProtectedRoute>
              } />

              {/* Shopping Flow */}
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              
              <Route path="/order/:orderId" element={<OrderPage />} /> 
              
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/return-policy" element={<ReturnPolicyPage />} />
              <Route path="/terms" element={<TermsAndConditionsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LocationProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;