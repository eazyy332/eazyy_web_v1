import React from 'react';
import { Wind } from 'lucide-react';
import BaseItemSelection from './BaseItemSelection';
import { useServices } from '../../../contexts/ServicesContext';

const DryCleaningItems: React.FC = () => {
  const { services } = useServices();
  const service = services.find(s => s.service_identifier === 'dry-cleaning');

  const serviceInfo = {
    id: service?.service_identifier || 'dry-cleaning',
    name: service?.name || 'Dry Cleaning',
    icon: Wind,
    color: service?.color_scheme?.primary || 'bg-emerald-600',
    lightColor: service?.color_scheme?.secondary || 'bg-emerald-50',
    color_hex: service?.color_hex || '#32a354', // Use color_hex from database or fallback
    description: service?.short_description || 'Professional dry cleaning for delicate items',
    features: service?.features || []
  };

  return (
    <BaseItemSelection
      service="dry-cleaning"
      serviceInfo={serviceInfo}
    />
  );
};

export default DryCleaningItems;