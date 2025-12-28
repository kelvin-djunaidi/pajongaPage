"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { languages } from "../dictionaries/languages";

export default function LocationVerification({ 
  location, 
  onVerificationSuccess, 
  onVerificationFailed,
  onGoBack 
}) {
  const { currentLanguage } = useLanguage();
  const t = languages[currentLanguage];
  
  const [locationStatus, setLocationStatus] = useState('checking');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Location-specific coordinates and settings
  const LOCATION_CONFIGS = {
    pajonga: {
      name: t.patungHasanudin,
      coords: { lat: -5.134270658325992, lng: 119.40510309496293 }, // Patung Hasanudin coordinates
      maxDistance: 30, // 15 meters
      password: "Pajonga2025",
      description: t.pajongaLocationDescription
    },
    pajongaEn: {
      name: t.patungHasanudin,
      coords: { lat: -5.134270658325992, lng: 119.40510309496293 }, // Same coordinates as Pajonga
      maxDistance: 30, // 15 meters
      password: "Pajonga2025",
      description: t.pajongaLocationDescription
    },
    tenri: {
      name: t.bastionButon,
      coords: { lat: -5.1331827372226, lng: 119.40511947108793 }, // Bastion Buton coordinates
      maxDistance: 30, // 15 meters
      password: "Tenri2025",
      description: t.tenriLocationDescription
    },
    tenriEn: {
      name: t.bastionButon,
      coords: { lat: -5.1331827372226, lng: 119.40511947108793 }, // Same coordinates as Tenri
      maxDistance: 30, // 15 meters
      password: "Tenri2025",
      description: t.tenriLocationDescription
    }
  };

  const currentConfig = LOCATION_CONFIGS[location];

  useEffect(() => {
    if (location) {
      checkLocation();
    }
  }, [location]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkLocation = () => {
    console.log(`Checking location for ${location}:`, currentConfig);
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      setLocationStatus('error');
      setShowPasswordInput(true);
      return;
    }
    
    setLocationStatus('checking');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Geolocation success:', position);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        const distance = calculateDistance(
          userLat, 
          userLng, 
          currentConfig.coords.lat, 
          currentConfig.coords.lng
        );
        
        console.log('User location:', { lat: userLat, lng: userLng });
        console.log('Distance to target:', distance, 'meters');
        console.log('Location accuracy:', accuracy, 'meters');
        
        // Check if location accuracy is good enough (within 100 meters)
        if (accuracy > 100) {
          console.log('Location accuracy too low:', accuracy);
          setLocationStatus('denied');
          setShowPasswordInput(true);
          return;
        }
        
        if (distance <= currentConfig.maxDistance) {
          console.log('Location verified successfully');
          setLocationStatus('success');
          setTimeout(() => {
            onVerificationSuccess();
          }, 1500);
        } else {
          console.log('Location too far:', distance);
          setLocationStatus('denied');
          setShowPasswordInput(true);
        }
      },
      (error) => {
        console.log('Geolocation error:', error);
        setLocationStatus('denied');
        setShowPasswordInput(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handlePasswordAccess = () => {
    if (password === currentConfig.password) {
      setPasswordError('');
      setLocationStatus('success');
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);
    } else {
      setPasswordError(t.wrongPassword);
    }
  };

  return (
    <div className="z-10 relative text-center flex flex-col items-center">
      
      {/* Location Checking */}
      {locationStatus === 'checking' && (
        <>
          <div className="bg-[#7E96B2] tracking-widest text-white pr-[1.1svh] pl-[1.3svh] py-[.2svh] rounded-lg text-[5svw] mb-[8svh] w-fit">
            {t.verifyingLocation}
          </div>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-8"></div>
          <p className="text-black text-[4svw] tracking-widest font-medium mb-[4svh]">
            {t.checkingLocationFor} {currentConfig.name}
          </p>
          <p className="text-black text-[3.5svw] text-gray-600 mb-[4svh]">
            {currentConfig.description}
          </p>
        </>
      )}

      {/* Location Success */}
      {locationStatus === 'success' && (
        <>
          <div className="bg-green-600 tracking-widest text-white pr-[1.1svh] pl-[1.3svh] py-[.2svh] rounded-lg text-[5svw] mb-[8svh] w-fit">
            {t.locationVerified}
          </div>
          <div className="mb-[8svh]">
            <p className="text-black text-[4svw] tracking-widest font-medium mb-[2svh]">
              {t.welcomeTo} {currentConfig.name}
            </p>
            <p className="text-black text-[3.5svw] text-gray-600 mb-[2svh]">
              {t.youCanNowProceed}
            </p>
          </div>
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Location Denied/Error - Show Password Input */}
      {(locationStatus === 'denied' || locationStatus === 'error') && showPasswordInput && (
        <>
          <div className="bg-[#7E96B2] tracking-widest text-white pr-[1.1svh] pl-[1.3svh] py-[.2svh] rounded-lg text-[5svw] mb-[8svh] w-fit">
            {t.locationVerificationRequired}
          </div>
          <div className="mb-[6svh]">
            <p className="text-black text-[4svw] tracking-widest font-medium mb-[2svh]">
              {t.locationVerificationFailed}
            </p>
            <p className="text-black text-[3.5svw] text-gray-600 mb-[2svh]">
              {t.pleaseVisitLocation} {currentConfig.name} {t.orUsePassword}
            </p>
          </div>

          {/* Password Input */}
          <div className="mb-[4svh] w-full max-w-md">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.enterPassword}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[4svw] text-black placeholder-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordAccess()}
            />
            {passwordError && (
              <p className="text-red-500 text-[3svw] mt-2">{passwordError}</p>
            )}
          </div>

          {/* Action Buttons - Simplified */}
          <div className="flex flex-col gap-[2svw] w-full max-w-md">
            <button
              onClick={handlePasswordAccess}
              className="bg-[#7E96B2] text-white px-[6svw] py-[1.5svh] rounded-lg text-[4svw] font-semibold hover:bg-[#6B8AA3] transition-colors"
            >
              {t.enterPassword}
            </button>
            
            <button
              onClick={onGoBack}
              className="bg-gray-300 text-gray-700 px-[6svw] py-[1.5svh] rounded-lg text-[4svw] font-semibold hover:bg-gray-400 transition-colors"
            >
              {t.goBack}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
