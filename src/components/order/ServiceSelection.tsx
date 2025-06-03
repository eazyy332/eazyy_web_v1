import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Shirt, Wind, Scissors, Camera, ArrowRight, Brush } from 'lucide-react';
import { useServices } from '../../contexts/ServicesContext';

const ServiceSelection: React.FC = () => {
  const navigate = useNavigate();
  const { services } = useServices();

  // Fallback service definitions if data isn't loaded yet
  const fallbackServices = [
    {
      id: 'easy-bag',
      icon: Package,
      title: 'Regular Laundry',
      description: 'Professional washing and drying',
      price: 9.99,
      unit: 'per kg',
      color_hex: '#5078bb',
      route: '/order/items/easy-bag',
      type: 'standard'
    },
    {
      id: 'wash-iron',
      icon: Shirt,
      title: 'Wash and Iron',
      description: 'Wash and ironing laundry',
      price: 5.00,
      unit: 'per kg',
      color_hex: '#e54035',
      route: '/order/items/wash-iron',
      type: 'standard'
    },
    {
      id: 'dry-cleaning',
      icon: Wind,
      title: 'Dry Cleaning',
      description: 'Expert care for delicate items',
      price: 14.99,
      unit: 'per item',
      color_hex: '#32a354',
      route: '/order/items/dry-cleaning',
      type: 'standard'
    },
    {
      id: 'repairs',
      icon: Scissors,
      title: 'Repairs & Alterations',
      description: 'Custom fits and repairs',
      price: 19.99,
      unit: 'per service',
      color_hex: '#f7bd16',
      route: '/order/items/repairs',
      type: 'standard'
    },
    {
      id: 'special-care',
      icon: Brush,
      title: 'Special Care',
      description: 'Specialized cleaning for unique items',
      price: 18.00,
      unit: 'per m²',
      color_hex: '#32a354',
      route: '/order/items/special-care',
      type: 'standard'
    },
    {
      id: 'custom',
      icon: Camera,
      title: 'Custom Quote',
      description: 'Get a quote for special items',
      price: null,
      unit: 'custom',
      color_hex: '#5078bb',
      route: '/order/custom-quote',
      type: 'quote'
    }
  ];

  // Map database services to UI services
  const mappedServices = services.length > 0 
    ? services.map(service => {
        // Find the icon component based on service_identifier
        let IconComponent;
        switch (service.service_identifier) {
          case 'easy-bag': IconComponent = Package; break;
          case 'wash-iron': IconComponent = Shirt; break;
          case 'dry-cleaning': IconComponent = Wind; break;
          case 'repairs': IconComponent = Scissors; break;
          case 'special-care': IconComponent = Brush; break;
          case 'custom': IconComponent = Camera; break;
          default: IconComponent = Package;
        }

        // Map route based on service_identifier
        const route = service.service_identifier === 'custom' 
          ? '/order/custom-quote' 
          : `/order/items/${service.service_identifier}`;

        return {
          id: service.service_identifier,
          icon: IconComponent,
          title: service.name,
          description: service.short_description,
          price: service.price_starts_at,
          unit: service.price_unit,
          color_hex: service.color_hex || '#5078bb', // Use color_hex from database or fallback
          route,
          type: service.service_identifier === 'custom' ? 'quote' : 'standard'
        };
      })
    : fallbackServices;

  const handleServiceSelect = (route: string, type: string) => {
    navigate(route, { state: { type } });
  };

  // Helper function to generate tailwind-compatible background color classes
  const getBackgroundStyle = (hexColor: string) => {
    return { backgroundColor: hexColor };
  };

  // Helper function to generate tailwind-compatible light background color
  const getLightBackgroundStyle = (hexColor: string) => {
    return { backgroundColor: `${hexColor}20` }; // 20 is hex for 12% opacity
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose a Service
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Select the service that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {mappedServices.map((service) => (
            <motion.div
              key={service.id}
              onClick={() => handleServiceSelect(service.route, service.type)}
              style={getLightBackgroundStyle(service.color_hex)}
              className="rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center mb-4">
                <div 
                  style={getBackgroundStyle(service.color_hex)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                >
                  <service.icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  {service.price !== null ? (
                    <>
                      <span className="text-lg font-bold text-gray-900">
                        From €{service.price.toFixed(2)}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {service.unit}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      Custom Pricing
                    </span>
                  )}
                </div>
                <motion.div
                  style={getBackgroundStyle(service.color_hex)}
                  className="text-white px-3 py-1 rounded-lg flex items-center"
                  whileHover={{ x: 5 }}
                >
                  <span className="text-sm font-medium mr-1">
                    {service.type === 'quote' ? 'Get Quote' : 'Select'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 flex justify-between">
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center px-4 sm:px-6 py-2 sm:py-3 text-gray-600 hover:text-gray-900 transition-colors"
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceSelection;