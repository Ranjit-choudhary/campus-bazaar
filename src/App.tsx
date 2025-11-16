// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import ShopAll from './pages/ShopAll';
import ThemePage from './pages/ThemePage';
import SearchResults from './pages/SearchResults';
import Cart from './pages/Cart';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import AllThemes from './pages/AllThemes';
import { Toaster } from 'sonner';
import { CartProvider } from './contexts/CartContext';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderPage from './pages/OrderPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import AboutUsPage from './pages/AboutUsPage';
import HelpPage from './pages/HelpPage';
import ReturnPolicyPage from './pages/ReturnPolicyPage';
import ProtectedRoute from './components/ProtectedRoute';
import RetailerDashboard from './pages/RetailerDashboard';
import WholesalerDashboard from './pages/WholesalerDashboard'; // --- NEWLY ADDED ---

function App() {
  return (
    <>
      <Router>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/shop-all" element={<ShopAll />} />
            <Route path="/themes" element={<AllThemes />} />
            <Route path="/theme/:themeId" element={<ThemePage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderId" element={<OrderPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/about-us" element={<AboutUsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/return-policy" element={<ReturnPolicyPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Retailer Dashboard Route */}
            <Route element={<ProtectedRoute role="retailer" />}>
              <Route path="/retailer/dashboard" element={<RetailerDashboard />} />
            </Route>
            
            {/* --- NEWLY ADDED ROUTE --- */}
            <Route element={<ProtectedRoute role="wholesaler" />}>
              <Route path="/wholesaler/dashboard" element={<WholesalerDashboard />} />
            </Route>
            {/* --- END OF NEWLY ADDED ROUTE --- */}

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </Router>
      <Toaster richColors />
    </>
  );
}

export default App;