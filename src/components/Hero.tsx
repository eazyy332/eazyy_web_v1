import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Camera } from 'lucide-react';
import { Check } from 'lucide-react';
import Logo from './Logo';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-white"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* Soft wave patterns */}
        <div className="absolute inset-0 opacity-5">
          <svg viewBox="0 0 1440 320" className="w-full h-full absolute bottom-0">
            <path fill="rgba(59, 130, 246, 0.3)" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
          <svg viewBox="0 0 1440 320" className="w-full h-full absolute bottom-0" style={{transform: 'translateY(20%)'}}>
            <path fill="rgba(59, 130, 246, 0.2)" fillOpacity="1" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,144C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        {/* Floating bubbles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-500 opacity-5"
            style={{
              width: Math.random() * 80 + 40,
              height: Math.random() * 80 + 40,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100],
              opacity: [0.05, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center">
        {/* Right side - Image (moved up in the order for mobile) */}
        <motion.div 
          className="md:w-1/2 flex justify-center mx-auto md:mx-0 scale-110 md:scale-125 lg:scale-135 mb-8 md:mb-0 md:order-2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative">
            <img 
              src="/aQMYeUbQ (1).jpeg" 
              alt="Eazyy Delivery Service" 
              className="w-[600px] h-auto rounded-[45px] shadow-2xl"
            />
            
            {/* Floating elements */}
            <motion.div 
              className="absolute -top-8 -right-8 w-16 h-16 bg-blue-500 rounded-full opacity-10"
              animate={{ 
                y: [0, -20, 0],
                x: [0, 10, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute -bottom-10 -left-10 w-20 h-20 bg-purple-500 rounded-full opacity-10"
              animate={{ 
                y: [0, 20, 0],
                x: [0, -10, 0],
                scale: [1, 1.3, 1]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 1
              }}
            />
          </div>
        </motion.div>
        
        {/* Left side - Text content */}
        <motion.div
          className="md:w-1/2 text-center md:text-left md:order-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight">
            Clean laundry without effort
          </h1>
          
          <motion.div 
            className="text-xl lg:text-2xl max-w-xl lg:max-w-2xl mb-6 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <span className="font-medium"><span className="text-blue-600">Always</span> <span className="text-gray-800">freshly washed</span></span>
            <span className="font-medium"><span className="text-blue-600">Always</span> <span className="text-gray-800">picked up & delivered for free</span></span>
            <span className="font-medium"><span className="text-blue-600">Always</span> <span className="text-gray-800">effortlessly clean</span></span>
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <motion.button
              onClick={() => navigate('/order/service')}
              className="w-full sm:w-auto px-8 py-4 bg-[#2563eb] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule a Pickup
            </motion.button>
            
            <motion.button
              onClick={() => navigate('/order/custom-quote')}
              className="w-full sm:w-auto px-8 py-4 bg-[#4f46e5] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Camera className="w-5 h-5 mr-2" />
              Request Custom Quote
            </motion.button>
          </motion.div>
          
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-6 text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span>Free Pickup & Delivery</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span>24-Hour Turnaround</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;