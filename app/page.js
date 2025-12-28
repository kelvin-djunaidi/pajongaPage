"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { HiLocationMarker } from "react-icons/hi";
import { useLanguage } from "./contexts/LanguageContext";
import { languages } from "./dictionaries/languages";
import Navigation from "./components/Navigation";
import LocationVerification from "./components/LocationVerification";

export default function NewPage() {
  const [state, setState] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null); // 'pajonga' or 'tenri'
  const [showLocationVerification, setShowLocationVerification] = useState(false);
  const [logoTransition, setLogoTransition] = useState(false); // Track logo image transition
  const [startAnimation, setStartAnimation] = useState(false); // Track when to start old animation
  const [finalFadeOut, setFinalFadeOut] = useState(false); // Track final fade out
  const { currentLanguage } = useLanguage();
  const t = languages[currentLanguage];

  useEffect(() => {
    setState(1);

    // Start old animation after 0.5 second
    const animationTimer = setTimeout(() => {
      setStartAnimation(true);
    }, 500);

    // Final fade out at 9 seconds
    const finalFadeTimer = setTimeout(() => {
      setFinalFadeOut(true);
    }, 9000);

    const timer = setTimeout(() => {
      setState(2);
    }, 10000); // Extended to 10000ms (10 seconds)

    // Cleanup timers
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(finalFadeTimer);
      clearTimeout(timer);
    };
  }, []);

  // Handle chatbot location verification
  const handleChatbotLocationVerification = (location) => {
    setSelectedLocation(location);
    setShowLocationVerification(true);
  };

  // Handle verification success for chatbots
  const handleChatbotVerificationSuccess = () => {
    if (selectedLocation === 'pajonga') {
      window.location.href = '/pajonga';
    } else if (selectedLocation === 'tenri') {
      window.location.href = '/tenri';
    } else if (selectedLocation === 'pajongaEn') {
      window.location.href = '/pajongaEn';
    } else if (selectedLocation === 'tenriEn') {
      window.location.href = '/tenriEn';
    }
  };

  // Handle verification failure for chatbots
  const handleChatbotVerificationFailed = () => {
    setShowLocationVerification(false);
    setSelectedLocation(null);
  };

  // Handle go back from chatbot verification
  const handleChatbotGoBack = () => {
    setShowLocationVerification(false);
    setSelectedLocation(null);
  };

  return (
    <div
      className={`font-[var(--font-saira)] ${
        state <= 2 ? "bg-[#DBE8F5]" : "bg-white"
      } transition-colors flex items-center justify-center h-[100svh] w-screen overflow-hidden relative`}
    >
      {/* Split Logo - Upper Right Half */}
      <div className={`absolute top-0 right-0 overflow-hidden ${
        state === 1 ? "opacity-100" : "opacity-0"
      } transition-opacity duration-1000 ease-in-out`}>
        <img
          src="/images/logo.png"
          alt="Logo Upper Right"
          className="w-[40svw] h-auto lg:w-auto lg:h-[20svh] transition-all duration-1000 ease-in-out"
          style={{
            animation: startAnimation && state === 1 ? 'logoFlip 10s ease-in-out infinite' : 'none'
          }}
        />
      </div>

      {/* Center Logo */}
      <div className={`absolute inset-0 flex items-center justify-center z-0 ${
        state === 1 && !finalFadeOut ? "opacity-100" : "opacity-0"
      } transition-opacity duration-1000 ease-in-out`}>
        {/* Original Logo */}
        <img
          src="/images/logo.png"
          alt="Logo"
          className={`w-[80svw] h-auto lg:w-auto lg:h-[40svh] transition-opacity duration-1000 ease-in-out absolute ${
            state === 1 && !finalFadeOut ? "opacity-100" : "opacity-0"
          }`}
          style={{
            animation: startAnimation && state === 1 && !finalFadeOut ? 'logoBreathing 3s ease-in-out infinite' : 'none'
          }}
        />
      </div>

      {/* Split Logo - Lower Left Half */}
      <div className={`absolute bottom-0 left-0 overflow-hidden ${
        state === 1 ? "opacity-100" : "opacity-0"
      } transition-opacity duration-1000 ease-in-out`}>
        <img
          src="/images/logo.png"
          alt="Logo Lower Left"
          className="w-[40svw] h-auto lg:w-auto lg:h-[20svh] transition-all duration-1000 ease-in-out"
          style={{
            animation: startAnimation && state === 1 ? 'logoFlip 10s ease-in-out infinite' : 'none'
          }}
        />
      </div>

      <Navigation isMainPage={true} state={state} />

      <div
        className={`absolute left-0 flex justify-center items-center bottom-[3svh] text-[3svw] text-black w-full font-normal  ${
          state >= 2 ? "opacity-100" : "opacity-0"
        } transition-opacity duration-1000 ease-in-out`}
      >
        {t.copyright}
      </div>

      <div
        className={`${state === 2 ? "opacity-100" : "opacity-0"} ${
          state <= 2 ? "flex" : "hidden"
        } transition-opacity duration-1000 ease-in-out w-screen h-full flex justify-center items-center`}
      >
        <img
          src="/images/bg.png"
          alt="bg"
          className="absolute inset-0 w-full h-full object-contain object-center"
        />
        <button
          className="bg-black text-white text-[5svw] lg:[5svh] w-[70%] lg:w-auto px-[6svw] py-[.6svh] rounded-lg uppercase cursor-pointer z-9 relative"
          onClick={() => setState(3)}
        >
          {t.start}
        </button>
      </div>

      <div
        className={`${
          state === 3 ? "opacity-100 flex" : "opacity-0 hidden"
        } transition-opacity duration-1000 ease-in-out w-screen h-full flex justify-center items-center`}
      >
        <div className="z-10 relative text-center flex flex-col items-center">
          <div className="bg-[#7E96B2] tracking-widest text-white pr-[1.1svh] pl-[1.3svh] py-[.2svh] rounded-lg text-[5svw] mb-[8svh] w-fit">
            {t.instruction}
          </div>

          <div className="mb-[20svh]">
            <p className="text-black text-[4svw] tracking-widest font-medium mb-[1svh]">
              {t.startStoryText}
            </p>
          </div>

          <div className="mb-[4svh]">
            <p className="text-black text-[4svw] font-bold mb-[1svh]">
              {t.chooseLocation}
            </p>
          </div>

          <button
            onClick={() => setState(4)}
            className="text-[#979797] text-[5svw] underline cursor-pointer font-bold"
          >
            {t.fortRotterdam}
          </button>
        </div>
      </div>

      {/* State 4: Map with Location Choices */}
      <div
        className={`${
          state === 4 ? "opacity-100 flex" : "opacity-0 hidden"
        } transition-opacity duration-1000 ease-in-out w-screen pt-[20svh] pb-[10svh] flex justify-center items-center`}
      >
        <div className="z-10 relative text-center flex flex-col items-center">
          <div>
            <p className="text-black lg:text-[3.5svh] text-[5svw] font-medium mb-[1svh]">
              {t.chooseStartingPoint}
            </p>
          </div>

          <div className="w-screen">
            <div className="w-[80svw] h-[60svh]">
              <img
                src="./images/map.png"
                alt="map"
                className="absolute inset-0 w-full h-full object-contain object-center opacity-25"
              />
              
              {/* Tenri Location with Language Options */}
              <div className="absolute bottom-10 translate-x-[45svw] bottom-[20svh] left-[-18svh] flex items-center gap-x-[.5svw]">
                <img
                  src={"/images/tenri.png"}
                  className="absolute top-[-8svh] left-[4svh] h-[8svh] w-auto"
                />
                <HiLocationMarker className="text-[5svw] text-blue-600" />
                <div className="flex flex-col items-center text-center text-black underline leading-[3svw]">
                  <div className="text-[2.5svw] font-bold">{t.location2}</div>
                  <div className="text-[3.5svw] font-bold mb-2">
                    {t.bastionButon}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleChatbotLocationVerification('tenri')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-[2svw] hover:bg-blue-700 transition-colors"
                    >
                      ID
                    </button>
                    <button 
                      onClick={() => handleChatbotLocationVerification('tenriEn')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-[2svw] hover:bg-green-700 transition-colors"
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Pajonga Location with Language Options */}
              <div className="absolute bottom-10 translate-x-[45svw] bottom-[19svh] left-[6svh] flex items-center gap-x-[.5svw]">
                <img
                  src={"/images/patung-hasanudin.png"}
                  className="absolute top-[-8svh] left-[4svh] h-[8svh] w-auto opacity-90"
                />
                <HiLocationMarker className="text-[5svw] text-red-600" />
                <div className="flex flex-col items-center text-center text-black underline leading-[3svw]">
                  <div className="text-[2.5svw] font-bold">{t.location1}</div>
                  <div className="text-[3.5svw] font-bold mb-2">
                    {t.patungHasanudin}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleChatbotLocationVerification('pajonga')}
                      className="bg-red-600 text-white px-3 py-1 rounded text-[2svw] hover:bg-red-700 transition-colors"
                    >
                      ID
                    </button>
                    <button 
                      onClick={() => handleChatbotLocationVerification('pajongaEn')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-[2svw] hover:bg-green-700 transition-colors"
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Location Verification Modal */}
      {showLocationVerification && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90vw] max-w-2xl h-[80vh] overflow-y-auto">
            <LocationVerification
              location={selectedLocation}
              onVerificationSuccess={handleChatbotVerificationSuccess}
              onVerificationFailed={handleChatbotVerificationFailed}
              onGoBack={handleChatbotGoBack}
            />
          </div>
        </div>
      )}
    </div>
  );
}
