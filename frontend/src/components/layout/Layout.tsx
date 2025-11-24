import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Base layout component with header and footer
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">
                ShopSavr™
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/coupons"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Coupons
              </Link>
              <Link
                to="/receipts"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Receipts
              </Link>
              <Link
                to="/alerts"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Price Alerts
              </Link>
              <Link
                to="/login"
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ShopSavr™
              </h3>
              <p className="text-sm text-gray-600">
                Intelligent Coupon & Deal Finder
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="/features" className="hover:text-primary-600">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-primary-600">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="/terms" className="hover:text-primary-600">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-primary-600">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Support
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="/contact" className="hover:text-primary-600">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="hover:text-primary-600">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              © 2025 Joud Holdings, BidayaX, and Divitiae Good Doers Inc. -
              NPO: 2023-001341848
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;

