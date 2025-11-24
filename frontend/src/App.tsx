import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ToastProvider from './components/ui/ToastProvider';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import CouponPage from './pages/CouponPage';
import ReceiptScanPage from './pages/ReceiptScanPage';
import AlertsPage from './pages/AlertsPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    ShopSavr™
                  </h1>
                  <p className="text-xl text-gray-600 mb-8">
                    Intelligent Coupon & Deal Finder
                  </p>
                  <p className="text-gray-500">
                    Automatically find and apply the best coupons while you shop
                  </p>
                </div>
              </div>
            }
          />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/coupons" element={<CouponPage />} />
          <Route path="/receipts" element={<ReceiptScanPage />} />
          <Route path="/receipts/:receiptId" element={<ReceiptScanPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

