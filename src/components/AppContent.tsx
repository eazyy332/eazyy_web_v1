import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './Header';
import Hero from './Hero';
import Footer from './Footer';
import { useCart } from './cart/CartContext';
import Loader from './Loader';

// Lazy loaded components
const HowItWorks = lazy(() => import('./HowItWorks'));
const WhatEazyyOffers = lazy(() => import('./WhatEazyyOffers'));
const WhyChooseEazyy = lazy(() => import('./WhyChooseEazyy'));
const FAQ = lazy(() => import('./FAQ'));
const ServiceSelection = lazy(() => import('./order/ServiceSelection'));
const WashAndIronItems = lazy(() => import('./order/items/WashAndIronItems'));
const DryCleaningItems = lazy(() => import('./order/items/DryCleaningItems'));
const RepairItems = lazy(() => import('./order/items/RepairItems'));
const EazyBagItems = lazy(() => import('./order/items/EazyBagItems'));
const SpecialCareItems = lazy(() => import('./order/items/SpecialCareItems'));
const AddressSelection = lazy(() => import('./order/AddressSelection'));
const SchedulePickup = lazy(() => import('./order/SchedulePickup'));
const OrderConfirmation = lazy(() => import('./order/OrderConfirmation'));
const OrderSuccess = lazy(() => import('./order/OrderSuccess'));
const CustomPriceRequest = lazy(() => import('./order/CustomPriceRequest'));
const QuoteConfirmation = lazy(() => import('./order/QuoteConfirmation'));
const CarpetCleaning = lazy(() => import('./order/CarpetCleaning'));
const Support = lazy(() => import('./pages/Support'));
const DeleteRequest = lazy(() => import('./pages/DeleteRequest'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const Contact = lazy(() => import('./pages/Contact'));
const Careers = lazy(() => import('./pages/Careers'));
const Blog = lazy(() => import('./pages/Blog'));
const Press = lazy(() => import('./pages/Press'));
const Partners = lazy(() => import('./pages/Partners'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Products = lazy(() => import('../pages/Products'));
const LoginForm = lazy(() => import('./auth/LoginForm'));
const RegisterForm = lazy(() => import('./auth/RegisterForm'));
const AuthCallback = lazy(() => import('./auth/AuthCallback'));
const Profile = lazy(() => import('./account/Profile'));
const Orders = lazy(() => import('./account/Orders'));
const Settings = lazy(() => import('./account/Settings'));
const Quotes = lazy(() => import('./account/Quotes'));
const Business = lazy(() => import('./pages/business/Business'));
const BusinessRegistration = lazy(() => import('./pages/business/BusinessRegistration'));
const BusinessSuccess = lazy(() => import('./pages/business/BusinessSuccess'));
const BusinessDashboard = lazy(() => import('./pages/business/BusinessDashboard'));
const BusinessBilling = lazy(() => import('./pages/business/BusinessBilling'));
const BusinessTeam = lazy(() => import('./pages/business/BusinessTeam'));
const BusinessReports = lazy(() => import('./pages/business/BusinessReports'));
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const ItemConfirmation = lazy(() => import('../pages/orders/item-confirmation/[orderId]'));
const SEO = lazy(() => import('./SEO'));
const ShoppingCart = lazy(() => import('./cart/ShoppingCart'));
const OrderBuilder = lazy(() => import('./order/OrderBuilder'));
const QuoteDetailPage = lazy(() => import('../pages/quotes/QuoteDetailPage'));
const CheckoutSuccess = lazy(() => import('../pages/checkout/Success'));
const CheckoutCanceled = lazy(() => import('../pages/checkout/Canceled'));
const CheckoutPayment = lazy(() => import('../pages/checkout/Payment'));

const HomePage = () => (
  <main>
    <SEO />
    <Hero />
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader /></div>}>
      <HowItWorks />
    </Suspense>
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader /></div>}>
      <WhatEazyyOffers />
    </Suspense>
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader /></div>}>
      <WhyChooseEazyy />
    </Suspense>
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader /></div>}>
      <FAQ />
    </Suspense>
  </main>
);

