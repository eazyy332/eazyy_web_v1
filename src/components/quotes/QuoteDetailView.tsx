import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, X, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../LazyImage';

interface QuoteDetailViewProps {
  quote: {
    id: string;
    item_name: string;
    description: string;
    image_url: string[];
    status: string;
    created_at: string;
    admin_price?: number;
    admin_note?: string;
    facility_name?: string;
    estimated_days?: number;
    suggested_time?: number;
    facility_suggestion_price?: number;
  };
  onAccept: () => void;
  onDecline: () => void;
}

const QuoteDetailView: React.FC<QuoteDetailViewProps> = ({ quote, onAccept, onDecline }) => {
  const navigate = useNavigate();
  
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5">
        <div className="flex items-center mb-4">
          <motion.button
            onClick={() => navigate('/account/quotes')}
            className="mr-3 p-1 rounded-full hover:bg-white/20"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h2 className="text-xl font-bold">Custom Price Quote</h2>
        </div>
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{quote.item_name}</h3>
          <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
            Quote Ready - Awaiting Your Decision
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        {/* Item Image and Details */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Main Image */}
          <div className="w-full md:w-2/5">
            {quote.image_url && quote.image_url.length > 0 ? (
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md">
                <LazyImage 
                  src={quote.image_url[0]} 
                  alt={quote.item_name} 
                  className="w-full h-full object-cover"
                  width="100%"
                  height="100%"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
            
            {/* Submission Date */}
            <div className="mt-3 flex items-center text-gray-500 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Submitted on {formatDate(quote.created_at)}</span>
            </div>
          </div>
          
          {/* Item Details */}
          <div className="flex-1">
            {/* Customer Note */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Your Request</h4>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 whitespace-pre-line">{quote.description}</p>
              </div>
            </div>
            
            {/* Facility Comment */}
            {quote.admin_note && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Facility Comment</h4>
                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                  <p className="text-blue-800">{quote.admin_note}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quote Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Price */}
          <div className="bg-green-50 rounded-xl p-5 flex items-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <DollarSign className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-green-700 mb-1">Quoted Price</div>
              <div className="text-3xl font-bold text-green-800">
                €{(quote.admin_price || quote.facility_suggestion_price || 0).toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Time Estimate */}
          <div className="bg-blue-50 rounded-xl p-5 flex items-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-blue-700 mb-1">Estimated Return</div>
              <div className="text-xl font-medium text-blue-800">
                {quote.suggested_time || quote.estimated_days || '3–4'} working days
              </div>
            </div>
          </div>
        </div>
        
        {/* Facility */}
        {quote.facility_name && (
          <div className="flex items-center text-gray-600 mb-8">
            <MapPin className="w-5 h-5 mr-2 text-gray-400" />
            <span>{quote.facility_name}</span>
          </div>
        )}
        
        {/* Action Buttons */}
        {quote.status === 'quoted' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group w-full sm:w-auto">
              <motion.button
                onClick={onDecline}
                className="w-full flex items-center justify-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-5 h-5 mr-2 text-red-500" />
                Decline Quote
              </motion.button>
              
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                Declining will cancel this order request
              </div>
            </div>
            
            <motion.button
              onClick={onAccept}
              className="w-full sm:w-auto flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-md hover:bg-green-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Accept Quote & Continue
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDetailView;