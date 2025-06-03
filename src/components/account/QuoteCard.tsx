import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, DollarSign, Image, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../LazyImage';

interface Quote {
  id: string;
  item_name: string;
  description: string;
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  urgency: 'standard' | 'express';
  created_at: string;
  suggested_price?: number;
  image_url: string[];
  admin_price?: number;
  admin_note?: string;
}

interface QuoteCardProps {
  quote: Quote;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    switch (quote.status) {
      case 'pending':
        return (
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </div>
        );
      case 'quoted':
        return (
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
            <Tag className="w-3 h-3 mr-1" />
            Quote Ready
          </div>
        );
      case 'accepted':
        return (
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Accepted
          </div>
        );
      case 'declined':
        return (
          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Declined
          </div>
        );
      default:
        return null;
    }
  };

  const CheckCircleIcon = ({ className }: { className: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const XCircleIcon = ({ className }: { className: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 9L9 15M9 9L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-200"
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/quotes/${quote.id}`)}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{quote.item_name}</h3>
          {getStatusBadge()}
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <Calendar className="w-4 h-4 mr-1.5" />
          <span>{formatDate(quote.created_at)}</span>
          
          {quote.urgency === 'express' && (
            <span className="ml-3 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
              Express
            </span>
          )}
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quote.description}</p>
        
        <div className="flex justify-between items-end">
          <div className="flex items-center">
            {quote.image_url && quote.image_url.length > 0 ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                <LazyImage 
                  src={quote.image_url[0]} 
                  alt={quote.item_name} 
                  className="w-full h-full object-cover"
                  width="48"
                  height="48"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Image className="w-6 h-6 text-gray-400" />
              </div>
            )}
            
            {quote.image_url && quote.image_url.length > 1 && (
              <div className="ml-2 text-xs text-gray-500">
                +{quote.image_url.length - 1} more
              </div>
            )}
          </div>
          
          {quote.status === 'quoted' && (
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-green-600 mr-1" />
              <span className="font-bold text-green-700">
                €{(quote.admin_price || quote.suggested_price || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {quote.status === 'quoted' && (
        <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex justify-between items-center hover:bg-blue-100 transition-colors duration-200">
          <span className="text-sm text-blue-600 font-medium">View Quote Details</span>
          <ArrowRight className="w-4 h-4 text-blue-600" />
        </div>
      )}
    </motion.div>
  );
};

export default QuoteCard;