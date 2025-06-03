import React from 'react';
import { Brush } from 'lucide-react';
import BaseItemSelection from './BaseItemSelection';
import { useServices } from '../../../contexts/ServicesContext';

const SpecialCareItems: React.FC = () => {
  const { services } = useServices();
  const service = services.find(s => s.service_identifier === 'special-care') || {
    service_identifier: 'special-care',
    name: 'Special Care',
    short_description: 'Specialized cleaning for unique items',
    color_scheme: {
      primary: 'bg-cyan-600',
      secondary: 'bg-cyan-50'
    },
    features: [
      'Expert handling of specialty items',
      'Custom cleaning solutions',
      'Detailed inspection process',
      'Specialized equipment',
      'Careful packaging and handling',
      'Quality guarantee'
    ]
  };

  const serviceInfo = {
    id: service.service_identifier,
    name: service.name || 'Special Care',
    icon: Brush,
    color: service.color_scheme?.primary || 'bg-cyan-600',
    lightColor: service.color_scheme?.secondary || 'bg-cyan-50',
    color_hex: service.color_hex || '#32a354', // Use color_hex from database or fallback to green
    description: service.short_description || 'Specialized cleaning for unique items',
    features: service.features || []
  };

  return (
    <BaseItemSelection
      service="special-care"
      serviceInfo={serviceInfo}
    />
  );
};

export default SpecialCareItems;