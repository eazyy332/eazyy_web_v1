import React from 'react';
import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ServicesProvider } from './contexts/ServicesContext';
import { CartProvider } from './components/cart/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppContent from './components/AppContent';
import StripeProvider from './components/stripe/StripeProvider';

function App() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <HelmetProvider>
          <BrowserRouter>
            <LoadingProvider>
              <AuthProvider>
                <ServicesProvider>
                  <CartProvider>
                    <StripeProvider>
                      <AppContent />
                    </StripeProvider>
                  </CartProvider>
                </ServicesProvider>
              </AuthProvider>
            </LoadingProvider>
          </BrowserRouter>
        </HelmetProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

export default App;