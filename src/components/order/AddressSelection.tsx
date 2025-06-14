import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

interface Address {
  id: string;
  name: string;
  street: string;
  house_number: string;
  additional_info?: string;
  city: string;
  postal_code: string;
  is_default?: boolean;
}

const AddressSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street: '',
    house_number: '',
    additional_info: '',
    city: '',
    postal_code: ''
  });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'nl' },
    },
    debounce: 300,
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!user) {
      const returnPath = location.pathname;
      const orderData = location.state;
      
      localStorage.setItem('returnTo', returnPath);
      if (orderData) {
        localStorage.setItem('orderData', JSON.stringify(orderData));
      }
      
      navigate('/login', { 
        state: { 
          returnTo: returnPath,
          orderData 
        }
      });
      return;
    }

    fetchSavedAddresses();
  }, [user, navigate, location]);

  const fetchSavedAddresses = async () => {
    if (!user) return;

    try {
      const { data: addresses, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;

      if (addresses) {
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        }
      }
    
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setError('Failed to load addresses');
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setValue(suggestion.description, false);
    clearSuggestions();
    setShowSuggestions(false);

    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = await getLatLng(results[0]);
      
      const addressComponents = results[0].address_components;
      let streetName = '';
      let houseNumber = '';
      let city = '';
      let postalCode = '';

      for (const component of addressComponents) {
        const types = component.types;
        if (types.includes('street_number')) {
          houseNumber = component.long_name;
        } else if (types.includes('route')) {
          streetName = component.long_name;
        } else if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name;
        }
      }

      setNewAddress({
        ...newAddress,
        street: streetName,
        house_number: houseNumber,
        city,
        postal_code: postalCode
      });
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get address details');
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([
          {
            user_id: user.id,
            name: newAddress.name,
            street: newAddress.street,
            house_number: newAddress.house_number,
            additional_info: newAddress.additional_info || null,
            city: newAddress.city,
            postal_code: newAddress.postal_code,
            is_default: savedAddresses.length === 0
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSavedAddresses(prev => [...prev, data]);
      setSelectedAddress(data.id);
      setShowNewAddressForm(false);
      clearSuggestions();
    } catch (error) {
      console.error('Error saving address:', error);
      setError('Failed to save address');
    }
  };

  const handleContinue = () => {
    if (selectedAddress) {
      const address = savedAddresses.find(addr => addr.id === selectedAddress);
      if (address) {
        const fullAddress = `${address.street} ${address.house_number}${address.additional_info ? `, ${address.additional_info}` : ''}`;
        navigate('/order/schedule', {
          state: { 
            ...location.state,
            address: {
              street: fullAddress,
              city: address.city,
              postal_code: address.postal_code
            }
          }
        });
      }
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      await fetchSavedAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      setError('Failed to set default address');
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      await fetchSavedAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      setError('Failed to delete address');
    }
  };

  return (
    <div className="min-h-screen pt-safe pb-safe px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto pt-24 pb-12"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Select Delivery Address
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Choose where you'd like your clean laundry delivered
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 rounded-xl text-red-600 text-sm flex items-start"
          >
            <Info className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {savedAddresses.length > 0 && !showNewAddressForm && (
          <div className="space-y-4 mb-8">
            {savedAddresses.map((address) => (
              <motion.div
                key={address.id}
                onClick={() => setSelectedAddress(address.id)}
                className={`w-full p-6 rounded-xl text-left transition-all duration-300 ${
                  selectedAddress === address.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white hover:bg-gray-50 text-gray-800 shadow hover:shadow-md'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center mb-1">
                      <h3 className="text-lg font-bold">{address.name}</h3>
                      {address.is_default && (
                        <span className={`ml-2 text-sm ${
                          selectedAddress === address.id ? 'text-white/80' : 'text-blue-600'
                        }`}>
                          (Default)
                        </span>
                      )}
                    </div>
                    <p className={selectedAddress === address.id ? 'text-white/90' : 'text-gray-600'}>
                      {address.street} {address.house_number}
                      {address.additional_info && <span>, {address.additional_info}</span>}
                      <br />
                      {address.postal_code} {address.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultAddress(address.id);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        selectedAddress === address.id
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Set Default
                    </motion.button>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAddress(address.id);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        selectedAddress === address.id
                          ? 'bg-white/20 text-white'
                          : 'bg-red-100 text-red-600'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Delete
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {(showNewAddressForm || savedAddresses.length === 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Address</h3>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Name
                </label>
                <input
                  type="text"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="e.g., Home, Office"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Address
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setShowSuggestions(true);
                    }}
                    disabled={!ready}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="Start typing your address..."
                  />
                </div>

                {status === "OK" && showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-auto"
                  >
                    {data.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelect(suggestion)}
                      >
                        <p className="text-gray-900">{suggestion.description}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street
                  </label>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="Street name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    House Number
                  </label>
                  <input
                    type="text"
                    value={newAddress.house_number}
                    onChange={(e) => setNewAddress({ ...newAddress, house_number: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="House number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Info (Optional)
                </label>
                <input
                  type="text"
                  value={newAddress.additional_info}
                  onChange={(e) => setNewAddress({ ...newAddress, additional_info: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Apartment number, floor, etc."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="City"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="Postal code"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                {savedAddresses.length > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-900"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                )}
                <motion.button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Save Address
                </motion.button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setShowNewAddressForm(true)}
            className="w-full p-6 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-all duration-300 flex items-center mb-8"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4">
              <Plus className="text-blue-600" />
            </div>
            <span className="font-medium text-gray-900">Add New Address</span>
          </motion.button>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <motion.button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 text-gray-600 hover:text-gray-900"
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </motion.button>

          <motion.button
            onClick={handleContinue}
            className={`w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              selectedAddress
                ? 'bg-blue-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={selectedAddress ? { scale: 1.05 } : {}}
            whileTap={selectedAddress ? { scale: 0.95 } : {}}
            disabled={!selectedAddress}
          >
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddressSelection;