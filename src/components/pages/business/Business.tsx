import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, Clock, CreditCard, Users, Headphones, Package, ArrowRight, CheckCircle2, Star, Hotel, Dumbbell, Scissors, Building, UtensilsCrossed, GraduationCap, Theater, Briefcase, Shirt, Wrench, Receipt, UserPlus, Bell } from 'lucide-react';

const Business: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Building2,
      title: "Tailored Solutions",
      description: "Custom laundry packages designed for your business needs",
      color: "bg-blue-600",
      lightColor: "bg-blue-50"
    },
    {
      icon: Clock,
      title: "Priority Service",
      description: "Dedicated pickup slots and faster turnaround times",
      color: "bg-purple-600",
      lightColor: "bg-purple-50"
    },
    {
      icon: CreditCard,
      title: "Flexible Billing",
      description: "Monthly invoicing and automated payment options",
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Multiple user accounts for your staff members",
      color: "bg-amber-600",
      lightColor: "bg-amber-50"
    }
  ];

  const industries = [
    { icon: Hotel, name: "Hotels & BnBs" },
    { icon: Dumbbell, name: "Gyms & Fitness Centers" },
    { icon: Scissors, name: "Salons & Spas" },
    { icon: Building, name: "Offices & Co-working Spaces" },
    { icon: UtensilsCrossed, name: "Restaurants, Catering & Kitchens" },
    { icon: GraduationCap, name: "Schools, Universities, & Daycares" },
    { icon: Theater, name: "Theaters, Studios, Event Spaces" }
  ];

  const services = [
    "Bulk washing, ironing, and folding",
    "Uniform cleaning & maintenance for staff, employees",
    "Towel & linen service for spas, wellness centers",
    "Repairs, stitching, button replacements",
    "Custom pricing based on volume, frequency"
  ];

  const smartFeatures = [
    {
      icon: Calendar,
      title: "Recurring pickup scheduling",
      description: "Daily, weekly, etc."
    },
    {
      icon: Receipt,
      title: "Monthly invoicing & VAT-compliant billing",
      description: ""
    },
    {
      icon: Package,
      title: "Bulk order tracking dashboard",
      description: "For teams, branches, etc."
    },
    {
      icon: UserPlus,
      title: "Multiple users per business account",
      description: "Different departments, etc."
    },
    {
      icon: Bell,
      title: "Real-time notifications",
      description: "For order status, delivery, etc."
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Eazyy Business Solutions
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Professional laundry services tailored for businesses. Streamline your operations with our dedicated B2B solutions.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.button
              onClick={() => navigate('/business/register')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
            <motion.button
              onClick={() => navigate('/business/contact')}
              className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact Sales
              <Headphones className="w-5 h-5 ml-2" />
            </motion.button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className={`${feature.lightColor} rounded-2xl p-6`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
            >
              <div className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4`}>
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Industries We Serve */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Industries We Serve</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {industries.map((industry, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <industry.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">{industry.name}</h3>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-6">
            We work with all business types — if you have laundry, we've got you covered.
          </p>
        </motion.div>

        {/* Services for Businesses */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Services for Businesses</h2>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-gray-700">{service}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Smart Features for Business Clients */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Smart Features for Business Clients</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {smartFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                </div>
                {feature.description && (
                  <p className="text-sm text-gray-600 ml-13">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Business;