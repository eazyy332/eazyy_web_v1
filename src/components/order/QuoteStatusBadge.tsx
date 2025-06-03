import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface QuoteStatusBadgeProps {
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  className?: string;
}

const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending Review',
          color: 'bg-yellow-100 text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      case 'quoted':
        return {
          icon: DollarSign,
          text: 'Quote Ready',
          color: 'bg-blue-100 text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          text: 'Accepted',
          color: 'bg-green-100 text-green-800',
          iconColor: 'text-green-600'
        };
      case 'declined':
        return {
          icon: XCircle,
          text: 'Declined',
          color: 'bg-red-100 text-red-800',
          iconColor: 'text-red-600'
        };
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {React.createElement(config.icon, {
        className: `w-4 h-4 ${config.iconColor} mr-1.5`
      })}
      {config.text}
    </motion.div>
  );
};

export default QuoteStatusBadge;