const AppContent: React.FC = () => {
  const { upgradeCart, clearCart } = useCart();
  const [scrollY, setScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const upgradedCartData = upgradeCart(parsedCart);

        localStorage.setItem('cart', JSON.stringify(upgradedCartData));
      } catch (error) {
        console.error('Failed to parse or upgrade cart from localStorage:', error);
        clearCart(); // Clear the cart if migration fails
      }
    }
  }, [upgradeCart, clearCart]);

  const isOrderingRoute = location.pathname.startsWith('/order/');
  const isAdminRoute = location.pathname.startsWith('/admin/');

  return (
    <div className="relative overflow-hidden">
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
        <SEO />
      </Suspense>
      {!isAdminRoute && <Header scrollY={scrollY} />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Main Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <About />
            </Suspense>
          } />
          <Route path="/services" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Services />
            </Suspense>
          } />
          <Route path="/products" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Products />
            </Suspense>
          } />
          
          {/* Business Routes */}
          <Route path="/business" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Business />
            </Suspense>
          } />
          <Route path="/business/register" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessRegistration />
            </Suspense>
          } />
          <Route path="/business/success" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessSuccess />
            </Suspense>
          } />
          <Route path="/business/dashboard" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessDashboard />
            </Suspense>
          } />
          <Route path="/business/billing" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessBilling />
            </Suspense>
          } />
          <Route path="/business/team" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessTeam />
            </Suspense>
          } />
          <Route path="/business/reports" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <BusinessReports />
            </Suspense>
          } />
          
          {/* Order Flow Routes */}
          <Route path="/order/service" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <OrderBuilder />
            </Suspense>
          } />
          <Route path="/order/items/wash-iron" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <WashAndIronItems />
            </Suspense>
          } />
          <Route path="/order/items/dry-cleaning" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <DryCleaningItems />
            </Suspense>
          } />
          <Route path="/order/items/repairs" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <RepairItems />
            </Suspense>
          } />
          <Route path="/order/items/easy-bag" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <EazyBagItems />
            </Suspense>
          } />
          <Route path="/order/items/special-care" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <SpecialCareItems />
            </Suspense>
          } />
          <Route path="/order/carpet-cleaning" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CarpetCleaning />
            </Suspense>
          } />
          <Route path="/order/address" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <AddressSelection />
            </Suspense>
          } />
          <Route path="/order/schedule" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <SchedulePickup />
            </Suspense>
          } />
          <Route path="/order/confirmation" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <OrderConfirmation />
            </Suspense>
          } />
          <Route path="/order/success" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <OrderSuccess />
            </Suspense>
          } />
          <Route path="/order/custom-quote" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CustomPriceRequest />
            </Suspense>
          } />
          <Route path="/order/quote-confirmation" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <QuoteConfirmation />
            </Suspense>
          } />
          <Route path="/cart" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <ShoppingCart />
            </Suspense>
          } />
          
          {/* Checkout Routes */}
          <Route path="/checkout/success" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CheckoutSuccess />
            </Suspense>
          } />
          <Route path="/checkout/canceled" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CheckoutCanceled />
            </Suspense>
          } />
          <Route path="/checkout/payment" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CheckoutPayment />
            </Suspense>
          } />
          
          {/* Auth Routes */}
          <Route path="/login" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <LoginForm />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <RegisterForm />
            </Suspense>
          } />
          <Route path="/auth/callback" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <AuthCallback />
            </Suspense>
          } />
          
          {/* Account Routes */}
          <Route path="/account/profile" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Profile />
            </Suspense>
          } />
          <Route path="/account/orders" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Orders />
            </Suspense>
          } />
          <Route path="/account/quotes" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Quotes />
            </Suspense>
          } />
          <Route path="/account/settings" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Settings />
            </Suspense>
          } />
          <Route path="/orders/item-confirmation/:orderId" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <ItemConfirmation />
            </Suspense>
          } />
          <Route path="/quotes/:id" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <QuoteDetailPage />
            </Suspense>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <AdminLogin />
            </Suspense>
          } />
          <Route path="/admin/dashboard" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Dashboard />
            </Suspense>
          } />
          
          {/* Support & Legal Pages */}
          <Route path="/support" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Support />
            </Suspense>
          } />
          <Route path="/delete-account" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <DeleteRequest />
            </Suspense>
          } />
          <Route path="/privacy" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <PrivacyPolicy />
            </Suspense>
          } />
          <Route path="/terms" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <TermsOfService />
            </Suspense>
          } />
          <Route path="/cookies" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <CookiePolicy />
            </Suspense>
          } />
          <Route path="/contact" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Contact />
            </Suspense>
          } />
          
          {/* Business Pages */}
          <Route path="/careers" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Careers />
            </Suspense>
          } />
          <Route path="/blog" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Blog />
            </Suspense>
          } />
          <Route path="/press" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Press />
            </Suspense>
          } />
          <Route path="/partners" element={
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <Partners />
            </Suspense>
          } />
        </Routes>
      </AnimatePresence>
      {!isOrderingRoute && !isAdminRoute && <Footer />}
    </div>
  );
};

export default AppContent;