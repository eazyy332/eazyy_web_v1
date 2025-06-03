import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Building2, ShoppingBag, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from './cart/CartContext';
import Logo from './Logo';

interface HeaderProps {
  scrollY: number;
}

const Header: React.FC<HeaderProps> = ({ scrollY }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { totalItems } = useCart();

  // Close menus when route changes
  useEffect(() => {
    setIsOpen(false);
    setShowProfileMenu(false);
    setShowSignOutConfirm(false);
  }, [location.pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu') && !target.closest('.profile-button')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 bg-opacity-98 backdrop-blur-lg transition-all duration-300 safe-top">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <motion.div 
            className="flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
          >
            <Logo size="small" color="#ffffff" className="h-8 w-auto sm:h-10" />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <motion.button
              onClick={() => navigate('/services')}
              className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Services
            </motion.button>

            <motion.button
              onClick={() => navigate('/business')}
              className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Business
            </motion.button>

            <motion.button
              onClick={() => navigate('/about')}
              className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              About
            </motion.button>

            <motion.button
              onClick={() => navigate('/contact')}
              className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact
            </motion.button>

            <motion.button
              onClick={() => navigate('/order/service')}
              className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="w-5 h-5 inline-block mr-2" />
              Order Now
            </motion.button>

            <motion.button
              onClick={() => navigate('/cart')}
              className="relative text-white hover:text-white/90"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </motion.button>

            {user ? (
              <div className="relative profile-menu">
                <motion.button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="profile-button flex items-center text-white hover:text-white/90"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <User className="w-5 h-5 mr-2" />
                  <span className="font-medium">{profile?.first_name || 'Account'}</span>
                </motion.button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50"
                    >
                      <motion.button
                        onClick={() => navigate('/account/profile')}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                        whileHover={{ x: 5 }}
                      >
                        Profile Settings
                      </motion.button>
                      <motion.button
                        onClick={() => navigate('/account/orders')}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                        whileHover={{ x: 5 }}
                      >
                        My Orders
                      </motion.button>
                      <div className="border-t border-gray-100 my-1" />
                      <motion.button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50"
                        whileHover={{ x: 5 }}
                      >
                        Sign Out
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => navigate('/login')}
                className="text-white hover:text-white/90"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-5 h-5 inline-block mr-2" />
                Sign In
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden space-x-4">
            <motion.button
              onClick={() => navigate('/cart')}
              className="relative text-white hover:text-white/90"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white"
          >
            <div className="px-4 pt-2 pb-safe space-y-1">
              <motion.button
                onClick={() => navigate('/services')}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                whileHover={{ x: 5 }}
              >
                Services
              </motion.button>

              <motion.button
                onClick={() => navigate('/business')}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                whileHover={{ x: 5 }}
              >
                Business
              </motion.button>

              <motion.button
                onClick={() => navigate('/about')}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                whileHover={{ x: 5 }}
              >
                About
              </motion.button>

              <motion.button
                onClick={() => navigate('/contact')}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                whileHover={{ x: 5 }}
              >
                Contact
              </motion.button>

              <motion.button
                onClick={() => navigate('/order/service')}
                className="w-full px-4 py-3 text-left bg-blue-600 text-white rounded-xl font-medium"
                whileHover={{ x: 5 }}
              >
                <ShoppingBag className="w-5 h-5 inline-block mr-2" />
                Order Now
              </motion.button>

              {user ? (
                <>
                  <motion.button
                    onClick={() => navigate('/account/profile')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                    whileHover={{ x: 5 }}
                  >
                    Profile Settings
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/account/orders')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                    whileHover={{ x: 5 }}
                  >
                    My Orders
                  </motion.button>
                  <motion.button
                    onClick={() => setShowSignOutConfirm(true)}
                    className="w-full px-4 py-3 text-left text-red-600 hover:bg-gray-50 rounded-xl"
                    whileHover={{ x: 5 }}
                  >
                    Sign Out
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-xl"
                  whileHover={{ x: 5 }}
                >
                  <User className="w-5 h-5 inline-block mr-2" />
                  Sign In
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSignOutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full modal-mobile-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 ml-4">
                  Sign Out
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to sign out? You'll need to sign in again to access your account.
              </p>

              <div className="flex justify-end space-x-4">
                <motion.button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;