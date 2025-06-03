import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, X, HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuoteDetailProps {
  quote: {
    id: string;
    item_name: string;
    description: string;
    image_url: string[];
    status: 'pending' | 'quoted' | 'accepted' | 'declined';
    created_at: string;
    admin_price?: number;
    admin_note?: string;
    facility_name?: string;
    estimated_days?: number;
  };
  onAccept: () => void;
  onDecline: () => void;
  onBack?: () => void;
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({ 
  quote, 
  onAccept, 
  onDecline,
  onBack 
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with back button */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          {onBack && (
            <motion.button
              onClick={onBack}
              className="mr-3 p-1 rounded-full hover:bg-white/20"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <h2 className="font-bold text-lg">Custom Price Quote</h2>
        </div>
        <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
          {quote.status === 'quoted' ? 'Quote Ready' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </div>
      </div>

      {/* Item Overview Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="w-full md:w-1/3">
            {quote.image_url && quote.image_url.length > 0 ? (
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img 
                  src={quote.image_url[0]} 
                  alt={quote.item_name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
          
          {/* Item Details */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{quote.item_name}</h3>
            
            <div className="flex items-center text-gray-500 mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Submitted on {formatDate(quote.created_at)}</span>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-gray-700 whitespace-pre-line">{quote.description}</p>
            </div>
            
            {/* Additional Images */}
            {quote.image_url && quote.image_url.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {quote.image_url.slice(1).map((url, index) => (
                  <div key={index} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img 
                      src={url} 
                      alt={`${quote.item_name} - ${index + 2}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quote Details Section */}
      {quote.status === 'quoted' && (
        <div className="p-6 border-b border-gray-100">
          {/* Facility Comment */}
          {quote.admin_note && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Facility Comment</h4>
              <p className="text-blue-700">{quote.admin_note}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price */}
            <div className="bg-green-50 rounded-xl p-4 flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-green-700">Quoted Price</div>
                <div className="text-2xl font-bold text-green-800">
                  €{quote.admin_price?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
            
            {/* Time Estimate */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-blue-700">Estimated Return</div>
                <div className="text-lg font-medium text-blue-800">
                  {quote.estimated_days || '3–4'} working days
                </div>
              </div>
            </div>
          </div>
          
          {/* Facility */}
          {quote.facility_name && (
            <div className="mt-6 flex items-center text-gray-600">
              <MapPin className="w-5 h-5 mr-2 text-gray-400" />
              <span>{quote.facility_name || 'Eazyy Facility Amsterdam'}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {quote.status === 'quoted' && (
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <motion.button
                onClick={onDecline}
                className="w-full flex items-center justify-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <X className="w-5 h-5 mr-2 text-red-500" />
                Decline Quote
              </motion.button>
              
              <AnimatedTooltip 
                show={showTooltip} 
                text="Declining will cancel this order request" 
              />
            </div>
            
            <motion.button
              onClick={onAccept}
              className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Accept Quote & Continue
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

// Animated tooltip component
const AnimatedTooltip: React.FC<{ show: boolean; text: string }> = ({ show, text }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none"
  >
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
    {text}
  </motion.div>
);

export default QuoteDetail;